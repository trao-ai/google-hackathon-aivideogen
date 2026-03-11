export type CostStage =
  | "topic_discovery"
  | "research"
  | "script"
  | "tts"
  | "scene_planning"
  | "image_generation"
  | "video_generation"
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
