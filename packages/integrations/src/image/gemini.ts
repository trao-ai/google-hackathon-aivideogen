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
  generate(prompt: string, referenceImage?: Buffer, seed?: string, aspectRatio?: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
}

export interface ImageGenerationOptions {
  /** When true, the referenceImage is treated as a CHARACTER identity reference (reproduce this character),
   *  not just a style guide. Changes the prompt instruction accordingly. */
  isCharacterReference?: boolean;
  /** Additional reference image for scene continuity (previous scene's end frame).
   *  Used alongside the primary referenceImage so both character identity AND scene flow are maintained. */
  continuityReference?: Buffer;
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

  async generate(prompt: string, referenceImage?: Buffer, seed?: string, aspectRatio?: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    // Generate a deterministic seed if not provided (for versioning)
    const generationSeed = seed || this.generateSeed(prompt);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // Prepare aspect ratio instruction
      const requestedAspectRatio = aspectRatio ?? "16:9";
      const isPortrait = requestedAspectRatio === "9:16";
      const aspectRatioInstruction = isPortrait
        ? "\n\nIMPORTANT: Generate this image in VERTICAL/PORTRAIT format (9:16 aspect ratio). The composition must be tall and narrow, NOT wide. Stack elements vertically."
        : "\n\nIMPORTANT: Generate this image in HORIZONTAL/LANDSCAPE format (16:9 aspect ratio). The composition must be wide, NOT tall.";

      console.log(`[nano-banana-pro] Generating image with aspect ratio: ${requestedAspectRatio} (${isPortrait ? 'PORTRAIT' : 'LANDSCAPE'})`);

      // Build parts: include reference image if provided for style consistency
      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      const isCharRef = options?.isCharacterReference ?? false;

      if (referenceImage) {
        // Primary reference image (character identity OR style guide)
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: referenceImage.toString("base64"),
          },
        });

        if (isCharRef) {
          // CHARACTER IDENTITY mode: the reference is THE character — reproduce it exactly
          parts.push({
            text: `[CHARACTER REFERENCE IMAGE ABOVE] This image shows the MAIN CHARACTER. You MUST reproduce this EXACT SAME character in the new image — same face, same body shape, same proportions, same skin/body color, same eye style, same hair, same clothing, same accessories, same color scheme. The character's visual identity must be IDENTICAL to this reference. Do NOT change ANY aspect of the character's appearance. Generate a NEW scene image featuring this exact character.\n`,
          });
        }

        // Add continuity reference if available (previous scene's frame)
        if (options?.continuityReference) {
          parts.push({
            inlineData: {
              mimeType: "image/png",
              data: options.continuityReference.toString("base64"),
            },
          });
          parts.push({
            text: `[SCENE CONTINUITY REFERENCE ABOVE] This is the previous scene's frame. Maintain the same art style, color palette, lighting, and visual language for smooth scene-to-scene flow. The new image should feel like it belongs in the same video.\n`,
          });
        }

        const referenceInstruction = isCharRef
          ? `Generate a NEW image featuring the EXACT character from the character reference image above. Match the character's identity precisely while placing them in the new scene described below.`
          : `Use the reference image above as a STRICT style guide. You MUST match its exact art style, color palette, line weight, character proportions, shading technique, and background treatment. Generate a NEW image (not an edit) based on this description.`;

        parts.push({
          text: `${referenceInstruction}\n\nCRITICAL RULE: Do NOT include ANY text, words, letters, numbers, labels, captions, titles, watermarks, writing, or typography ANYWHERE in the image. The image must contain ZERO text. This is non-negotiable.${aspectRatioInstruction}\n\n${prompt}`,
        });
      } else {
        parts.push({
          text: `Generate an image based on this description.\n\nCRITICAL RULE: Do NOT include ANY text, words, letters, numbers, labels, captions, titles, watermarks, writing, or typography ANYWHERE in the image. The image must contain ZERO text. This is non-negotiable.${aspectRatioInstruction}\n\n${prompt}`,
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
                aspectRatio: requestedAspectRatio,
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
        throw new Error("Nano Banana Pro: no candidates in response — image may have been blocked by safety filter");
      }

      // Safety filter can return a candidate with no content/parts
      const responseParts = candidate.content?.parts;
      if (!responseParts || responseParts.length === 0) {
        throw new Error(
          "Nano Banana Pro: image blocked by safety filter (no content parts). Try rephrasing the prompt.",
        );
      }

      // Find the image part in the response
      const imagePart = responseParts.find(
        (p): p is { inlineData: { mimeType: string; data: string } } =>
          "inlineData" in p,
      );

      if (!imagePart) {
        throw new Error(
          "Nano Banana Pro: no image data in response. Parts: " +
            JSON.stringify(responseParts.map((p) => Object.keys(p))),
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
