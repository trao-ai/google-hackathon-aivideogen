import { createImageProvider } from "../image/gemini";

describe("Image Provider", () => {
  describe("createImageProvider", () => {
    it("creates MockImageProvider when USE_MOCK_IMAGE=true", () => {
      process.env.USE_MOCK_IMAGE = "true";
      const provider = createImageProvider();
      expect(provider).toBeDefined();
      expect(provider.generate).toBeDefined();
      delete process.env.USE_MOCK_IMAGE;
    });

    it("throws when GEMINI_API_KEY not set and mock is off", () => {
      delete process.env.USE_MOCK_IMAGE;
      delete process.env.GEMINI_API_KEY;
      expect(() => createImageProvider()).toThrow("GEMINI_API_KEY is not set");
    });
  });

  describe("MockImageProvider", () => {
    beforeEach(() => {
      process.env.USE_MOCK_IMAGE = "true";
    });

    afterEach(() => {
      delete process.env.USE_MOCK_IMAGE;
    });

    it("generates a 1x1 PNG image", async () => {
      const provider = createImageProvider();
      const result = await provider.generate("A blue character standing");

      expect(result.imageBuffer).toBeInstanceOf(Buffer);
      expect(result.imageBuffer.length).toBeGreaterThan(0);
      expect(result.mimeType).toBe("image/png");
      expect(result.costUsd).toBe(0);
      expect(result.model).toBe("mock");
    });

    it("returns provided seed", async () => {
      const provider = createImageProvider();
      const result = await provider.generate("prompt", undefined, "my-seed");

      expect(result.seed).toBe("my-seed");
    });

    it("uses default seed when not provided", async () => {
      const provider = createImageProvider();
      const result = await provider.generate("prompt");

      expect(result.seed).toBe("mock-seed");
    });
  });
});
