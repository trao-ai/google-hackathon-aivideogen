import { createTTSProvider, ELEVENLABS_TTS_MODEL, ELEVENLABS_OUTPUT_FORMAT } from "../tts/elevenlabs";

describe("TTS Provider", () => {
  describe("createTTSProvider", () => {
    it("creates MockTTSProvider when USE_MOCK_TTS=true", () => {
      process.env.USE_MOCK_TTS = "true";
      const provider = createTTSProvider();
      expect(provider).toBeDefined();
      expect(provider.generate).toBeDefined();
      delete process.env.USE_MOCK_TTS;
    });

    it("throws when ELEVENLABS_API_KEY not set and mock is off", () => {
      delete process.env.USE_MOCK_TTS;
      delete process.env.ELEVENLABS_API_KEY;
      expect(() => createTTSProvider()).toThrow("ELEVENLABS_API_KEY is not set");
    });
  });

  describe("MockTTSProvider", () => {
    beforeEach(() => {
      process.env.USE_MOCK_TTS = "true";
    });

    afterEach(() => {
      delete process.env.USE_MOCK_TTS;
    });

    it("generates mock audio with estimated duration", async () => {
      const provider = createTTSProvider();
      const result = await provider.generate(
        "This is a test sentence with about ten words in it.",
        "voice-123"
      );

      expect(result.audioBuffer).toBeInstanceOf(Buffer);
      expect(result.durationSec).toBeGreaterThan(0);
      expect(result.segments).toHaveLength(1);
      expect(result.costUsd).toBe(0);
      expect(result.model).toBe("mock");
      expect(result.characterCount).toBe(
        "This is a test sentence with about ten words in it.".length
      );
    });

    it("calculates duration based on word count (150 wpm)", async () => {
      const provider = createTTSProvider();
      // 150 words = 60 seconds
      const words150 = Array(150).fill("word").join(" ");
      const result = await provider.generate(words150, "voice-123");

      expect(result.durationSec).toBeCloseTo(60, 0);
    });
  });

  describe("constants", () => {
    it("exports correct model name", () => {
      expect(ELEVENLABS_TTS_MODEL).toBe("eleven_v3");
    });

    it("exports correct output format", () => {
      expect(ELEVENLABS_OUTPUT_FORMAT).toBe("mp3_44100_128");
    });
  });
});
