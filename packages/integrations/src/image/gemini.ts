/**
 * Image generation adapter — Nano Banana Pro (gemini-3-pro-image-preview).
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
  generate(prompt: string, referenceImage?: Buffer, seed?: string): Promise<ImageGenerationResult>;
}

// ─── Nano Banana Pro (Gemini 3 Pro Image) provider ──────────────────────────

interface GenerateContentResponse {
  candidates: {
    content: {
      parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      >;
    };
  }[];
}

class NanoBananaProProvider implements ImageProvider {
  private apiKey: string;
  private maxRetries = 5;
  private model = "gemini-3-pro-image-preview";

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? "";
    if (!this.apiKey) throw new Error("GEMINI_API_KEY is not set");
  }

  async generate(prompt: string, referenceImage?: Buffer, seed?: string): Promise<ImageGenerationResult> {
    // Generate a deterministic seed if not provided (for versioning)
    const generationSeed = seed || this.generateSeed(prompt);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // Build parts: include reference image if provided for style consistency
      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (referenceImage) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: referenceImage.toString("base64"),
          },
        });
        parts.push({
          text: `Use the reference image above as a STRICT style guide. You MUST match its exact art style, color palette, line weight, character proportions, shading technique, and background treatment. Generate a NEW image (not an edit) based on this description. Do NOT include any text, words, letters, or writing in the image.\n\n${prompt}`,
        });
      } else {
        parts.push({
          text: `Generate an image based on this description. Do NOT include any text, words, letters, or writing in the image.\n\n${prompt}`,
        });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ["IMAGE"],
              imageConfig: {
                aspectRatio: "16:9",
                imageSize: "1K",
              },
            },
          }),
        },
      );

      if (res.status === 429 && attempt < this.maxRetries) {
        const body = await res.text();
        let waitMs = Math.min(30_000, 2 ** attempt * 5_000);
        const retryMatch = body.match(/retry in ([\d.]+)s/i);
        if (retryMatch) {
          waitMs = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000;
        }
        console.log(
          `[nano-banana-pro] Rate limited, retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${this.maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Nano Banana Pro API error ${res.status}: ${err}`);
      }

      const data = (await res.json()) as GenerateContentResponse;
      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error("Nano Banana Pro: no candidates in response");
      }

      // Find the image part in the response
      const imagePart = candidate.content.parts.find(
        (p): p is { inlineData: { mimeType: string; data: string } } =>
          "inlineData" in p,
      );

      if (!imagePart) {
        throw new Error(
          "Nano Banana Pro: no image data in response. Parts: " +
            JSON.stringify(candidate.content.parts.map((p) => Object.keys(p))),
        );
      }

      const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");

      const costUsd = calculateImageCost(this.model, 1);

      return {
        imageBuffer,
        mimeType: imagePart.inlineData.mimeType,
        seed: generationSeed,
        costUsd,
        model: this.model,
      };
    }

    throw new Error(
      "Nano Banana Pro: max retries exceeded for rate limiting",
    );
  }

  private generateSeed(prompt: string): string {
    // Generate a deterministic hash-like seed from prompt + timestamp
    const timestamp = Date.now();
    const combined = `${prompt}-${timestamp}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// ─── Mock provider ───────────────────────────────────────────────────────────

class MockImageProvider implements ImageProvider {
  async generate(prompt: string, _referenceImage?: Buffer, seed?: string): Promise<ImageGenerationResult> {
    // Return a tiny valid PNG (1x1 transparent pixel)
    const png1x1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    console.log(
      `[MockImage] Generating frame for prompt: "${prompt.substring(0, 80)}..."`,
    );
    return { imageBuffer: png1x1, mimeType: "image/png", seed: seed || "mock-seed", costUsd: 0, model: "mock" };
  }
}

export function createImageProvider(): ImageProvider {
  if (process.env.USE_MOCK_IMAGE === "true") return new MockImageProvider();
  return new NanoBananaProProvider();
}
