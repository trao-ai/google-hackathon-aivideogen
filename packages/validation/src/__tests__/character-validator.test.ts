jest.mock("@google/generative-ai", () => {
  const mockGenerateContent = jest.fn();
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
    __mockGenerateContent: mockGenerateContent,
  };
});

import { CharacterValidator } from "../character-validator";

const { __mockGenerateContent: mockGenerateContent } = jest.requireMock(
  "@google/generative-ai"
) as { __mockGenerateContent: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
});

describe("CharacterValidator", () => {
  describe("extractCharacters", () => {
    it("extracts characters from LLM response", async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              characters: [
                {
                  id: "char_1",
                  description: "A blue round character",
                  keyFeatures: ["blue", "round", "large eyes"],
                },
                {
                  id: "char_2",
                  description: "A red triangle character",
                  keyFeatures: ["red", "triangular", "small"],
                },
              ],
            }),
        },
      });

      const validator = new CharacterValidator("test-key");
      const chars = await validator.extractCharacters(Buffer.from("image"));

      expect(chars).toHaveLength(2);
      expect(chars[0].id).toBe("char_1");
      expect(chars[0].keyFeatures).toEqual(["blue", "round", "large eyes"]);
      expect(chars[1].id).toBe("char_2");
    });

    it("returns empty array on API error", async () => {
      mockGenerateContent.mockRejectedValue(new Error("fail"));

      const validator = new CharacterValidator("test-key");
      const chars = await validator.extractCharacters(Buffer.from("image"));

      expect(chars).toEqual([]);
    });

    it("returns empty array when no characters found", async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ characters: [] }),
        },
      });

      const validator = new CharacterValidator("test-key");
      const chars = await validator.extractCharacters(Buffer.from("image"));

      expect(chars).toEqual([]);
    });
  });

  describe("validateCharacterConsistency", () => {
    it("returns 100 for empty profiles", async () => {
      const validator = new CharacterValidator("test-key");
      const result = await validator.validateCharacterConsistency([]);

      expect(result.consistent).toBe(true);
      expect(result.consistencyScore).toBe(100);
      expect(result.issues).toEqual([]);
    });

    it("returns 100 for single instance of each character", async () => {
      const validator = new CharacterValidator("test-key");
      const result = await validator.validateCharacterConsistency([
        { id: "char_1", description: "blue", keyFeatures: ["blue"], sceneIds: ["s1"] },
        { id: "char_2", description: "red", keyFeatures: ["red"], sceneIds: ["s1"] },
      ]);

      // Single instances → no comparison needed → defaults to 100
      expect(result.consistencyScore).toBe(100);
    });

    it("detects inconsistencies between instances", async () => {
      const validator = new CharacterValidator("test-key");
      const result = await validator.validateCharacterConsistency([
        { id: "hero", description: "blue round", keyFeatures: ["blue", "round", "scarf"], sceneIds: ["s1"] },
        { id: "hero", description: "blue round", keyFeatures: ["blue", "round"], sceneIds: ["s2"] },
      ]);

      // Missing "scarf" in second instance
      // match: 2 out of max(3, 2)=3 → 66.7%
      expect(result.consistencyScore).toBeLessThan(85);
      expect(result.consistent).toBe(false);
    });

    it("reports high consistency for matching features", async () => {
      const validator = new CharacterValidator("test-key");
      const result = await validator.validateCharacterConsistency([
        { id: "hero", description: "blue", keyFeatures: ["blue", "round", "scarf"], sceneIds: ["s1"] },
        { id: "hero", description: "blue", keyFeatures: ["blue", "round", "scarf"], sceneIds: ["s2"] },
      ]);

      expect(result.consistencyScore).toBe(100);
      expect(result.consistent).toBe(true);
    });
  });
});
