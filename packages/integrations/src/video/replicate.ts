/**
 * Replicate video generation provider.
 *
 * Uses the `replicate` npm SDK to call video models hosted on Replicate.
 * Supports multiple models via modelId override:
 *   - google/veo-3.1
 *   - kwaivgi/kling-v2.1
 *   - bytedance/seedance-1.5-pro
 *   - bytedance/seedance-1-lite
 *
 * Required env vars:
 *   REPLICATE_API_TOKEN  – Replicate API token
 *
 * Optional env vars:
 *   REPLICATE_MODEL_ID   – Default model (default: "google/veo-3.1")
 */

import Replicate from "replicate";
import { calculateVideoCost } from "@atlas/shared";
import type { VideoProvider, VideoGenerationResult } from "./veo";

// ─── Model-specific configuration ───────────────────────────────────────────

interface ReplicateModelConfig {
  /** How the model accepts the start image input */
  imageInputKey: string;
  /** How the model accepts the end image input (null = not supported) */
  endImageInputKey: string | null;
  /** How the model accepts the duration parameter */
  durationKey: string;
  /** Duration constraints */
  minDuration: number;
  maxDuration: number;
  /** If set, duration must be one of these exact values */
  allowedDurations?: number[];
  /** Default duration if not specified */
  defaultDuration: number;
  /** Whether to include negative_prompt */
  supportsNegativePrompt: boolean;
  /** Whether to include aspect_ratio */
  supportsAspectRatio: boolean;
  /** Extra static fields to include in every request */
  extraInput?: Record<string, unknown>;
}

const MODEL_CONFIGS: Record<string, ReplicateModelConfig> = {
  "google/veo-3.1": {
    imageInputKey: "image",
    endImageInputKey: "last_frame",
    durationKey: "duration",
    minDuration: 4,
    maxDuration: 8,
    allowedDurations: [4, 6, 8],
    defaultDuration: 8,
    supportsNegativePrompt: true,
    supportsAspectRatio: true,
    extraInput: { resolution: "1080p", generate_audio: false },
  },
  "kwaivgi/kling-v2.1": {
    imageInputKey: "start_image",
    endImageInputKey: "end_image",
    durationKey: "duration",
    minDuration: 5,
    maxDuration: 10,
    allowedDurations: [5, 10],
    defaultDuration: 5,
    supportsNegativePrompt: true,
    supportsAspectRatio: true,
    extraInput: { mode: "pro", cfg_scale: 0.9 },
  },
  "bytedance/seedance-1.5-pro": {
    imageInputKey: "image",
    endImageInputKey: "last_frame_image",
    durationKey: "duration",
    minDuration: 5,
    maxDuration: 10,
    defaultDuration: 5,
    supportsNegativePrompt: false,
    supportsAspectRatio: true,
    extraInput: { fps: 24, camera_fixed: false, generate_audio: false },
  },
  "bytedance/seedance-1-lite": {
    imageInputKey: "image",
    endImageInputKey: null,
    durationKey: "duration",
    minDuration: 5,
    maxDuration: 10,
    defaultDuration: 5,
    supportsNegativePrompt: true,
    supportsAspectRatio: true,
  },
};

// Fallback config for unknown models
const DEFAULT_CONFIG: ReplicateModelConfig = {
  imageInputKey: "image",
  endImageInputKey: null,
  durationKey: "duration",
  minDuration: 5,
  maxDuration: 10,
  defaultDuration: 5,
  supportsNegativePrompt: true,
  supportsAspectRatio: true,
};

// ─── Replicate Video Provider ───────────────────────────────────────────────

export class ReplicateVideoProvider implements VideoProvider {
  private client: Replicate;
  private modelId: string;
  private config: ReplicateModelConfig;

  constructor(modelIdOverride?: string) {
    const token = process.env.REPLICATE_API_TOKEN ?? "";
    if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

    this.client = new Replicate({ auth: token });
    this.modelId =
      modelIdOverride ??
      process.env.REPLICATE_MODEL_ID ??
      "google/veo-3.1";
    this.config = MODEL_CONFIGS[this.modelId] ?? DEFAULT_CONFIG;
  }

  /** The model identifier used for pricing lookups. */
  get modelName(): string {
    return this.modelId;
  }

