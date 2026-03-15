import {
  calculateImageCost,
  calculateVideoCost,
  calculateLLMCost,
  type VideoProviderType,
} from "@atlas/shared";

interface Scene {
  id: string;
  narrationStartSec: number;
  narrationEndSec: number;
  motionNotes?: string | null;
}

// Map provider name → Replicate/fal model ID for pricing lookup
const MODEL_ID_MAP: Record<VideoProviderType, string> = {
  kling: "fal-ai/kling-video/o3/standard/image-to-video",
  veo: "veo-3.1-generate-preview",
  seedance: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
  "replicate-veo": "google/veo-3.1",
  "replicate-kling": "kwaivgi/kling-v2.1",
  "replicate-seedance": "bytedance/seedance-1-pro",
  "replicate-seedance-lite": "bytedance/seedance-1-lite",
};

// Providers that always produce a fixed-duration clip
const FIXED_DURATION_PROVIDERS = new Set<VideoProviderType>([
  "veo",
  "replicate-veo",
]);
const FIXED_DURATION_SEC = 8;

export class CostEstimator {
  /**
   * Estimate frame generation costs
   * Each scene has 2 frames (start + end)
   */
  static estimateFrameGeneration(sceneCount: number): number {
    const imageCount = sceneCount * 2;
    const model = "gemini-3-pro-image-preview";
    return calculateImageCost(model, imageCount);
  }

  /**
   * Estimate frame validation costs
   * Uses Gemini Vision to score quality and style
   * ~500 input tokens + ~200 output tokens per frame
   */
  static estimateFrameValidation(sceneCount: number): number {
    const framesCount = sceneCount * 2;
    const inputTokensPerFrame = 500;
    const outputTokensPerFrame = 200;
    const model = "gemini-2.5-flash";

    const totalInputTokens = framesCount * inputTokensPerFrame;
    const totalOutputTokens = framesCount * outputTokensPerFrame;

    return calculateLLMCost(model, totalInputTokens, totalOutputTokens);
  }

  /**
   * Estimate motion enrichment costs
   * Uses Gemini to expand motion notes to 3-5 sentences
   * ~200 input tokens + ~100 output tokens per scene
   */
  static estimateMotionEnrichment(sceneCount: number): number {
    const inputTokensPerScene = 200;
    const outputTokensPerScene = 100;
    const model = "gemini-2.5-flash";

    const totalInputTokens = sceneCount * inputTokensPerScene;
    const totalOutputTokens = sceneCount * outputTokensPerScene;

    return calculateLLMCost(model, totalInputTokens, totalOutputTokens);
  }

  /**
   * Estimate video generation costs
   * Duration-based pricing for any supported provider
   */
  static estimateVideoGeneration(
    scenes: Scene[],
    provider: VideoProviderType = "kling"
  ): number {
    let totalCost = 0;

    const modelId = MODEL_ID_MAP[provider] ?? MODEL_ID_MAP.kling;
    const isFixed = FIXED_DURATION_PROVIDERS.has(provider);

    for (const scene of scenes) {
      if (isFixed) {
        totalCost += calculateVideoCost(modelId, FIXED_DURATION_SEC);
      } else {
        const sceneNarrationDuration =
          scene.narrationEndSec - scene.narrationStartSec;
        const clipDuration = sceneNarrationDuration >= 8 ? 10 : 5;
        totalCost += calculateVideoCost(modelId, clipDuration);
      }
    }

    return totalCost;
  }

  /**
   * Estimate full project costs
   */
  static estimateProject(params: {
    sceneCount: number;
    avgSceneDuration?: number;
    provider?: VideoProviderType;
  }): {
    frames: number;
    videos: number;
    motionEnrichment: number;
    validation: number;
    total: number;
  } {
    const { sceneCount, avgSceneDuration = 8, provider = "kling" } = params;

    // Create mock scenes for video cost estimation
    const mockScenes: Scene[] = Array.from({ length: sceneCount }, (_, i) => ({
      id: `mock-${i}`,
      narrationStartSec: i * avgSceneDuration,
      narrationEndSec: (i + 1) * avgSceneDuration,
      motionNotes: "",
    }));

    const frames = this.estimateFrameGeneration(sceneCount);
    const videos = this.estimateVideoGeneration(mockScenes, provider);
    const motionEnrichment = this.estimateMotionEnrichment(sceneCount);
    const validation = this.estimateFrameValidation(sceneCount);

    return {
      frames,
      videos,
      motionEnrichment,
      validation,
      total: frames + videos + motionEnrichment + validation,
    };
  }

  /**
   * Estimate costs for actual scenes (more accurate than project estimate)
   */
  static estimateScenes(
    scenes: Scene[],
    provider: VideoProviderType = "kling"
  ): {
    frames: number;
    videos: number;
    motionEnrichment: number;
    validation: number;
    total: number;
    perScene: number;
  } {
    const sceneCount = scenes.length;

    const frames = this.estimateFrameGeneration(sceneCount);
    const videos = this.estimateVideoGeneration(scenes, provider);
    const motionEnrichment = this.estimateMotionEnrichment(sceneCount);
    const validation = this.estimateFrameValidation(sceneCount);

    const total = frames + videos + motionEnrichment + validation;

    return {
      frames,
      videos,
      motionEnrichment,
      validation,
      total,
      perScene: sceneCount > 0 ? total / sceneCount : 0,
    };
  }
}
