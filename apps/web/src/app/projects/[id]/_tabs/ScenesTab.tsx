"use client";

import type { ProjectDetail, Scene } from "@/lib/api";
import { useProjectStore } from "@/stores/project-store";
import { SceneFlowEditor } from "./scene-flow/SceneFlowEditor";

interface Props {
  project: ProjectDetail;
}

export function ScenesTab({ project }: Props) {
  const { videoProvider } = useProjectStore();

  const scenes: Scene[] = project.scenes ?? [];
  const isPlanning = project.status === "planning_scenes";

  const totalScenes = scenes.length;
  const framesDone = scenes.filter((s) => s.frameStatus === "done").length;
  const framesGenerating = scenes.filter(
    (s) => s.frameStatus === "generating",
  ).length;
  const clipsDone = scenes.filter((s) => s.clipStatus === "done").length;
  const clipsGenerating = scenes.filter(
    (s) => s.clipStatus === "generating",
  ).length;
  const clipsFailed = scenes.filter((s) => s.clipStatus === "failed").length;
  const isGeneratingFrames =
    project.status === "frame_generation" || framesGenerating > 0;
  const isGeneratingVideos = project.status === "video_generation";
  const showVideoProgress = isGeneratingVideos || clipsGenerating > 0;

  return (
    <div className="space-y-4">
      {isGeneratingFrames && totalScenes > 0 && (
        <div className="rounded-xl bg-brand-surface px-4 py-3 border border-brand-border-light">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-medium text-foreground">
              Generating Frames
            </h3>
            <span className="text-sm font-medium text-foreground">
              {Math.round((framesDone / totalScenes) * 100)}%
            </span>
          </div>
          <div className="text-sm text-foreground/60 mb-2">
            {framesDone}/{totalScenes} done
            {framesGenerating > 0 && ` (${framesGenerating} in progress)`}
          </div>
          <div className="h-2 rounded-full bg-brand-border-light mb-2">
            <div
              className="h-full rounded-full bg-brand-black transition-all"
              style={{ width: `${(framesDone / totalScenes) * 100}%` }}
            />
          </div>
        </div>
      )}

      {showVideoProgress && totalScenes > 0 && (
        <div className="rounded-xl bg-brand-surface px-4 py-3 border border-brand-border-light">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-medium text-foreground">
              Generating Videos
            </h3>
            <span className="text-sm font-medium text-foreground">
              {Math.round((clipsDone / totalScenes) * 100)}%
            </span>
          </div>
          <div className="text-sm text-foreground/60 mb-2">
            {clipsDone}/{totalScenes} done
            {clipsGenerating > 0 && ` (${clipsGenerating} in progress)`}
            {clipsFailed > 0 && ` (${clipsFailed} failed)`}
          </div>
          <div className="h-2 rounded-full bg-brand-border-light">
            <div
              className="h-full rounded-full bg-brand-teal transition-all"
              style={{ width: `${(clipsDone / totalScenes) * 100}%` }}
            />
          </div>
        </div>
      )}

      {scenes.length === 0 && !isPlanning && (
        <p className="text-sm text-gray-500">No scenes yet.</p>
      )}

      {scenes.length > 0 && (
        <SceneFlowEditor
          projectId={project.id}
          scenes={scenes}
          videoProvider={videoProvider}
          platform={project.platform}
        />
      )}
    </div>
  );
}