  async generate(opts: {
    prompt: string;
    startFrameBase64: string;
    endFrameBase64?: string;
    aspectRatio?: string;
    durationSec?: number;
  }): Promise<VideoGenerationResult> {
    const { prompt, startFrameBase64, endFrameBase64 } = opts;

    // Clamp duration to model's valid range
    const requestedDur = opts.durationSec ?? this.config.defaultDuration;
    let duration: number;
    if (this.config.allowedDurations?.length) {
      // Snap to the nearest allowed value
      duration = this.config.allowedDurations.reduce((best, v) =>
        Math.abs(v - requestedDur) < Math.abs(best - requestedDur) ? v : best,
      );
    } else {
      duration = Math.max(
        this.config.minDuration,
        Math.min(this.config.maxDuration, Math.round(requestedDur)),
      );
    }

    // Truncate prompt — Veo and some models have prompt length limits.
    // The images are already provided separately, so the prompt just needs
    // the motion direction and key constraints, not full frame descriptions.
    const maxPromptLen = 1500;
    const truncatedPrompt = prompt.length > maxPromptLen
      ? prompt.slice(0, maxPromptLen).replace(/\s+\S*$/, "") + "..."
      : prompt;

    // Build input payload
    const input: Record<string, unknown> = {
      prompt: truncatedPrompt,
      [this.config.durationKey]: duration,
      ...this.config.extraInput,
    };

    // Replicate SDK accepts data URIs — convert base64 to data URI
    input[this.config.imageInputKey] =
      `data:image/png;base64,${startFrameBase64}`;

    // Add end frame if the model supports it and one is provided
    if (endFrameBase64 && this.config.endImageInputKey) {
      input[this.config.endImageInputKey] =
        `data:image/png;base64,${endFrameBase64}`;
    }

    if (this.config.supportsNegativePrompt) {
      input.negative_prompt =
        "text, words, letters, numbers, watermark, caption, subtitle, label, title, writing, typography, " +
        "blurry, low quality, low detail, " +
        "talking, speaking, lip sync, mouth movement, open mouth, moving lips, " +
        "photorealistic, photograph, 3D render, anime, clipart, Duolingo, childish";
    }

    if (this.config.supportsAspectRatio && opts.aspectRatio) {
      input.aspect_ratio = opts.aspectRatio;
    }

    console.log(
      `[replicate] Submitting image-to-video (model=${this.modelId}, duration=${duration}s)...`,
    );

    let output: unknown;
    try {
      console.log(`[replicate] Request payload:`, {
        model: this.modelId,
        duration,
        mode: input.mode ?? "standard",
        hasStartImage: true,
        hasEndImage: !!endFrameBase64 && !!this.config.endImageInputKey,
        aspect_ratio: input.aspect_ratio ?? "(not set)",
        promptLength: prompt.length,
        prompt: prompt.slice(0, 500),
        negative_prompt: input.negative_prompt ?? "(none)",
      });

      output = await this.client.run(
        this.modelId as `${string}/${string}`,
        { input },
      );
    } catch (error: unknown) {
      const err = error as Error & {
        status?: number;
        code?: string;
      };
      console.error(`[replicate] API call failed:`, {
        message: err.message,
        name: err.name,
        status: err.status,
        stack: err.stack?.split("\n").slice(0, 3).join("\n"),
      });

      throw new Error(
        `Replicate API call failed: ${err.message} (${err.code || err.name || "unknown"})`,
      );
    }

    // Replicate returns FileOutput (ReadableStream with .url())
    // or sometimes a URL string directly. Handle both.
    let videoUrl: string;
    if (typeof output === "string") {
      videoUrl = output;
    } else if (
      output &&
      typeof output === "object" &&
      "url" in output &&
      typeof (output as { url: () => string }).url === "function"
    ) {
      videoUrl = (output as { url: () => string }).url();
    } else if (Array.isArray(output) && output.length > 0) {
      // Some models return an array of outputs
      const firstOutput = output[0];
      if (typeof firstOutput === "string") {
        videoUrl = firstOutput;
      } else if (
        firstOutput &&
        typeof firstOutput === "object" &&
        "url" in firstOutput &&
        typeof (firstOutput as { url: () => string }).url === "function"
      ) {
        videoUrl = (firstOutput as { url: () => string }).url();
      } else {
        videoUrl = String(firstOutput);
      }
    } else {
      throw new Error(
        `Unexpected Replicate output format: ${JSON.stringify(output).slice(0, 200)}`,
      );
    }

    console.log(
      `[replicate] Video ready (${duration}s), downloading from: ${videoUrl}`,
    );

    // Download the video buffer with retry logic (matching Kling pattern)
    let videoBuffer: Buffer | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[replicate] Download attempt ${attempt}/${maxRetries}...`,
        );
        const videoRes = await fetch(videoUrl, {
          signal: AbortSignal.timeout(120000), // 2 minute timeout
        });

        if (!videoRes.ok) {
          throw new Error(
            `HTTP ${videoRes.status}: ${videoRes.statusText}`,
          );
        }

        const arrayBuffer = await videoRes.arrayBuffer();
        videoBuffer = Buffer.from(arrayBuffer);
        console.log(`[replicate] Downloaded ${videoBuffer.length} bytes`);
        break;
      } catch (error: unknown) {
        const err = error as Error;
        console.error(
          `[replicate] Download attempt ${attempt} failed:`,
          err.message,
        );
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to download video after ${maxRetries} attempts: ${err.message}`,
          );
        }
        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 2000 * attempt),
        );
      }
    }

    if (!videoBuffer) {
      throw new Error("Failed to download video buffer");
    }

    // Probe actual duration from the downloaded video via ffprobe
    let actualDuration = duration;
    try {
      const { execFileSync } = await import("child_process");
      const fs = await import("fs");
      const os = await import("os");
      const path = await import("path");
      const tmpPath = path.join(
        os.tmpdir(),
        `replicate-probe-${Date.now()}.mp4`,
      );
      fs.writeFileSync(tmpPath, videoBuffer);
      const stdout = execFileSync("ffprobe", [
        "-v",
        "quiet",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        tmpPath,
      ])
        .toString()
        .trim();
      fs.unlinkSync(tmpPath);
      const probed = parseFloat(stdout);
      if (probed > 0) {
        actualDuration = probed;
        if (Math.abs(probed - duration) > 1) {
          console.warn(
            `[replicate] Duration mismatch: requested ${duration}s, actual video is ${probed.toFixed(1)}s`,
          );
        }
      }
    } catch (e) {
      console.warn(
        `[replicate] ffprobe failed, using requested duration: ${(e as Error).message}`,
      );
    }

    console.log(
      `[replicate] Final clip: ${actualDuration.toFixed(1)}s, ${videoBuffer.length} bytes`,
    );

    return {
      videoBuffer,
      mimeType: "video/mp4",
      durationSec: actualDuration,
      costUsd: calculateVideoCost(this.modelId, actualDuration),
    };
  }
}
