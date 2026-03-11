"use client";

import { useState } from "react";
import { api, type ProjectDetail, type Scene } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { SceneFlowEditor } from "./scene-flow/SceneFlowEditor";

interface Props {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
}

export function ScenesTab({ project, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scenes: Scene[] = project.scenes ?? [];
  const isPlanning = project.status === "planning_scenes";
  const hasVoiceover = (project.voiceovers ?? []).length > 0;
  const hasFrames = scenes.some((s) => (s.frames ?? []).length > 0);
  const isGeneratingVideos = project.status === "video_generation";

  const handlePlanScenes = async () => {
    setError("");
    setLoading(true);
    try {
      await api.scenes.plan(project.id);
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFrames = async () => {
    setError("");
    setLoading(true);
    try {
      await api.frames.generate(project.id);
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAllVideos = async () => {
    setError("");
    setLoading(true);
    try {
      await api.scenes.generateAllVideos(project.id);
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Scenes {scenes.length > 0 && `(${scenes.length})`}
        </h2>
        <div className="flex gap-2">
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

      {scenes.length === 0 && !isPlanning && (
        <p className="text-sm text-gray-500">No scenes yet.</p>
      )}

      {scenes.length > 0 && (
        <SceneFlowEditor
          projectId={project.id}
          scenes={scenes}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
