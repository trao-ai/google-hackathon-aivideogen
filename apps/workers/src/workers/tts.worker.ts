import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackTTSCost } from "@atlas/db";
import { createTTSProvider, createStorageProvider, ELEVENLABS_TTS_MODEL } from "@atlas/integrations";
import type { VoiceSettings } from "@atlas/integrations";

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

// Tone → voice_settings mapping (matches API route)
const TONE_SETTINGS: Record<string, VoiceSettings> = {
  energetic:    { stability: 0.20, similarity_boost: 0.70, style: 0.85 },
  calm:         { stability: 0.55, similarity_boost: 0.80, style: 0.40 },
  motivational: { stability: 0.25, similarity_boost: 0.75, style: 0.80 },
  professional: { stability: 0.50, similarity_boost: 0.85, style: 0.50 },
};

interface TTSJobData {
  projectId: string;
  scriptId: string;
  voiceId?: string;
  tone?: string;
}

export class TTSWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("tts-generation", this.process.bind(this), {
      connection,
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[tts] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(
    job: Job<TTSJobData>,
  ): Promise<void> {
    const { projectId, scriptId, voiceId, tone } = job.data;
    const resolvedVoiceId = voiceId || DEFAULT_VOICE_ID;
    const voiceSettings = TONE_SETTINGS[tone?.toLowerCase() ?? ""] ?? undefined;

    console.log(`[tts] Generating voiceover for script ${scriptId}, voice: ${resolvedVoiceId}, tone: ${tone ?? "default"}`);

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });

    if (!script) throw new Error(`Script ${scriptId} not found`);

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "voicing" },
    });

    const tts = createTTSProvider();
    const storage = createStorageProvider();

    // Build full narration from narration sections
    const narrationSections = script.sections.filter((s) =>
      ["narration", "hook", "bridge", "cta", "intro", "outro"].includes(
        s.sectionType,
      ),
    );
    const fullText = narrationSections.map((s) => s.text).join("\n\n");

    const ttsResult = await tts.generate(fullText, resolvedVoiceId, voiceSettings);

    // Upload audio to storage
    const audioKey = `projects/${projectId}/voiceover.mp3`;
    const audioUrl = await storage.upload(
      audioKey,
      ttsResult.audioBuffer,
      "audio/mpeg",
    );

    // Track TTS cost
    await trackTTSCost({
      projectId,
      vendor: "elevenlabs",
      model: ttsResult.model,
      characterCount: ttsResult.characterCount,
      totalCostUsd: ttsResult.costUsd,
    });

    // Build segments: distribute timestamps proportionally across sections
    let cursor = 0;
    const totalWordCount = fullText.split(/\s+/).length;
    const segments = narrationSections.map((section) => {
      const sectionWordCount = section.text.split(/\s+/).length;
      const fraction = sectionWordCount / Math.max(totalWordCount, 1);
      const durationSec = ttsResult.durationSec * fraction;
      const start = cursor;
      cursor += durationSec;
      return {
        sectionId: section.id,
        text: section.text,
        startSec: parseFloat(start.toFixed(3)),
        endSec: parseFloat(cursor.toFixed(3)),
      };
    });

    const voiceover = await prisma.voiceover.create({
      data: {
        projectId,
        scriptId,
        vendor: "elevenlabs",
        voiceId: resolvedVoiceId,
        audioUrl,
        durationSec: ttsResult.durationSec,
        costUsd: ttsResult.costUsd,
        segments,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "voice_done" },
    });

    console.log(
      `[tts] Voiceover ${voiceover.id} created, duration: ${ttsResult.durationSec.toFixed(1)}s`,
    );
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
