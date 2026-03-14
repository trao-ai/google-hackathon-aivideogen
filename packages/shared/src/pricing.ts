/**
 * Centralized pricing configuration for all AI providers.
 * Single source of truth — no provider file should contain pricing constants.
 */

export interface LLMPricing {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
}

export interface TTSPricing {
  perCharacter: number;
}

export interface ImagePricing {
  perImage: number;
}

export interface VideoPricing {
  perSecond: number;
}

export const LLM_PRICING: Record<string, LLMPricing> = {
  "gpt-4o": { inputPer1kTokens: 0.005, outputPer1kTokens: 0.015 },
  "gpt-4o-mini": { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
  "gpt-4-turbo": { inputPer1kTokens: 0.01, outputPer1kTokens: 0.03 },
  "gpt-3.5-turbo": { inputPer1kTokens: 0.0005, outputPer1kTokens: 0.0015 },
  "gemini-2.5-flash": { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.00035 },
};

export const TTS_PRICING: Record<string, TTSPricing> = {
  eleven_multilingual_v2: { perCharacter: 0.0003 }, // $0.30 per 1000 chars
  eleven_turbo_v2_5: { perCharacter: 0.0002 },
};

export const IMAGE_PRICING: Record<string, ImagePricing> = {
  "imagen-4.0-fast-generate-001": { perImage: 0.04 },
  "gemini-3-pro-image-preview": { perImage: 0.04 },
};

export const VIDEO_PRICING: Record<string, VideoPricing> = {
  "veo-3.1-generate-preview": { perSecond: 0.35 },
  // Kling via fal.ai — $0.07/sec without audio, $0.14/sec with audio
  "fal-ai/kling-video/v2.6/pro/image-to-video": { perSecond: 0.07 },
  "fal-ai/kling-video/o3/standard/image-to-video": { perSecond: 0.07 },
  // SeDance via fal.ai — same pricing as Kling
  "fal-ai/bytedance/seedance/v1.5/pro/image-to-video": { perSecond: 0.07 },
  // Replicate-hosted models
  "google/veo-2": { perSecond: 0.065 },
  "kwaivgi/kling-v2.1": { perSecond: 0.06 },
  "bytedance/seedance-1-pro": { perSecond: 0.05 },
  "bytedance/seedance-1-lite": { perSecond: 0.02 },
};

const DEFAULT_LLM_MODEL = "gpt-4o";
const DEFAULT_TTS_MODEL = "eleven_multilingual_v2";
const DEFAULT_IMAGE_MODEL = "imagen-4.0-fast-generate-001";
const DEFAULT_VIDEO_MODEL = "fal-ai/kling-video/v2.6/pro/image-to-video";

export function calculateLLMCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = LLM_PRICING[model] ?? LLM_PRICING[DEFAULT_LLM_MODEL];
  console.log("LLM pricing:", pricing);
  return (
    (inputTokens / 1000) * pricing.inputPer1kTokens +
    (outputTokens / 1000) * pricing.outputPer1kTokens
  );
}

export function calculateTTSCost(
  model: string,
  characterCount: number,
): number {
  const pricing = TTS_PRICING[model] ?? TTS_PRICING[DEFAULT_TTS_MODEL];
  console.log("TTS pricing:", pricing);
  return characterCount * pricing.perCharacter;
}

export function calculateImageCost(model: string, imageCount: number): number {
  const pricing = IMAGE_PRICING[model] ?? IMAGE_PRICING[DEFAULT_IMAGE_MODEL];
  console.log("Image pricing:", pricing);
  return imageCount * pricing.perImage;
}

export function calculateVideoCost(
  model: string,
  durationSeconds: number,
): number {
  const pricing = VIDEO_PRICING[model] ?? VIDEO_PRICING[DEFAULT_VIDEO_MODEL];
  console.log("Video pricing:", pricing);
  return durationSeconds * pricing.perSecond;
}
