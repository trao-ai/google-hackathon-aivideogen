/**
 * Kling video generation provider via fal.ai.
 *
 * Uses the @fal-ai/client SDK to call Kling models hosted on fal.ai.
 * Supports image-to-video with optional end frame (pro mode).
 *
 * Required env vars:
 *   FAL_KEY          – fal.ai API key
 *
 * Optional env vars:
 *   KLING_MODEL_ID   – fal.ai model endpoint (default: fal-ai/kling-video/v2.6/pro/image-to-video)
 *   KLING_DURATION   – "5" or "10" seconds (default: "5")
 */

import { fal } from "@fal-ai/client";
import { calculateVideoCost } from "@atlas/shared";
import type { VideoProvider, VideoGenerationResult } from "./veo";

// ─── fal.ai response types ──────────────────────────────────────────────────

interface FalVideoOutput {
  video: {
    url: string;
    file_size: number;
    file_name: string;
    content_type: string;
  };
}

// ─── Kling Video Provider (via fal.ai)──────────────────────────────────────

export class KlingVideoProvider implements VideoProvider {
  private modelId: string;
  private duration: "5" | "10";

  constructor() {
    const falKey = process.env.FAL_KEY ?? "";
    if (!falKey) throw new Error("FAL_KEY is not set");

    fal.config({ credentials: falKey });

    this.modelId =
      process.env.KLING_MODEL_ID ??
      "fal-ai/kling-video/v2.6/pro/image-to-video";
    this.duration = (process.env.KLING_DURATION as "5" | "10") ?? "5";
  }

  /** The model identifier used for pricing lookups. */
  get modelName(): string {
    return this.modelId;
  }

  async generate(opts: {
    prompt: string;
    startFrameBase64: string;
    endFrameBase64: string;
    aspectRatio?: string;
    durationSec?: number;
  }): Promise<VideoGenerationResult> {
    const { prompt, startFrameBase64, endFrameBase64 } = opts;

    // Pick duration: use per-call value if provided, else instance default
    // Kling only supports "5" or "10" — pick whichever is closest
    const requestedDur = opts.durationSec ?? parseInt(this.duration, 10);
    const klingDuration: "5" | "10" = requestedDur >= 8 ? "10" : "5";

    // fal.ai expects image URLs — upload base64 buffers to fal storage
    const [startImageUrl, endImageUrl] = await Promise.all([
      this.uploadBase64ToFal(startFrameBase64, "start-frame.png"),
      this.uploadBase64ToFal(endFrameBase64, "end-frame.png"),
    ]);

    console.log(
      `[kling/fal] Submitting image-to-video (model=${this.modelId}, duration=${klingDuration}s)...`,
    );

    const result = await fal.subscribe(this.modelId, {
      input: {
        prompt,
        start_image_url: startImageUrl,
        end_image_url: endImageUrl,
        duration: klingDuration,
        negative_prompt:
          "text, words, letters, numbers, watermark, caption, subtitle, label, blurry, low quality",
        generate_audio: false,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          const logs = (update as { logs?: Array<{ message: string }> }).logs;
          logs?.forEach((log) => console.log(`[kling/fal] ${log.message}`));
        } else {
          console.log(`[kling/fal] Queue status: ${update.status}`);
        }
      },
    });

    const data = result.data as FalVideoOutput;
    const videoUrl = data.video.url;
    const durationSec = parseInt(klingDuration, 10);

    console.log(
      `[kling/fal] Video ready (${durationSec}s), downloading from: ${videoUrl}`,
    );

    // Download the video buffer
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      throw new Error(
        `Failed to download Kling video from fal: ${videoRes.status}`,
      );
    }
    const arrayBuffer = await videoRes.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);

    return {
      videoBuffer,
      mimeType: data.video.content_type ?? "video/mp4",
      durationSec,
      costUsd: calculateVideoCost(this.modelId, durationSec),
    };
  }

  /**
   * Upload a base64-encoded image to fal.ai storage and return its URL.
   */
  private async uploadBase64ToFal(
    base64Data: string,
    fileName: string,
  ): Promise<string> {
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: "image/png" });
    const file = new File([blob], fileName, { type: "image/png" });
    const url = await fal.storage.upload(file);
    return url;
  }
}
