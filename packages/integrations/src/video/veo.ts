/**
 * Video generation adapter (Google Veo / configurable).
 * Set USE_MOCK_VIDEO=true in env for local dev.
 *
 * Uses Gemini API (generativelanguage.googleapis.com) with predictLongRunning.
 * Default model: veo-3.1-generate-preview (supports image-to-video).
 *
 * IMPORTANT: The Gemini API uses `bytesBase64Encoded` (NOT `inlineData`) for images,
 * and `durationSeconds` must be a number (NOT a string).
 */

import { calculateVideoCost } from "@atlas/shared";

export interface VideoGenerationResult {
  videoBuffer: Buffer;
  mimeType: string;
  durationSec: number;
  costUsd: number;
}

export interface VideoProvider {
  generate(opts: {
    prompt: string;
    startFrameBase64: string;
    endFrameBase64: string;
    aspectRatio?: string;
    durationSec?: number;
  }): Promise<VideoGenerationResult>;
}

// ─── Google Veo provider ────────────────────────────────────────────────────

class VeoVideoProvider implements VideoProvider {
  private apiKey: string;
  private model: string;
  private pollIntervalMs: number;
  private maxPollAttempts: number;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? "";
    if (!this.apiKey) throw new Error("GEMINI_API_KEY is not set");
    this.model = process.env.VEO_MODEL ?? "veo-3.1-generate-preview";
    this.pollIntervalMs = 10_000;
    this.maxPollAttempts = 60; // 10 minutes max
  }

  async generate(opts: {
    prompt: string;
    startFrameBase64: string;
    endFrameBase64: string;
    aspectRatio?: string;
  }): Promise<VideoGenerationResult> {
    const { prompt, startFrameBase64, endFrameBase64, aspectRatio = "16:9" } =
      opts;

    // Try with first + last frame (veo-3.1 feature).
    // If the API rejects lastFrame, fall back to start frame only.
    const operation = await this.submitGeneration(
      prompt,
      startFrameBase64,
      endFrameBase64,
      aspectRatio,
    );

    console.log(`[veo] Operation started: ${operation.name}`);

    // Poll for completion
    const result = await this.pollOperation(operation.name);
    return result;
  }

  private async submitGeneration(
    prompt: string,
    startFrameBase64: string,
    endFrameBase64: string,
    aspectRatio: string,
  ): Promise<{ name: string }> {
    // Gemini API requires `bytesBase64Encoded` format (NOT `inlineData`),
    // and `durationSeconds` must be a number (NOT a string).

    // Attempt 1: First + Last frame (gives Veo both endpoints)
    const instanceWithLastFrame: Record<string, unknown> = {
      prompt,
      image: {
        bytesBase64Encoded: startFrameBase64,
        mimeType: "image/png",
      },
      lastFrame: {
        bytesBase64Encoded: endFrameBase64,
        mimeType: "image/png",
      },
    };

    const parameters = { aspectRatio, resolution: "720p", durationSeconds: 8 };

    console.log("[veo] Trying first + last frame generation...");
    const res1 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:predictLongRunning?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [instanceWithLastFrame],
          parameters,
        }),
      },
    );

    if (res1.ok) {
      console.log("[veo] First + last frame accepted!");
      return (await res1.json()) as { name: string };
    }

    const err1 = await res1.text();
    console.warn(
      `[veo] First + last frame rejected (${res1.status}), falling back to start frame only: ${err1.slice(0, 200)}`,
    );

    // Attempt 2: Start frame only
    const instanceStartOnly: Record<string, unknown> = {
      prompt,
      image: {
        bytesBase64Encoded: startFrameBase64,
        mimeType: "image/png",
      },
    };

    const res2 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:predictLongRunning?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [instanceStartOnly],
          parameters,
        }),
      },
    );

    if (!res2.ok) {
      const err2 = await res2.text();
      throw new Error(`Veo API error ${res2.status}: ${err2}`);
    }

    return (await res2.json()) as { name: string };
  }

  private async pollOperation(
    operationName: string,
  ): Promise<VideoGenerationResult> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await this.sleep(this.pollIntervalMs);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${this.apiKey}`,
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Veo poll error ${res.status}: ${err}`);
      }

      const data = (await res.json()) as {
        done?: boolean;
        error?: { code: number; message: string };
        response?: {
          generateVideoResponse?: {
            generatedSamples?: Array<{
              video?: { uri: string; mimeType?: string };
            }>;
          };
        };
      };

      if (data.error) {
        throw new Error(
          `Veo generation failed (${data.error.code}): ${data.error.message}`,
        );
      }

      if (data.done) {
        const samples =
          data.response?.generateVideoResponse?.generatedSamples;
        if (!samples || samples.length === 0 || !samples[0].video?.uri) {
          throw new Error("Veo returned no video samples");
        }

        const videoUri = samples[0].video.uri;
        console.log(`[veo] Video ready, downloading from: ${videoUri}`);

        // Download the video — must include API key for auth
        const videoRes = await fetch(videoUri, {
          headers: { "x-goog-api-key": this.apiKey },
        });
        if (!videoRes.ok) {
          throw new Error(`Failed to download video: ${videoRes.status}`);
        }
        const arrayBuffer = await videoRes.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);

        const durationSec = 8;
        return {
          videoBuffer,
          mimeType: samples[0].video.mimeType ?? "video/mp4",
          durationSec,
          costUsd: calculateVideoCost(this.model, durationSec),
        };
      }

      console.log(
        `[veo] Poll attempt ${attempt + 1}/${this.maxPollAttempts} — still generating...`,
      );
    }

    throw new Error(
      `Veo generation timed out after ${this.maxPollAttempts} poll attempts`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Mock provider ──────────────────────────────────────────────────────────

class MockVideoProvider implements VideoProvider {
  async generate(opts: {
    prompt: string;
    startFrameBase64: string;
    endFrameBase64: string;
  }): Promise<VideoGenerationResult> {
    console.log(
      `[MockVideo] Generating video for prompt: "${opts.prompt.substring(0, 80)}..."`,
    );
    // Return a minimal valid MP4 placeholder
    const placeholderMp4 = Buffer.alloc(64, 0);
    return {
      videoBuffer: placeholderMp4,
      mimeType: "video/mp4",
      durationSec: 4,
      costUsd: 0,
    };
  }
}

export function createVideoProvider(): VideoProvider {
  if (process.env.USE_MOCK_VIDEO === "true") return new MockVideoProvider();

  const provider = (process.env.VIDEO_PROVIDER ?? "kling").toLowerCase();
  switch (provider) {
    case "veo":
      return new VeoVideoProvider();
    case "kling":
    default: {
      // Lazy import to avoid requiring FAL_KEY when using Veo
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { KlingVideoProvider } = require("./kling") as typeof import("./kling");
      return new KlingVideoProvider();
    }
  }
}
