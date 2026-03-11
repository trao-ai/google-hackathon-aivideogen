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

export const LLM_PRICING: Record<string, LLMPricing> = {
  "gpt-4o": { inputPer1kTokens: 0.005, outputPer1kTokens: 0.015 },
  "gpt-4o-mini": { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
  "gpt-4-turbo": { inputPer1kTokens: 0.01, outputPer1kTokens: 0.03 },
  "gpt-3.5-turbo": { inputPer1kTokens: 0.0005, outputPer1kTokens: 0.0015 },
};

export const TTS_PRICING: Record<string, TTSPricing> = {
  eleven_multilingual_v2: { perCharacter: 0.0003 }, // $0.30 per 1000 chars
  eleven_turbo_v2_5: { perCharacter: 0.0002 },
};

export const IMAGE_PRICING: Record<string, ImagePricing> = {
  "imagen-4.0-fast-generate-001": { perImage: 0.04 },
};

const DEFAULT_LLM_MODEL = "gpt-4o";
const DEFAULT_TTS_MODEL = "eleven_multilingual_v2";
const DEFAULT_IMAGE_MODEL = "imagen-4.0-fast-generate-001";

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
