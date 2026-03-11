export type ProjectStatus =
  | "draft"
  | "topic_discovery"
  | "topic_selected"
  | "researching"
  | "research_ready"
  | "scripting"
  | "script_selected"
  | "voicing"
  | "voice_ready"
  | "scene_planning"
  | "frame_generation"
  | "animation_generation"
  | "composition"
  | "review"
  | "complete"
  | "topic_failed"
  | "research_failed"
  | "script_failed"
  | "tts_failed"
  | "frame_failed"
  | "animation_failed"
  | "composition_failed";

export interface Project {
  id: string;
  title: string;
  niche: string;
  status: ProjectStatus;
  selectedTopicId?: string;
  selectedScriptId?: string;
  styleBibleId: string;
  targetRuntimeSec: number;
  totalCostUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  title: string;
  niche: string;
  targetRuntimeSec?: number;
}

export interface UpdateProjectInput {
  title?: string;
  niche?: string;
  status?: ProjectStatus;
  selectedTopicId?: string;
  selectedScriptId?: string;
}
