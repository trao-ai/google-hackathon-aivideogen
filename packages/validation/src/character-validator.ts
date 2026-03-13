import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  CharacterProfile,
  CharacterConsistencyResult,
} from "./types";

export class CharacterValidator {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is required for character validation");
    }
    this.genAI = new GoogleGenerativeAI(key);
  }

  async extractCharacters(imageBuffer: Buffer): Promise<CharacterProfile[]> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      const prompt = `Analyze this image and identify all characters present.

For each character, provide:
1. A unique identifier (e.g., "character_1", "character_2")
2. A detailed description of their appearance
3. Key visual features (clothing, hair style, facial features, body proportions)

Return a JSON response:
{
  "characters": [
    {
      "id": "character_1",
      "description": "detailed description",
      "keyFeatures": ["feature1", "feature2", "feature3"]
    }
  ]
}

If no characters are present, return { "characters": [] }`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: "image/png",
          },
        },
      ]);

      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.characters || []).map((char: any) => ({
          id: char.id || "unknown",
          description: char.description || "",
          keyFeatures: char.keyFeatures || [],
          sceneIds: [],
        }));
      }

      return [];
    } catch (error) {
      console.error("[CharacterValidator] Character extraction failed:", error);
      return [];
    }
  }

  async validateCharacterConsistency(
    profiles: CharacterProfile[]
  ): Promise<CharacterConsistencyResult> {
    if (profiles.length === 0) {
      return {
        consistent: true,
        consistencyScore: 100,
        issues: [],
      };
    }

    try {
      const characterGroups = this.groupCharactersByIdentity(profiles);
      const issues: string[] = [];
      let totalConsistency = 0;
      let groupCount = 0;

      for (const [characterId, instances] of Object.entries(characterGroups)) {
        if (instances.length < 2) continue;

        groupCount++;
        const consistency = this.compareCharacterInstances(instances);
        totalConsistency += consistency.score;

        if (consistency.score < 80) {
          issues.push(
            `Character "${characterId}" shows inconsistencies across ${instances.length} scenes: ${consistency.issues.join(", ")}`
          );
        }
      }

      const consistencyScore =
        groupCount > 0 ? totalConsistency / groupCount : 100;

      return {
        consistent: consistencyScore >= 85,
        consistencyScore: Math.round(consistencyScore),
        issues,
      };
    } catch (error) {
      console.error(
        "[CharacterValidator] Consistency validation failed:",
        error
      );
      return {
        consistent: false,
        consistencyScore: 0,
        issues: ["Consistency validation failed: " + (error as Error).message],
      };
    }
  }

  private groupCharactersByIdentity(
    profiles: CharacterProfile[]
  ): Record<string, CharacterProfile[]> {
    const groups: Record<string, CharacterProfile[]> = {};

    for (const profile of profiles) {
      if (!groups[profile.id]) {
        groups[profile.id] = [];
      }
      groups[profile.id].push(profile);
    }

    return groups;
  }

  private compareCharacterInstances(instances: CharacterProfile[]): {
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    const baseFeatures = new Set(instances[0].keyFeatures);
    let matchCount = 0;
    let totalComparisons = 0;

    for (let i = 1; i < instances.length; i++) {
      const currentFeatures = new Set(instances[i].keyFeatures);
      const commonFeatures = new Set(
        [...baseFeatures].filter((f) => currentFeatures.has(f))
      );

      matchCount += commonFeatures.size;
      totalComparisons += Math.max(baseFeatures.size, currentFeatures.size);

      const missingFeatures = [...baseFeatures].filter(
        (f) => !currentFeatures.has(f)
      );
      if (missingFeatures.length > 0) {
        issues.push(
          `Missing features in scene ${instances[i].sceneIds[0]}: ${missingFeatures.join(", ")}`
        );
      }
    }

    const score =
      totalComparisons > 0 ? (matchCount / totalComparisons) * 100 : 100;

    return { score, issues };
  }
}
