// Video generation worker — uses Veo (SDK)/Kling/SeDance based on project.videoProvider
import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackVideoCost, trackLLMCost } from "@atlas/db";
import { calculateVideoCost, calculateLLMCost } from "@atlas/shared";
import {
  createVideoProvider,
  createStorageProvider,
  resolveStorageDir,
  runAgent,
} from "@atlas/integrations";
import { buildVideoPrompt } from "@atlas/prompts";


interface MotionEnrichmentResult {
  enrichedMotion: string;
  inputTokens: number;
  outputTokens: number;
}

const MOTION_DIRECTOR_INSTRUCTION = `You are a motion director for a fast-paced, engaging animated educational video (like Kurzgesagt).

Given a scene's start frame description, end frame description, and brief motion notes,
write a DETAILED animation direction (3-5 sentences) describing exactly how the scene
should animate from start to end over the clip duration.

PACING: Animations should feel SNAPPY and ENERGETIC — not slow or floaty. Use quick zooms, brisk camera pans, punchy element pop-ins, and dynamic reveals. Think Kurzgesagt energy: constant visual movement that keeps viewers glued to the screen. Avoid slow drifts, gentle fades, or lingering static moments.

Be specific about:
- What elements move, scale, fade, or transform — use FAST, purposeful movements
- Camera movements (quick zoom, dynamic pan, energetic tilt)
- Timing (rapid cuts and transitions, elements appearing with punch)
- How the visual state changes from start frame to end frame

IMPORTANT CONSTRAINTS:
- Characters must NEVER open their mouths, talk, speak, or move their lips — mouths stay CLOSED
- Eye movement, blinking, and facial expressions are fine
- There is no dialogue — narration is a separate voiceover, so no character should appear to be speaking

Write ONLY the animation direction. No preamble, no markdown.`;

/**
 * Use ADK agent to enrich a brief motionNotes into a detailed
 * animation description suitable for Veo video generation.
 */
