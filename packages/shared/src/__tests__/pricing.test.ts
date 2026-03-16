import {
  calculateLLMCost,
  calculateTTSCost,
  calculateImageCost,
  calculateVideoCost,
  LLM_PRICING,
  TTS_PRICING,
  IMAGE_PRICING,
  VIDEO_PRICING,
} from "../pricing";

describe("calculateLLMCost", () => {
  it("calculates cost for gemini-2.5-flash", () => {
    const cost = calculateLLMCost("gemini-2.5-flash", 1000, 1000);
    const expected =
      (1000 / 1000) * LLM_PRICING["gemini-2.5-flash"].inputPer1kTokens +
      (1000 / 1000) * LLM_PRICING["gemini-2.5-flash"].outputPer1kTokens;
    expect(cost).toBeCloseTo(expected);
  });

  it("calculates cost for gemini-3.1-pro-preview", () => {
    const cost = calculateLLMCost("gemini-3.1-pro-preview", 2000, 500);
    const expected =
      (2000 / 1000) * LLM_PRICING["gemini-3.1-pro-preview"].inputPer1kTokens +
      (500 / 1000) * LLM_PRICING["gemini-3.1-pro-preview"].outputPer1kTokens;
    expect(cost).toBeCloseTo(expected);
  });

  it("falls back to default model for unknown model", () => {
    const cost = calculateLLMCost("unknown-model", 1000, 1000);
    const defaultCost = calculateLLMCost("gemini-2.5-flash", 1000, 1000);
    expect(cost).toBeCloseTo(defaultCost);
  });

  it("returns 0 for 0 tokens", () => {
    const cost = calculateLLMCost("gemini-2.5-flash", 0, 0);
    expect(cost).toBe(0);
  });

  it("handles large token counts", () => {
    const cost = calculateLLMCost("gemini-2.5-flash", 100000, 50000);
    expect(cost).toBeGreaterThan(0);
  });
});

describe("calculateTTSCost", () => {
  it("calculates cost for eleven_v3", () => {
    const cost = calculateTTSCost("eleven_v3", 5000);
    expect(cost).toBeCloseTo(5000 * TTS_PRICING["eleven_v3"].perCharacter);
  });

  it("calculates cost for eleven_flash_v2_5", () => {
    const cost = calculateTTSCost("eleven_flash_v2_5", 1000);
    expect(cost).toBeCloseTo(1000 * TTS_PRICING["eleven_flash_v2_5"].perCharacter);
  });

  it("falls back to default for unknown model", () => {
    const cost = calculateTTSCost("unknown-tts", 1000);
    const defaultCost = calculateTTSCost("eleven_v3", 1000);
    expect(cost).toBeCloseTo(defaultCost);
  });

  it("returns 0 for 0 characters", () => {
    expect(calculateTTSCost("eleven_v3", 0)).toBe(0);
  });
});

describe("calculateImageCost", () => {
  it("calculates cost for imagen-4.0", () => {
    const cost = calculateImageCost("imagen-4.0-fast-generate-001", 10);
    expect(cost).toBeCloseTo(10 * IMAGE_PRICING["imagen-4.0-fast-generate-001"].perImage);
  });

  it("calculates cost for gemini image generation", () => {
    const cost = calculateImageCost("gemini-3-pro-image-preview", 5);
    expect(cost).toBeCloseTo(5 * IMAGE_PRICING["gemini-3-pro-image-preview"].perImage);
  });

  it("falls back to default for unknown model", () => {
    const cost = calculateImageCost("unknown-image", 1);
    const defaultCost = calculateImageCost("imagen-4.0-fast-generate-001", 1);
    expect(cost).toBeCloseTo(defaultCost);
  });

  it("returns 0 for 0 images", () => {
    expect(calculateImageCost("imagen-4.0-fast-generate-001", 0)).toBe(0);
  });
});

describe("calculateVideoCost", () => {
  it("calculates cost for veo", () => {
    const cost = calculateVideoCost("veo-3.1-generate-preview", 8);
    expect(cost).toBeCloseTo(8 * VIDEO_PRICING["veo-3.1-generate-preview"].perSecond);
  });

  it("calculates cost for kling via fal.ai", () => {
    const cost = calculateVideoCost("fal-ai/kling-video/o3/standard/image-to-video", 10);
    expect(cost).toBeCloseTo(
      10 * VIDEO_PRICING["fal-ai/kling-video/o3/standard/image-to-video"].perSecond
    );
  });

  it("calculates cost for seedance via fal.ai", () => {
    const cost = calculateVideoCost("fal-ai/bytedance/seedance/v1.5/pro/image-to-video", 6);
    expect(cost).toBeCloseTo(
      6 * VIDEO_PRICING["fal-ai/bytedance/seedance/v1.5/pro/image-to-video"].perSecond
    );
  });

  it("calculates cost for replicate models", () => {
    const veo = calculateVideoCost("google/veo-3.1", 8);
    expect(veo).toBeCloseTo(8 * VIDEO_PRICING["google/veo-3.1"].perSecond);

    const kling = calculateVideoCost("kwaivgi/kling-v2.1", 5);
    expect(kling).toBeCloseTo(5 * VIDEO_PRICING["kwaivgi/kling-v2.1"].perSecond);

    const seedance = calculateVideoCost("bytedance/seedance-1.5-pro", 10);
    expect(seedance).toBeCloseTo(10 * VIDEO_PRICING["bytedance/seedance-1.5-pro"].perSecond);

    const lite = calculateVideoCost("bytedance/seedance-1-lite", 5);
    expect(lite).toBeCloseTo(5 * VIDEO_PRICING["bytedance/seedance-1-lite"].perSecond);
  });

  it("falls back to default for unknown model", () => {
    const cost = calculateVideoCost("unknown-video", 8);
    const defaultCost = calculateVideoCost("veo-3.1-generate-preview", 8);
    expect(cost).toBeCloseTo(defaultCost);
  });

  it("returns 0 for 0 duration", () => {
    expect(calculateVideoCost("veo-3.1-generate-preview", 0)).toBe(0);
  });
});
