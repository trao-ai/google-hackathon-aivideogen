/**
 * Kling video generation provider via fal.ai.
 *
 * Uses the @fal-ai/client SDK to call Kling models hosted on fal.ai.
 * Supports image-to-video with optional end frame.
 *
 * Required env vars:
 *   FAL_KEY          – fal.ai API key
 *
 * Optional env vars:
 *   KLING_MODEL_ID   – fal.ai model endpoint (default: fal-ai/kling-video/o3/standard/image-to-video)
 *   KLING_DURATION   – duration in seconds, 3-15 (default: "5")
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
  private duration: number;

  constructor(modelIdOverride?: string) {
    const falKey = process.env.FAL_KEY ?? "";
    if (!falKey) throw new Error("FAL_KEY is not set");

    fal.config({ credentials: falKey });

    this.modelId =
      modelIdOverride ??
      process.env.KLING_MODEL_ID ??
      "fal-ai/kling-video/o3/standard/image-to-video";
    this.duration = parseInt(process.env.KLING_DURATION ?? "5", 10);
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

    // Pick duration: use per-call value if provided, else instance default
    // SeeDance supports 4-12 seconds, Kling O3 supports 3-15 seconds
    const requestedDur = opts.durationSec ?? this.duration;
    const isSeeDance = this.modelId.includes("seedance");
    const minDur = isSeeDance ? 4 : 3;
    const maxDur = isSeeDance ? 12 : 15;
    const klingDuration = Math.max(minDur, Math.min(maxDur, Math.round(requestedDur)));

    // fal.ai expects image URLs — upload base64 buffers to fal storage
    const uploadPromises: Promise<string>[] = [
      this.uploadBase64ToFal(startFrameBase64, "start-frame.png"),
    ];
    if (endFrameBase64) {
      uploadPromises.push(this.uploadBase64ToFal(endFrameBase64, "end-frame.png"));
    }
    const [startImageUrl, endImageUrl] = await Promise.all(uploadPromises);

    console.log(
      `[kling/fal] Submitting image-to-video (model=${this.modelId}, duration=${klingDuration}s)...`,
    );

    let result;
    try {
      console.log(`[kling/fal] Request payload:`, {
        model: this.modelId,
        duration: klingDuration,
        hasStartImage: !!startImageUrl,
        hasEndImage: !!endImageUrl,
        promptLength: prompt.length,
      });

      // SeeDance models only support start frame, not end frame
      const isSeeDance = this.modelId.includes("seedance");
      const input: any = {
        prompt,
        image_url: startImageUrl,
        duration: klingDuration,
        negative_prompt:
          "text, words, letters, numbers, watermark, caption, subtitle, label, blurry, low quality",
        generate_audio: false,
      };

      // Only add end_image_url for models that support it (not SeeDance)
      if (!isSeeDance) {
        input.end_image_url = endImageUrl;
      }

      result = await fal.subscribe(this.modelId, {
        input,
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
    } catch (error: any) {
      console.error(`[kling/fal] API call failed:`, {
        message: error.message,
        name: error.name,
        code: error.code,
        cause: error.cause,
        status: error.status,
        statusCode: error.statusCode,
        body: error.body,
        bodyDetail: JSON.stringify(error.body?.detail, null, 2),
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      });

      // Re-throw with more context
      throw new Error(
        `Kling API call failed: ${error.message} (${error.code || error.name || 'unknown'})`
      );
    }

    const data = result.data as FalVideoOutput;
    const videoUrl = data.video.url;
    const durationSec = klingDuration;

    console.log(
      `[kling/fal] Video ready (${durationSec}s), downloading from: ${videoUrl}`,
    );

    // Download the video buffer with retry logic
    let videoBuffer: Buffer | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[kling/fal] Download attempt ${attempt}/${maxRetries}...`);
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
        console.log(`[kling/fal] Downloaded ${videoBuffer.length} bytes`);
        break;
      } catch (error: any) {
        console.error(`[kling/fal] Download attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to download video after ${maxRetries} attempts: ${error.message}`,
          );
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }

    if (!videoBuffer) {
      throw new Error("Failed to download video buffer");
    }

    // Probe actual duration from the downloaded video via ffprobe
    let actualDuration = durationSec;
    try {
      const { execFileSync } = await import("child_process");
      const fs = await import("fs");
      const os = await import("os");
      const path = await import("path");
      const tmpPath = path.join(os.tmpdir(), `kling-probe-${Date.now()}.mp4`);
      fs.writeFileSync(tmpPath, videoBuffer);
      const stdout = execFileSync("ffprobe", [
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        tmpPath,
      ]).toString().trim();
      fs.unlinkSync(tmpPath);
      const probed = parseFloat(stdout);
      if (probed > 0) {
        actualDuration = probed;
        if (Math.abs(probed - durationSec) > 1) {
          console.warn(
            `[kling/fal] Duration mismatch: requested ${durationSec}s, actual video is ${probed.toFixed(1)}s`,
          );
        }
      }
    } catch (e) {
      console.warn(`[kling/fal] ffprobe failed, using requested duration: ${(e as Error).message}`);
    }

    console.log(`[kling/fal] Final clip: ${actualDuration.toFixed(1)}s, ${videoBuffer.length} bytes`);

    return {
      videoBuffer,
      mimeType: data.video.content_type ?? "video/mp4",
      durationSec: actualDuration,
      costUsd: calculateVideoCost(this.modelId, actualDuration),
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