async function enrichMotionDescription(params: {
  purpose: string;
  sceneType: string;
  motionNotes: string;
  startFramePrompt: string;
  endFramePrompt: string;
}): Promise<MotionEnrichmentResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { enrichedMotion: params.motionNotes, inputTokens: 0, outputTokens: 0 };
  }

  try {
    const result = await runAgent({
      agentName: "motion-enricher",
      instruction: MOTION_DIRECTOR_INSTRUCTION,
      userMessage: `Scene purpose: ${params.purpose}
Scene type: ${params.sceneType}

START FRAME: ${params.startFramePrompt.slice(0, 500)}

END FRAME: ${params.endFramePrompt.slice(0, 500)}

Brief motion notes: ${params.motionNotes}`,
      generationConfig: { maxOutputTokens: 300 },
    });

    if (result.content) {
      console.log(`[video-gen] Enriched motion description: ${result.content.slice(0, 200)}...`);
      return {
        enrichedMotion: result.content.trim(),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
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
      if (job?.data?.sceneId) {
        prisma.scene.update({
          where: { id: job.data.sceneId },
          data: { clipStatus: "failed" },
        }).catch(() => {});
      }
    });
  }

  private async process(
    job: Job<{ projectId: string; sceneId: string; videoProvider?: string }>,
  ): Promise<void> {
    const { projectId, sceneId } = job.data;
    console.log(`[video-gen] Generating video for scene ${sceneId} (job videoProvider=${job.data.videoProvider})`);

    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
      include: { frames: true },
    });
    if (!scene) throw new Error(`Scene ${sceneId} not found`);

    // Fetch next scene for cross-scene continuity context
    const nextScene = await prisma.scene.findFirst({
      where: { projectId, orderIndex: scene.orderIndex + 1 },
    });

    // Mark this scene as generating video
    await prisma.scene.update({
      where: { id: sceneId },
      data: { clipStatus: "generating" },
    });

    // Determine provider: job data > project setting > env var
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const videoProviderName = (
      job.data.videoProvider ??
      (project as Record<string, unknown>)?.videoProvider as string ??
      process.env.VIDEO_PROVIDER ??
      "veo"
    ).toLowerCase();
    console.log(`[video-gen] Resolved provider: "${videoProviderName}" (job=${job.data.videoProvider}, project=${(project as Record<string, unknown>)?.videoProvider}, env=${process.env.VIDEO_PROVIDER})`);

    // Providers that only need a start frame (no end frame required)
    const noEndFrameProviders = new Set([
      "seedance",
      "replicate-veo",
      "replicate-seedance",
      "replicate-seedance-lite",
    ]);
    const needsEndFrame = !noEndFrameProviders.has(videoProviderName);

    const startFrame = scene.frames.find((f) => f.frameType === "start");
    const endFrame = scene.frames.find((f) => f.frameType === "end");

    if (!startFrame) {
      throw new Error(`Scene ${sceneId} is missing start frame. Generate frames first.`);
    }
    if (needsEndFrame && !endFrame) {
      throw new Error(`Scene ${sceneId} is missing end frame. Generate frames first.`);
    }

    // Download frame images as base64
    const startBase64 = await this.fetchFrameAsBase64(startFrame.imageUrl);
    const endBase64 = endFrame
      ? await this.fetchFrameAsBase64(endFrame.imageUrl)
      : undefined;

    const videoProvider = createVideoProvider(videoProviderName);
    const storage = createStorageProvider();

    // Use pre-planned clip target duration (accounts for transition overlap)
    // Falls back to narration duration if not set (backward compat with old scenes)
    const narrationDurationSec = scene.narrationEndSec - scene.narrationStartSec;
    const plannedDuration = (scene as Record<string, unknown>).clipTargetDurationSec as number | null;
    const clipDurationSec = plannedDuration
      ? Math.max(3, Math.min(15, Math.round(plannedDuration)))
      : Math.max(3, Math.min(15, Math.round(narrationDurationSec)));
    console.log(
      `[video-gen] Scene narration: ${narrationDurationSec.toFixed(1)}s, planned target: ${plannedDuration?.toFixed(1) ?? "N/A"}s → requesting ${clipDurationSec}s clip`,
    );

    // Use Gemini to enrich the brief motionNotes into detailed animation direction
    const motionResult = await enrichMotionDescription({
      purpose: scene.purpose,
      sceneType: scene.sceneType,
      motionNotes: scene.motionNotes,
      startFramePrompt: startFrame.prompt,
      endFramePrompt: endFrame?.prompt ?? scene.endPrompt,
    });

    // Track motion enrichment LLM cost
    const textModel = "gemini-2.5-flash";
    if (motionResult.inputTokens > 0 || motionResult.outputTokens > 0) {
      const motionCost = calculateLLMCost(
        textModel,
        motionResult.inputTokens,
        motionResult.outputTokens,
      );
      await trackLLMCost({
        projectId,
        stage: "motion_enrichment",
        vendor: "gemini",
        model: textModel,
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
      endFramePrompt: endFrame?.prompt ?? scene.endPrompt,
      durationSec: clipDurationSec,
      nextSceneStartPrompt: nextScene?.startPrompt,
    });

    console.log(`[video-gen] Video prompt for scene ${sceneId}:\n${videoPrompt}`);

    console.log(`[video-gen] Submitting to ${videoProviderName} provider (${clipDurationSec}s clip)...`);
    const genStartTime = Date.now();
    const result = await videoProvider.generate({
      prompt: videoPrompt,
      startFrameBase64: startBase64,
      endFrameBase64: endBase64,
      durationSec: clipDurationSec,
    });
    const genElapsed = ((Date.now() - genStartTime) / 1000).toFixed(1);
    console.log(`[video-gen] Provider returned ${result.durationSec}s clip in ${genElapsed}s (cost: $${result.costUsd.toFixed(4)})`);

    // Duration matching verification
    const durationDelta = Math.abs(result.durationSec - clipDurationSec);
    const durationVariance = (durationDelta / clipDurationSec) * 100;

    if (durationVariance > 10) {
      console.warn(
        `[video-gen] Duration mismatch: requested ${clipDurationSec}s, got ${result.durationSec}s (${durationVariance.toFixed(1)}% variance)`
      );
    }

    // Upload video to storage
    console.log(`[video-gen] Uploading ${(result.videoBuffer.length / 1024 / 1024).toFixed(1)}MB clip to storage...`);
    const key = `projects/${projectId}/scenes/${sceneId}/clip-${Date.now()}.mp4`;
    const videoUrl = await storage.upload(
      key,
      result.videoBuffer,
      result.mimeType,
    );
    console.log(`[video-gen] Upload complete: ${key}`);

    // Upsert SceneClip with metadata
    await prisma.sceneClip.upsert({
      where: { sceneId },
      create: {
        sceneId,
        videoUrl,
        durationSec: result.durationSec,
        costUsd: result.costUsd,
        metadata: {
          requestedDuration: clipDurationSec,
          durationDelta,
          durationVariance,
        },
      },
      update: {
        videoUrl,
        durationSec: result.durationSec,
        costUsd: result.costUsd,
        metadata: {
          requestedDuration: clipDurationSec,
          durationDelta,
          durationVariance,
        },
      },
    });

    // Mark this scene's clip as done
    await prisma.scene.update({
      where: { id: sceneId },
      data: { clipStatus: "done" },
    });

    // Track video generation cost — use actual provider info
    const vendorMap: Record<string, string> = {
      veo: "google-veo",
      kling: "kling-fal",
      seedance: "kling-fal",
      "replicate-veo": "replicate",
      "replicate-kling": "replicate",
      "replicate-seedance": "replicate",
      "replicate-seedance-lite": "replicate",
    };
    const modelMap: Record<string, string> = {
      veo: "veo-3.1-generate-preview",
      seedance: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
      kling: process.env.KLING_MODEL_ID ?? "fal-ai/kling-video/o3/standard/image-to-video",
      "replicate-veo": "google/veo-2",
      "replicate-kling": "kwaivgi/kling-v2.1",
      "replicate-seedance": "bytedance/seedance-1-pro",
      "replicate-seedance-lite": "bytedance/seedance-1-lite",
    };
    const videoVendor = vendorMap[videoProviderName] ?? "replicate";
    const videoModel = modelMap[videoProviderName] ?? "google/veo-2";
    const videoCost = calculateVideoCost(videoModel, result.durationSec);
    await trackVideoCost({
      projectId,
      vendor: videoVendor,
      model: videoModel,
      durationSec: result.durationSec,
      totalCostUsd: videoCost,
    });
    console.log(`[video-gen] Video cost: $${videoCost.toFixed(4)} (${result.durationSec}s, ${videoVendor})`);

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

    // S3 URLs — use storage provider download (more reliable than raw fetch)
    const s3Bucket = process.env.S3_BUCKET;
    const storagePrefix = process.env.STORAGE_PREFIX;
    if (s3Bucket && imageUrl.includes(s3Bucket)) {
      try {
        const storage = createStorageProvider();
        // Extract key from URL: https://bucket.endpoint/prefix/key → key
        const urlPath = new URL(imageUrl).pathname.slice(1); // remove leading /
        const key = storagePrefix && urlPath.startsWith(storagePrefix + "/")
          ? urlPath.slice(storagePrefix.length + 1)
          : urlPath;
        console.log(`[video-gen] Downloading frame via S3 SDK: ${key}`);
        const buffer = await storage.download(key);
        return buffer.toString("base64");
      } catch (err) {
        console.warn(`[video-gen] S3 SDK download failed, falling back to fetch: ${(err as Error).message}`);
      }
    }

    // Remote URLs with retry
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(imageUrl);
        if (!res.ok) {
          throw new Error(`Failed to download frame: ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer).toString("base64");
      } catch (err) {
        console.warn(`[video-gen] Frame fetch attempt ${attempt + 1}/3 failed: ${(err as Error).message}`);
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
    throw new Error(`Failed to download frame after 3 attempts: ${imageUrl}`);
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
