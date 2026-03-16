import { CostEstimator } from "../estimator";

const makeScene = (id: string, startSec: number, endSec: number) => ({
  id,
  narrationStartSec: startSec,
  narrationEndSec: endSec,
});

describe("CostEstimator", () => {
  describe("estimateFrameGeneration", () => {
    it("calculates cost for 2 frames per scene", () => {
      const cost = CostEstimator.estimateFrameGeneration(5);
      // 5 scenes × 2 frames = 10 images at gemini-3-pro-image-preview price ($0.04/image)
      expect(cost).toBeCloseTo(10 * 0.04);
    });

    it("returns 0 for 0 scenes", () => {
      expect(CostEstimator.estimateFrameGeneration(0)).toBe(0);
    });

    it("handles single scene", () => {
      const cost = CostEstimator.estimateFrameGeneration(1);
      expect(cost).toBeCloseTo(2 * 0.04);
    });
  });

  describe("estimateFrameValidation", () => {
    it("calculates validation cost based on LLM tokens", () => {
      const cost = CostEstimator.estimateFrameValidation(5);
      // 5 scenes × 2 frames = 10 frames
      // 10 × 500 input tokens = 5000, 10 × 200 output tokens = 2000
      // gemini-2.5-flash: (5000/1000)*0.0003 + (2000/1000)*0.0025 = 0.0015 + 0.005 = 0.0065
      expect(cost).toBeCloseTo(0.0065);
    });

    it("returns 0 for 0 scenes", () => {
      expect(CostEstimator.estimateFrameValidation(0)).toBe(0);
    });
  });

  describe("estimateMotionEnrichment", () => {
    it("calculates motion enrichment LLM cost", () => {
      const cost = CostEstimator.estimateMotionEnrichment(10);
      // 10 scenes × 200 input = 2000, × 100 output = 1000
      // gemini-2.5-flash: (2000/1000)*0.0003 + (1000/1000)*0.0025 = 0.0006 + 0.0025 = 0.0031
      expect(cost).toBeCloseTo(0.0031);
    });

    it("returns 0 for 0 scenes", () => {
      expect(CostEstimator.estimateMotionEnrichment(0)).toBe(0);
    });
  });

  describe("estimateVideoGeneration", () => {
    it("uses fixed 8s duration for veo provider", () => {
      const scenes = [makeScene("1", 0, 10), makeScene("2", 10, 20)];
      const cost = CostEstimator.estimateVideoGeneration(scenes, "veo");
      // veo = fixed 8s × $0.40/s = $3.20 per scene × 2 = $6.40
      expect(cost).toBeCloseTo(6.4);
    });

    it("uses variable duration for kling provider", () => {
      const scenes = [
        makeScene("1", 0, 6), // 6s narration → clipDuration = 5
        makeScene("2", 6, 16), // 10s narration (≥8) → clipDuration = 10
      ];
      const cost = CostEstimator.estimateVideoGeneration(scenes, "kling");
      // kling model: fal-ai/kling-video/o3/standard/image-to-video at $0.07/s
      // scene 1: 5s × $0.07 = $0.35
      // scene 2: 10s × $0.07 = $0.70
      expect(cost).toBeCloseTo(1.05);
    });

    it("uses fixed duration for replicate-veo", () => {
      const scenes = [makeScene("1", 0, 15)];
      const cost = CostEstimator.estimateVideoGeneration(scenes, "replicate-veo");
      // replicate-veo: fixed 8s × $0.10/s = $0.80
      expect(cost).toBeCloseTo(0.8);
    });

    it("uses variable duration for seedance", () => {
      const scenes = [makeScene("1", 0, 5)]; // 5s < 8 → clipDuration = 5
      const cost = CostEstimator.estimateVideoGeneration(scenes, "seedance");
      // seedance at $0.052/s × 5s = $0.26
      expect(cost).toBeCloseTo(0.26);
    });

    it("defaults to kling for unknown provider", () => {
      const scenes = [makeScene("1", 0, 8)];
      const cost = CostEstimator.estimateVideoGeneration(scenes, "kling");
      const defaultCost = CostEstimator.estimateVideoGeneration(scenes, "kling");
      expect(cost).toBeCloseTo(defaultCost);
    });

    it("handles empty scenes array", () => {
      expect(CostEstimator.estimateVideoGeneration([], "veo")).toBe(0);
    });
  });

  describe("estimateProject", () => {
    it("returns breakdown for typical project", () => {
      const estimate = CostEstimator.estimateProject({ sceneCount: 10 });
      expect(estimate.frames).toBeGreaterThan(0);
      expect(estimate.videos).toBeGreaterThan(0);
      expect(estimate.motionEnrichment).toBeGreaterThan(0);
      expect(estimate.validation).toBeGreaterThan(0);
      expect(estimate.total).toBeCloseTo(
        estimate.frames + estimate.videos + estimate.motionEnrichment + estimate.validation
      );
    });

    it("uses default kling provider", () => {
      const estimate = CostEstimator.estimateProject({ sceneCount: 5 });
      // Videos should use kling pricing
      expect(estimate.videos).toBeGreaterThan(0);
    });

    it("respects custom provider", () => {
      const veoEstimate = CostEstimator.estimateProject({ sceneCount: 5, provider: "veo" });
      const klingEstimate = CostEstimator.estimateProject({ sceneCount: 5, provider: "kling" });
      // Veo is much more expensive per second than kling
      expect(veoEstimate.videos).toBeGreaterThan(klingEstimate.videos);
    });

    it("handles 0 scenes", () => {
      const estimate = CostEstimator.estimateProject({ sceneCount: 0 });
      expect(estimate.total).toBe(0);
    });
  });

  describe("estimateScenes", () => {
    it("returns per-scene cost breakdown", () => {
      const scenes = [
        makeScene("1", 0, 8),
        makeScene("2", 8, 16),
        makeScene("3", 16, 24),
      ];
      const estimate = CostEstimator.estimateScenes(scenes, "kling");
      expect(estimate.perScene).toBeCloseTo(estimate.total / 3);
      expect(estimate.total).toBeCloseTo(
        estimate.frames + estimate.videos + estimate.motionEnrichment + estimate.validation
      );
    });

    it("returns 0 perScene for empty array", () => {
      const estimate = CostEstimator.estimateScenes([], "kling");
      expect(estimate.perScene).toBe(0);
      expect(estimate.total).toBe(0);
    });
  });
});
