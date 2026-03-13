export interface VideoGenerationOptions {
  prompt: string;
  startFrameBase64: string;
  endFrameBase64?: string;
  durationSec?: number;
  motionNotes?: string;
}

export interface VideoGenerationResult {
  videoBuffer: Buffer;
  mimeType: string;
  durationSec: number;
  costUsd: number;
  model: string;
}

export interface LayerInfo {
  type: "foreground" | "background" | "middle";
  description: string;
  motionSpeed: number; // 0.5 = slower, 1.0 = normal, 1.5 = faster
}
