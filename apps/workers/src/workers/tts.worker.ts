import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackTTSCost } from "@atlas/db";
import { createTTSProvider, createStorageProvider, ELEVENLABS_TTS_MODEL } from "@atlas/integrations";
import type { VoiceSettings } from "@atlas/integrations";

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

// Tone → voice_settings + audio tags mapping (mirrors API route)
interface ToneConfig {
  settings: VoiceSettings;
  sectionTag: string;
  impactTag: string;
}

const TONE_CONFIGS: Record<string, ToneConfig> = {
  energetic: {
    settings: { stability: 0.15, similarity_boost: 0.65, style: 0.90 },
    sectionTag: "[excited, upbeat]",
    impactTag: "[very excited, enthusiastic]",
  },
  calm: {
    settings: { stability: 0.60, similarity_boost: 0.85, style: 0.30 },
    sectionTag: "[calm, gentle]",
    impactTag: "[softly, reassuring]",
  },
  motivational: {
    settings: { stability: 0.20, similarity_boost: 0.70, style: 0.85 },
    sectionTag: "[inspiring, confident]",
    impactTag: "[passionately, empowering]",
  },
  professional: {
    settings: { stability: 0.55, similarity_boost: 0.85, style: 0.45 },
    sectionTag: "[measured, authoritative]",
    impactTag: "[firmly, with conviction]",
  },
};

const IMPACT_SECTIONS = new Set(["hook", "cta", "intro", "outro"]);

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
    const toneConfig = TONE_CONFIGS[tone?.toLowerCase() ?? ""] ?? undefined;
    const voiceSettings = toneConfig?.settings;

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

    // Build text with ElevenLabs v3 audio tags for emotional delivery
    const fullText = narrationSections
      .map((s) => {
        const text = s.text.trim();
        if (!toneConfig) return text;
        const tag = IMPACT_SECTIONS.has(s.sectionType)
          ? toneConfig.impactTag
          : toneConfig.sectionTag;
        return tag ? `${tag} ${text}` : text;
      })
      .join("\n\n");

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
