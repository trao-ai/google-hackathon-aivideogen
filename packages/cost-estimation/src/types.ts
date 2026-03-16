export interface SceneEstimate {
  sceneId: string;
  framesCost: number;
  videoCost: number;
  motionEnrichmentCost: number;
  validationCost: number;
  totalCost: number;
}

export interface CostEstimate {
  frames: number;
  videos: number;
  motionEnrichment: number;
  validation: number;
  tts: number;
  sfx: number;
  total: number;
  perScene?: number;
  sceneBreakdown?: SceneEstimate[];
}
