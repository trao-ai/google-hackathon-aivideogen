import { styleBibleToPromptSummary, getStylePrefix, getPaletteString } from "../index";
import type { StyleBible } from "@atlas/shared";

const mockStyleBible: StyleBible = {
  id: "test-1",
  name: "Test Style",
  version: "1.0",
  visualMission: "Make complex topics visually stunning",
  emotionalTone: "curious and playful",
  narrativeStance: "omniscient narrator",
  palette: {
    primary: ["#1a1a2e", "#16213e"],
    accent: ["#e94560", "#0f3460"],
    backgroundModes: {
      clean_light: ["#f5f5f5", "#e8e8e8"],
      dramatic_dark: ["#0d1117", "#161b22"],
    },
  },
  characterRules: {
    silhouette: "rounded and compact",
    proportions: "2:3 head to body",
    eyes: "large expressive white circles",
    hands: "simple 3-finger mittens",
    expressionStyle: "eyes only, no mouth",
    forbidden: ["realistic hands", "open mouths"],
  },
  lineWeights: "2px base, 3px emphasis",
  textureRules: "smooth gradients only",
  shadowRules: "soft drop shadows, 15% opacity",
  backgroundDensity: "medium",
  motionRules: "smooth ease-in-out, 500ms transitions",
  bubbleRules: "rounded rectangles, no tails",
  negativePrompts: ["text", "watermark", "realistic"],
  promptPrimitives: {
    style_prefix: "Kurzgesagt-style cinematic illustration",
    character_prefix: "rounded character with expressive eyes",
    scene_suffix: "atmospheric depth and particle effects",
  },
  createdAt: "2024-01-01T00:00:00Z",
};

describe("styleBibleToPromptSummary", () => {
  it("includes visual mission and tones", () => {
    const summary = styleBibleToPromptSummary(mockStyleBible);
    expect(summary).toContain("Make complex topics visually stunning");
    expect(summary).toContain("curious and playful");
    expect(summary).toContain("omniscient narrator");
  });

  it("includes palette colors", () => {
    const summary = styleBibleToPromptSummary(mockStyleBible);
    expect(summary).toContain("#1a1a2e, #16213e");
    expect(summary).toContain("#e94560, #0f3460");
  });

  it("includes character rules", () => {
    const summary = styleBibleToPromptSummary(mockStyleBible);
    expect(summary).toContain("rounded and compact");
    expect(summary).toContain("2:3 head to body");
    expect(summary).toContain("large expressive white circles");
    expect(summary).toContain("simple 3-finger mittens");
    expect(summary).toContain("eyes only, no mouth");
  });

  it("includes art direction", () => {
    const summary = styleBibleToPromptSummary(mockStyleBible);
    expect(summary).toContain("2px base, 3px emphasis");
    expect(summary).toContain("medium");
    expect(summary).toContain("soft drop shadows");
  });

  it("includes motion and bubble rules", () => {
    const summary = styleBibleToPromptSummary(mockStyleBible);
    expect(summary).toContain("smooth ease-in-out");
    expect(summary).toContain("rounded rectangles");
  });

  it("includes negative prompts", () => {
    const summary = styleBibleToPromptSummary(mockStyleBible);
    expect(summary).toContain("text, watermark, realistic");
  });
});

describe("getStylePrefix", () => {
  it("concatenates style_prefix, character_prefix, and scene_suffix", () => {
    const prefix = getStylePrefix(mockStyleBible);
    expect(prefix).toContain("Kurzgesagt-style cinematic illustration");
    expect(prefix).toContain("rounded character with expressive eyes");
    expect(prefix).toContain("atmospheric depth and particle effects");
  });

  it("handles missing primitives gracefully", () => {
    const bible: StyleBible = {
      ...mockStyleBible,
      promptPrimitives: { style_prefix: "only style" },
    };
    const prefix = getStylePrefix(bible);
    expect(prefix).toBe("only style");
  });

  it("handles empty primitives", () => {
    const bible: StyleBible = {
      ...mockStyleBible,
      promptPrimitives: {},
    };
    const prefix = getStylePrefix(bible);
    expect(prefix).toBe("");
  });
});

describe("getPaletteString", () => {
  it("returns clean_light mode by default", () => {
    const palette = getPaletteString(mockStyleBible);
    expect(palette).toContain("#f5f5f5, #e8e8e8");
    expect(palette).toContain("#e94560, #0f3460");
  });

  it("returns dramatic_dark mode when specified", () => {
    const palette = getPaletteString(mockStyleBible, "dramatic_dark");
    expect(palette).toContain("#0d1117, #161b22");
    expect(palette).toContain("#e94560, #0f3460");
  });
});
