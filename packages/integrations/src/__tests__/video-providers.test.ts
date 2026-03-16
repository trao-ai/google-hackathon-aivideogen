import { createVideoProvider } from "../video/veo";

describe("Video Provider Factory", () => {
  describe("createVideoProvider", () => {
    it("creates MockVideoProvider when USE_MOCK_VIDEO=true", () => {
      process.env.USE_MOCK_VIDEO = "true";
      const provider = createVideoProvider();
      expect(provider).toBeDefined();
      expect(provider.generate).toBeDefined();
      delete process.env.USE_MOCK_VIDEO;
    });

    it("throws when GEMINI_API_KEY not set for veo provider", () => {
      delete process.env.USE_MOCK_VIDEO;
      delete process.env.GEMINI_API_KEY;
      process.env.VIDEO_PROVIDER = "veo";
      expect(() => createVideoProvider()).toThrow("GEMINI_API_KEY is not set");
      delete process.env.VIDEO_PROVIDER;
    });
  });

  describe("MockVideoProvider", () => {
    beforeEach(() => {
      process.env.USE_MOCK_VIDEO = "true";
    });

    afterEach(() => {
      delete process.env.USE_MOCK_VIDEO;
    });

    it("generates mock video with placeholder buffer", async () => {
      const provider = createVideoProvider();
      const result = await provider.generate({
        prompt: "Test animation prompt",
        startFrameBase64: Buffer.from("fake-image").toString("base64"),
      });

      expect(result.videoBuffer).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe("video/mp4");
      expect(result.durationSec).toBe(4);
      expect(result.costUsd).toBe(0);
    });
  });
});

describe("createVideoProvider routing", () => {
  it("defaults to veo when no provider specified", () => {
    delete process.env.USE_MOCK_VIDEO;
    delete process.env.VIDEO_PROVIDER;
    process.env.GEMINI_API_KEY = "test-key";

    const provider = createVideoProvider();
    expect(provider).toBeDefined();

    delete process.env.GEMINI_API_KEY;
  });

  it("accepts provider override parameter", () => {
    delete process.env.USE_MOCK_VIDEO;
    process.env.GEMINI_API_KEY = "test-key";

    const provider = createVideoProvider("veo");
    expect(provider).toBeDefined();

    delete process.env.GEMINI_API_KEY;
  });

  it("creates kling provider when specified", () => {
    delete process.env.USE_MOCK_VIDEO;
    process.env.FAL_KEY = "test-key";

    const provider = createVideoProvider("kling");
    expect(provider).toBeDefined();

    delete process.env.FAL_KEY;
  });
});
