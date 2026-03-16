// Mock @google/generative-ai before importing
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

import { FrameValidator } from "../frame-validator";

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

describe("FrameValidator", () => {
  describe("constructor", () => {
    it("creates with explicit API key", () => {
      expect(() => new FrameValidator("my-key")).not.toThrow();
    });

    it("creates with env var API key", () => {
      process.env.GEMINI_API_KEY = "env-key";
      expect(() => new FrameValidator()).not.toThrow();
    });

    it("throws without API key", () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new FrameValidator()).toThrow("GEMINI_API_KEY is required");
    });
  });

  describe("validateFrame", () => {
    it("returns parsed scores from LLM response", async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              qualityScore: 85,
              styleMatchScore: 90,
              issues: ["minor artifact in corner"],
              recommendations: ["increase contrast"],
            }),
        },
      });

      const validator = new FrameValidator("test-key");
      const result = await validator.validateFrame({
        imageBuffer: Buffer.from("fake-image"),
      });

      expect(result.qualityScore).toBe(85);
      expect(result.styleMatchScore).toBe(90);
      expect(result.issues).toEqual(["minor artifact in corner"]);
      expect(result.recommendations).toEqual(["increase contrast"]);
    });

    it("handles markdown code fences in response", async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            '```json\n{"qualityScore": 75, "styleMatchScore": 80, "issues": [], "recommendations": []}\n```',
        },
      });

      const validator = new FrameValidator("test-key");
      const result = await validator.validateFrame({
        imageBuffer: Buffer.from("fake-image"),
      });

      expect(result.qualityScore).toBe(75);
      expect(result.styleMatchScore).toBe(80);
    });

    it("clamps scores to 0-100 range", async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              qualityScore: 150,
              styleMatchScore: -10,
              issues: [],
              recommendations: [],
            }),
        },
      });

      const validator = new FrameValidator("test-key");
      const result = await validator.validateFrame({
        imageBuffer: Buffer.from("fake-image"),
      });

      expect(result.qualityScore).toBe(100);
      expect(result.styleMatchScore).toBe(0);
    });

    it("returns zeros on API error", async () => {
      mockGenerateContent.mockRejectedValue(new Error("API timeout"));

      const validator = new FrameValidator("test-key");
      const result = await validator.validateFrame({
        imageBuffer: Buffer.from("fake-image"),
      });

      expect(result.qualityScore).toBe(0);
      expect(result.styleMatchScore).toBe(0);
      expect(result.issues[0]).toContain("Validation failed");
    });

    it("returns zeros for unparseable response", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => "This is not JSON at all" },
      });

      const validator = new FrameValidator("test-key");
      const result = await validator.validateFrame({
        imageBuffer: Buffer.from("fake-image"),
      });

      expect(result.qualityScore).toBe(0);
      expect(result.styleMatchScore).toBe(0);
    });
  });

  describe("compareFrameConsistency", () => {
    it("returns consistency score from LLM", async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              consistencyScore: 92,
              issues: [],
            }),
        },
      });

      const validator = new FrameValidator("test-key");
      const result = await validator.compareFrameConsistency(
        Buffer.from("frame1"),
        Buffer.from("frame2")
      );

      expect(result.consistencyScore).toBe(92);
      expect(result.issues).toEqual([]);
    });

    it("returns zero on error", async () => {
      mockGenerateContent.mockRejectedValue(new Error("fail"));

      const validator = new FrameValidator("test-key");
      const result = await validator.compareFrameConsistency(
        Buffer.from("frame1"),
        Buffer.from("frame2")
      );

      expect(result.consistencyScore).toBe(0);
      expect(result.issues[0]).toContain("Consistency check failed");
    });
  });
});
