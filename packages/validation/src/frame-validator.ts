import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FrameValidationResult } from "./types";
import type { StyleBible } from "@atlas/shared";

export class FrameValidator {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is required for frame validation");
    }
    this.genAI = new GoogleGenerativeAI(key);
  }

  async validateFrame(params: {
    imageBuffer: Buffer;
    referenceBuffer?: Buffer;
    styleBible?: StyleBible;
  }): Promise<FrameValidationResult> {
    const { imageBuffer, referenceBuffer, styleBible } = params;

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      const prompt = this.buildValidationPrompt(styleBible);

      const imageParts = [
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: "image/png",
          },
        },
      ];

      if (referenceBuffer) {
        imageParts.push({
          inlineData: {
            data: referenceBuffer.toString("base64"),
            mimeType: "image/png",
          },
        });
      }

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = result.response.text();

      return this.parseValidationResponse(response);
    } catch (error) {
      console.error("[FrameValidator] Validation failed:", error);
      return {
        qualityScore: 0,
        styleMatchScore: 0,
        issues: ["Validation failed: " + (error as Error).message],
        recommendations: [],
      };
    }
  }

  async compareFrameConsistency(
    frame1: Buffer,
    frame2: Buffer
  ): Promise<{ consistencyScore: number; issues: string[] }> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      const prompt = `Compare these two frames for visual consistency. Analyze:
1. Art style consistency (line weights, shading, textures)
2. Color palette consistency
3. Character design consistency (if characters present)
4. Overall aesthetic coherence

Return a JSON response with:
{
  "consistencyScore": <0-100>,
  "issues": ["list of inconsistencies found"]
}`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: frame1.toString("base64"),
            mimeType: "image/png",
          },
        },
        {
          inlineData: {
            data: frame2.toString("base64"),
            mimeType: "image/png",
          },
        },
      ]);

      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          consistencyScore: parsed.consistencyScore || 0,
          issues: parsed.issues || [],
        };
      }

      return { consistencyScore: 0, issues: ["Failed to parse response"] };
    } catch (error) {
      console.error("[FrameValidator] Consistency check failed:", error);
      return {
        consistencyScore: 0,
        issues: ["Consistency check failed: " + (error as Error).message],
      };
    }
  }

  private buildValidationPrompt(styleBible?: StyleBible): string {
    let prompt = `You are a professional art director evaluating a generated frame for quality and style consistency.

Analyze this image and rate it on:

1. **Quality Score (0-100)**:
   - Composition and framing
   - Visual clarity and readability
   - Technical quality (artifacts, blurriness, distortion)
   - Overall professional appearance

2. **Style Match Score (0-100)**${
      styleBible
        ? ` (against the provided style bible):
   - Color palette adherence: ${JSON.stringify(styleBible.palette)}
   - Character design rules: ${JSON.stringify(styleBible.characterRules)}
   - Line weight and art style consistency
   - Background density and detail level`
        : `:
   - Internal style consistency
   - Professional 2D animation quality
   - Clean, polished aesthetic`
    }

Return a JSON response with this exact structure:
{
  "qualityScore": <0-100>,
  "styleMatchScore": <0-100>,
  "issues": ["list of specific issues found"],
  "recommendations": ["actionable suggestions for improvement"]
}

Be specific and constructive in issues and recommendations.`;

    return prompt;
  }

  private parseValidationResponse(response: string): FrameValidationResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          qualityScore: Math.min(100, Math.max(0, parsed.qualityScore || 0)),
          styleMatchScore: Math.min(
            100,
            Math.max(0, parsed.styleMatchScore || 0)
          ),
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          recommendations: Array.isArray(parsed.recommendations)
            ? parsed.recommendations
            : [],
        };
      }

      return {
        qualityScore: 0,
        styleMatchScore: 0,
        issues: ["Failed to parse validation response"],
        recommendations: [],
      };
    } catch (error) {
      console.error("[FrameValidator] Failed to parse response:", error);
      return {
        qualityScore: 0,
        styleMatchScore: 0,
        issues: ["JSON parsing failed"],
        recommendations: [],
      };
    }
  }
}
