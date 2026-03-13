export type VideoProviderType =
  | "veo"
  | "kling"
  | "seedance"
  | "replicate-veo"
  | "replicate-kling"
  | "replicate-seedance"
  | "replicate-seedance-lite";

export type CostStage =
  | "topic_discovery"
  | "research"
  | "script"
  | "tts"
  | "scene_planning"
  | "image_generation"
  | "frame_regeneration"
  | "frame_validation"
  | "video_generation"
  | "video_fallback"
  | "motion_enrichment"
  | "transition_planning"
  | "render"
  | "storage"
  | "channel_analysis";

export interface CostEvent {
  id: string;
  projectId: string;
  stage: CostStage;
  vendor: string;
  units: number;
  unitCost: number;
  totalCostUsd: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CostSummary {
  projectId: string;
  totalCostUsd: number;
  breakdown: Record<CostStage, number>;
  costPerFinishedMinute?: number;
  costPerScene?: number;
}
