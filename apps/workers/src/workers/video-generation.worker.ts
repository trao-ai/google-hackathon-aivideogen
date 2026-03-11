import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackVideoCost, trackLLMCost } from "@atlas/db";
import { calculateVideoCost, calculateLLMCost } from "@atlas/shared";
import {
  createVideoProvider,
  createStorageProvider,
  resolveStorageDir,
} from "@atlas/integrations";
import { buildVideoPrompt } from "@atlas/prompts";

interface MotionEnrichmentResult {
  enrichedMotion: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Use Gemini text model to enrich a brief motionNotes into a detailed
 * animation description suitable for Veo video generation.
 */
async function enrichMotionDescription(params: {
  purpose: string;
  sceneType: string;
  motionNotes: string;
  startFramePrompt: string;
  endFramePrompt: string;
}): Promise<MotionEnrichmentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { enrichedMotion: params.motionNotes, inputTokens: 0, outputTokens: 0 };

  const prompt = `You are a motion director for an animated educational video.

Given a scene's start frame description, end frame description, and brief motion notes,
write a DETAILED animation direction (3-5 sentences) describing exactly how the scene
should animate from start to end over 8 seconds.

Be specific about:
- What elements move, scale, fade, or transform
- Camera movements (zoom, pan, tilt)
- Timing (what happens first, middle, end of the 8 seconds)
- How the visual state changes from start frame to end frame

Scene purpose: ${params.purpose}
Scene type: ${params.sceneType}

START FRAME: ${params.startFramePrompt.slice(0, 500)}

END FRAME: ${params.endFramePrompt.slice(0, 500)}

Brief motion notes: ${params.motionNotes}

Write ONLY the animation direction. No preamble, no markdown.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      },
    );

    if (!res.ok) {
      console.warn(`[video-gen] Motion enrichment failed (${res.status}), using raw notes`);
      return { enrichedMotion: params.motionNotes, inputTokens: 0, outputTokens: 0 };
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
    if (text) {
      console.log(`[video-gen] Enriched motion description: ${text.slice(0, 200)}...`);
      return { enrichedMotion: text.trim(), inputTokens, outputTokens };
    }
  } catch (err) {
    console.warn(`[video-gen] Motion enrichment error:`, err);
  }

  return { enrichedMotion: params.motionNotes, inputTokens: 0, outputTokens: 0 };
}

export class VideoGenerationWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("video-generation", this.process.bind(this), {
      connection,
      concurrency: 2,
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[video-gen] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(
    job: Job<{ projectId: string; sceneId: string }>,
  ): Promise<void> {
    const { projectId, sceneId } = job.data;
    console.log(`[video-gen] Generating video for scene ${sceneId}`);

    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
      include: { frames: true },
    });
    if (!scene) throw new Error(`Scene ${sceneId} not found`);

    const startFrame = scene.frames.find((f) => f.frameType === "start");
    const endFrame = scene.frames.find((f) => f.frameType === "end");

    if (!startFrame || !endFrame) {
      throw new Error(
        `Scene ${sceneId} is missing start or end frame. Generate frames first.`,
      );
    }

    // Download frame images as base64
    const [startBase64, endBase64] = await Promise.all([
      this.fetchFrameAsBase64(startFrame.imageUrl),
      this.fetchFrameAsBase64(endFrame.imageUrl),
    ]);

    const videoProvider = createVideoProvider();
    const storage = createStorageProvider();

    // Use Gemini to enrich the brief motionNotes into detailed animation direction
    const motionResult = await enrichMotionDescription({
      purpose: scene.purpose,
      sceneType: scene.sceneType,
      motionNotes: scene.motionNotes,
      startFramePrompt: startFrame.prompt,
      endFramePrompt: endFrame.prompt,
    });

    // Track motion enrichment LLM cost
    if (motionResult.inputTokens > 0 || motionResult.outputTokens > 0) {
      const motionCost = calculateLLMCost(
        "gemini-2.0-flash",
        motionResult.inputTokens,
        motionResult.outputTokens,
      );
      await trackLLMCost({
        projectId,
        stage: "motion_enrichment",
        vendor: "gemini",
        model: "gemini-2.0-flash",
        inputTokens: motionResult.inputTokens,
        outputTokens: motionResult.outputTokens,
        totalCostUsd: motionCost,
      });
      console.log(`[video-gen] Motion enrichment cost: $${motionCost.toFixed(6)} (${motionResult.inputTokens}in/${motionResult.outputTokens}out tokens)`);
    }

    // Build a rich video prompt with scene context + enriched motion description
    const videoPrompt = buildVideoPrompt({
      purpose: scene.purpose,
      sceneType: scene.sceneType,
      motionNotes: motionResult.enrichedMotion,
      startFramePrompt: startFrame.prompt,
      endFramePrompt: endFrame.prompt,
    });

    console.log(`[video-gen] Video prompt for scene ${sceneId}:\n${videoPrompt}`);

    const result = await videoProvider.generate({
      prompt: videoPrompt,
      startFrameBase64: startBase64,
      endFrameBase64: endBase64,
    });

    // Upload video to storage
    const key = `projects/${projectId}/scenes/${sceneId}/clip-${Date.now()}.mp4`;
    const videoUrl = await storage.upload(
      key,
      result.videoBuffer,
      result.mimeType,
    );

    // Upsert SceneClip
    await prisma.sceneClip.upsert({
      where: { sceneId },
      create: {
        sceneId,
        videoUrl,
        durationSec: result.durationSec,
        costUsd: result.costUsd,
      },
      update: {
        videoUrl,
        durationSec: result.durationSec,
        costUsd: result.costUsd,
      },
    });

    // Track video generation cost
    const videoCost = calculateVideoCost("veo-3.1-generate-preview", result.durationSec);
    await trackVideoCost({
      projectId,
      vendor: "google-veo",
      model: "veo-3.1-generate-preview",
      durationSec: result.durationSec,
      totalCostUsd: videoCost,
    });
    console.log(`[video-gen] Video cost: $${videoCost.toFixed(4)} (${result.durationSec}s)`);

    // Check if all scenes now have clips
    const [totalScenes, scenesWithClips] = await Promise.all([
      prisma.scene.count({ where: { projectId } }),
      prisma.sceneClip.count({
        where: { scene: { projectId } },
      }),
    ]);

    if (scenesWithClips >= totalScenes) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "clips_done" },
      });
      console.log(
        `[video-gen] All ${totalScenes} scenes have video clips for project ${projectId}`,
      );
    }

    console.log(`[video-gen] Video generated for scene ${sceneId}`);
  }

  private async fetchFrameAsBase64(imageUrl: string): Promise<string> {
    const fs = await import("fs");
    const path = await import("path");
    const storageDir = resolveStorageDir();

    // Handle local:/// URLs — resolve to the shared storage dir
    if (imageUrl.startsWith("local:///")) {
      const rawPath = imageUrl.replace("local:///", "");
      const fileName = rawPath.split("/").pop() ?? rawPath;
      const filePath = path.join(storageDir, fileName);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath).toString("base64");
      }
      throw new Error(`Frame file not found: ${imageUrl} (tried ${filePath})`);
    }

    // Handle API-served URLs by reading directly from disk
    if (imageUrl.includes("/api/storage/")) {
      const fileName = imageUrl.split("/api/storage/").pop() ?? "";
      const filePath = path.join(storageDir, fileName);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath).toString("base64");
      }
    }

    // Remote URLs
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Failed to download frame: ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
