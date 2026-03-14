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
  // Google Gemini — ai.google.dev/gemini-api/docs/pricing (Mar 2026)
  "gemini-2.5-flash": { inputPer1kTokens: 0.0003, outputPer1kTokens: 0.0025 },
};

export const TTS_PRICING: Record<string, TTSPricing> = {
  // ElevenLabs — elevenlabs.io/pricing/api (usage-based tier, ~$0.20-0.30/1K chars)
  eleven_multilingual_v2: { perCharacter: 0.0003 },
  eleven_turbo_v2_5: { perCharacter: 0.0002 },
};

export const IMAGE_PRICING: Record<string, ImagePricing> = {
  // Google Imagen 4 — ai.google.dev/gemini-api/docs/pricing (Mar 2026)
  "imagen-4.0-fast-generate-001": { perImage: 0.02 },   // Imagen 4 Fast
  "gemini-3-pro-image-preview": { perImage: 0.04 },     // Gemini image generation
};

export const VIDEO_PRICING: Record<string, VideoPricing> = {
  // Google Veo 3.1 Standard 720p — ai.google.dev/gemini-api/docs/pricing (Mar 2026)
  "veo-3.1-generate-preview": { perSecond: 0.40 },
  // Kling 2.6 Pro via fal.ai — fal.ai/models (no audio $0.07, with audio $0.14)
  "fal-ai/kling-video/v2.6/pro/image-to-video": { perSecond: 0.07 },
  "fal-ai/kling-video/o3/standard/image-to-video": { perSecond: 0.07 },
  // SeDance 1.5 via fal.ai
  "fal-ai/bytedance/seedance/v1.5/pro/image-to-video": { perSecond: 0.052 },
  // Replicate-hosted models — replicate.com (Mar 2026)
  "google/veo-3.1": { perSecond: 0.10 },
  "kwaivgi/kling-v2.1": { perSecond: 0.05 },
  "bytedance/seedance-1.5-pro": { perSecond: 0.247 },
  "bytedance/seedance-1-lite": { perSecond: 0.02 },
};

const DEFAULT_LLM_MODEL = "gemini-2.5-flash";
const DEFAULT_TTS_MODEL = "eleven_multilingual_v2";
const DEFAULT_IMAGE_MODEL = "imagen-4.0-fast-generate-001";
const DEFAULT_VIDEO_MODEL = "veo-3.1-generate-preview";

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
