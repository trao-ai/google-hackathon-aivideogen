import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackTTSCost } from "@atlas/db";
import { createTTSProvider, createStorageProvider } from "@atlas/integrations";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

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
    job: Job<{ projectId: string; scriptId: string }>,
  ): Promise<void> {
    const { projectId, scriptId } = job.data;
    console.log(`[tts] Generating voiceover for script ${scriptId}`);

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

    const ttsResult = await tts.generate(fullText, VOICE_ID);

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
        voiceId: VOICE_ID,
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
