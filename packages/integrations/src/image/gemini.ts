/**
 * Image generation adapter (Gemini / configurable).
 * Set USE_MOCK_IMAGE=true in env for local dev.
 */

import { calculateImageCost } from "@atlas/shared";

export interface ImageGenerationResult {
  imageBuffer: Buffer;
  mimeType: string;
  seed?: string;
  costUsd: number;
  model: string;
}

export interface ImageProvider {
  generate(prompt: string, seed?: string): Promise<ImageGenerationResult>;
}

// ─── Gemini image provider ───────────────────────────────────────────────────

class GeminiImageProvider implements ImageProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? "";
    if (!this.apiKey) throw new Error("GEMINI_API_KEY is not set");
  }

  async generate(prompt: string): Promise<ImageGenerationResult> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini image API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      predictions: { bytesBase64Encoded: string; mimeType: string }[];
    };

    const prediction = data.predictions[0];
    const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, "base64");

    const imageModel = "imagen-4.0-fast-generate-001";
    const costUsd = calculateImageCost(imageModel, 1);

    return { imageBuffer, mimeType: prediction.mimeType, costUsd, model: imageModel };
  }
}

// ─── Mock provider ───────────────────────────────────────────────────────────

class MockImageProvider implements ImageProvider {
  async generate(prompt: string): Promise<ImageGenerationResult> {
    // Return a tiny valid PNG (1x1 transparent pixel)
    const png1x1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    console.log(
      `[MockImage] Generating frame for prompt: "${prompt.substring(0, 80)}..."`,
    );
    return { imageBuffer: png1x1, mimeType: "image/png", costUsd: 0, model: "mock" };
  }
}

export function createImageProvider(): ImageProvider {
  if (process.env.USE_MOCK_IMAGE === "true") return new MockImageProvider();
  return new GeminiImageProvider();
}
