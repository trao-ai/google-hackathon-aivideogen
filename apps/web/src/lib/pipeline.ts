import type { PipelineStep } from "@/types/components";

const STATUS_TO_STEP: Record<string, PipelineStep> = {
  draft: "topic",
  topic_discovery: "topic",
  topic_selected: "research",
  topic_approved: "research",
  researching: "research",
  research_done: "script",
  scripting: "script",
  script_selected: "voice",
  script_done: "voice",
  voicing: "voice",
  voice_generating: "voice",
  voice_done: "scenes",
  scene_planning: "scenes",
  frame_generation: "scenes",
  frames_generating: "scenes",
  frames_done: "scenes",
  video_generation: "scenes",
  videos_generating: "scenes",
  videos_done: "export",
  rendering: "export",
  complete: "export",
};

const STEP_ORDER: PipelineStep[] = ["topic", "cost", "research", "script", "voice", "scenes", "export"];

export function getProjectStep(status: string): PipelineStep {
  return STATUS_TO_STEP[status] ?? "topic";
}

export function getCompletedSteps(status: string): number {
  const step = getProjectStep(status);
  const idx = STEP_ORDER.indexOf(step);
  if (status === "complete") return 7;
  return Math.max(idx, 0);
}

export function getProjectCardStatus(status: string): "in_progress" | "completed" | "draft" | "failed" {
  if (status === "complete") return "completed";
  if (status === "draft") return "draft";
  if (status.includes("failed")) return "failed";
  return "in_progress";
}
