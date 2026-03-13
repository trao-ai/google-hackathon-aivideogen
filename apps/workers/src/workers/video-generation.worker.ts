// Video generation worker — uses Veo (SDK)/Kling/SeDance based on project.videoProvider
import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackVideoCost, trackLLMCost, trackCost } from "@atlas/db";
import { calculateVideoCost, calculateLLMCost } from "@atlas/shared";
import {
  createVideoProvider,
  createStorageProvider,
  resolveStorageDir,
} from "@atlas/integrations";
import { buildVideoPrompt } from "@atlas/prompts";
import { KenBurnsProvider } from "@atlas/motion-fallback";

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
should animate from start to end over the clip duration.

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
    const model = process.env.GEMINI_TEXT_MODEL ?? "gemini-1.5-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
      "kling"
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

    // Calculate the narration duration for this specific scene
    const narrationDurationSec = scene.narrationEndSec - scene.narrationStartSec;
    // Kling O3 supports 3-15s — round to nearest second and clamp to valid range
    // This eliminates the need for speed adjustment in render worker
    const clipDurationSec = Math.max(3, Math.min(15, Math.round(narrationDurationSec)));
    console.log(
      `[video-gen] Scene narration: ${narrationDurationSec.toFixed(1)}s → requesting ${clipDurationSec}s clip (exact match)`,
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
    const textModel = process.env.GEMINI_TEXT_MODEL ?? "gemini-1.5-flash";
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
    });

    console.log(`[video-gen] Video prompt for scene ${sceneId}:\n${videoPrompt}`);

    let result;
    let usedFallback = false;
    let fallbackReason = "";

    try {
      // Attempt primary video generation (Kling/Veo)
      console.log(`[video-gen] Submitting to ${videoProviderName} provider (${clipDurationSec}s clip)...`);
      const genStartTime = Date.now();
      result = await videoProvider.generate({
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
    } catch (error) {
      // Fallback to Ken Burns when AI video generation fails
      console.warn(`[video-gen] Primary video generation failed:`, (error as Error).message);
      console.log(`[video-gen] Falling back to Ken Burns effect...`);

      fallbackReason = (error as Error).message;
      usedFallback = true;

      const kenBurns = new KenBurnsProvider();
      result = await kenBurns.generate({
        prompt: videoPrompt,
        startFrameBase64: startBase64,
        endFrameBase64: endBase64,
        durationSec: clipDurationSec,
        motionNotes: scene.motionNotes || undefined,
      });

      // Track fallback usage
      await trackCost({
        projectId,
        stage: "video_fallback",
        vendor: "ken-burns-ffmpeg",
        units: clipDurationSec,
        unitCost: 0,
        totalCostUsd: 0,
        metadata: {
          fallbackReason,
          sceneId,
          requestedDuration: clipDurationSec,
          actualDuration: result.durationSec,
        },
      });

      console.log(`[video-gen] Ken Burns fallback succeeded (${result.durationSec}s)`);
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

    // Calculate duration delta for metadata
    const durationDelta = Math.abs(result.durationSec - clipDurationSec);
    const durationVariance = (durationDelta / clipDurationSec) * 100;

    // Upsert SceneClip with metadata
    await prisma.sceneClip.upsert({
      where: { sceneId },
      create: {
        sceneId,
        videoUrl,
        durationSec: result.durationSec,
        costUsd: result.costUsd,
        metadata: {
          usedFallback,
          fallbackReason: usedFallback ? fallbackReason : undefined,
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
          usedFallback,
          fallbackReason: usedFallback ? fallbackReason : undefined,
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
