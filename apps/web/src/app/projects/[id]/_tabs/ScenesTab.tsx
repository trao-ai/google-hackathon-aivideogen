"use client";

import { useState } from "react";
import type { ProjectDetail, Scene } from "@/lib/api";
import { usePlanScenes, useGenerateFrames, useGenerateAllVideos } from "@/hooks/use-scenes";
import { useProjectStore } from "@/stores/project-store";
import { Button } from "@/components/ui/button";
import { SceneFlowEditor } from "./scene-flow/SceneFlowEditor";
import { VideoModelSelector } from "./scene-flow/components/VideoModelSelector";
import { TransitionPlanPanel } from "./scene-flow/components/TransitionPlanPanel";

interface Props {
  project: ProjectDetail;
}

export function ScenesTab({ project }: Props) {
  const [error, setError] = useState("");
  const { videoProvider } = useProjectStore();
  const planScenes = usePlanScenes(project.id);
  const generateFrames = useGenerateFrames(project.id);
  const generateAllVideos = useGenerateAllVideos(project.id);

  const scenes: Scene[] = project.scenes ?? [];
  const isPlanning = project.status === "planning_scenes";
  const hasVoiceover = (project.voiceovers ?? []).length > 0;
  const hasFrames = scenes.some((s) => (s.frames ?? []).length > 0);
  const isGeneratingVideos = project.status === "video_generation";

  const totalScenes = scenes.length;
  const framesDone = scenes.filter((s) => s.frameStatus === "done").length;
  const framesGenerating = scenes.filter((s) => s.frameStatus === "generating").length;
  const clipsDone = scenes.filter((s) => s.clipStatus === "done").length;
  const clipsGenerating = scenes.filter((s) => s.clipStatus === "generating").length;
  const clipsFailed = scenes.filter((s) => s.clipStatus === "failed").length;
  const isGeneratingFrames = project.status === "frame_generation" || framesGenerating > 0;
  const showVideoProgress = isGeneratingVideos || clipsGenerating > 0;

  const loading = planScenes.isPending || generateFrames.isPending || generateAllVideos.isPending;

  const handlePlanScenes = () => {
    setError("");
    planScenes.mutate(undefined, {
      onError: (err) => setError(err.message),
    });
  };

  const handleGenerateFrames = () => {
    setError("");
    generateFrames.mutate(undefined, {
      onError: (err) => setError(err.message),
    });
  };

  const handleGenerateAllVideos = () => {
    setError("");
    generateAllVideos.mutate(undefined, {
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Scenes {scenes.length > 0 && `(${scenes.length})`}
        </h2>
        <div className="flex items-center gap-2">
          <VideoModelSelector
            projectId={project.id}
            disabled={loading || isGeneratingFrames || isGeneratingVideos}
          />
          <Button
            variant="outline"
            onClick={handlePlanScenes}
            disabled={loading || isPlanning || !hasVoiceover}
            title={!hasVoiceover ? "Generate voiceover first" : undefined}
          >
            {isPlanning ? "Planning\u2026" : "Plan Scenes"}
          </Button>
          {scenes.length > 0 && (
            <Button
              variant="outline"
              onClick={handleGenerateFrames}
              disabled={loading || project.status === "generating_frames"}
            >
              {project.status === "generating_frames"
                ? "Generating\u2026"
                : "Generate Frames"}
            </Button>
          )}
          {hasFrames && (
            <Button
              onClick={handleGenerateAllVideos}
              disabled={loading || isGeneratingVideos}
            >
              {isGeneratingVideos
                ? "Generating Videos\u2026"
                : "Generate All Videos"}
            </Button>
          )}
        </div>
      </div>

      {!hasVoiceover && (
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Generate voiceover before planning scenes.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isGeneratingFrames && totalScenes > 0 && (
        <div className="rounded-md bg-blue-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-blue-800">
            <span>
              Generating frames: {framesDone}/{totalScenes} done
              {framesGenerating > 0 && ` (${framesGenerating} in progress)`}
            </span>
            <span>{Math.round((framesDone / totalScenes) * 100)}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-blue-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${(framesDone / totalScenes) * 100}%` }}
            />
          </div>
        </div>
      )}

      {showVideoProgress && totalScenes > 0 && (
        <div className="rounded-md bg-indigo-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-indigo-800">
            <span>
              Generating videos: {clipsDone}/{totalScenes} done
              {clipsGenerating > 0 && ` (${clipsGenerating} in progress)`}
              {clipsFailed > 0 && ` (${clipsFailed} failed)`}
            </span>
            <span>{Math.round((clipsDone / totalScenes) * 100)}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-indigo-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
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
        />
      )}

      {scenes.length >= 2 && (
        <TransitionPlanPanel
          projectId={project.id}
          scenes={scenes}
        />
      )}
    </div>
  );
}
