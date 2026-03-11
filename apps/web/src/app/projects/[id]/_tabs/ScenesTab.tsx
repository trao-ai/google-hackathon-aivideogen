"use client";

import { useState } from "react";
import Image from "next/image";
import { api, type ProjectDetail, type Scene } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

interface Props {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
}

export function ScenesTab({ project, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scenes: Scene[] = project.scenes ?? [];
  const isPlanning = project.status === "planning_scenes";
  const hasVoiceover = !!project.selectedVoiceoverId;
  const hasFrames = scenes.some((s) => (s.frames ?? []).length > 0);

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

  const handleRegenerateScene = async (sceneId: string) => {
    setLoading(true);
    try {
      await api.scenes.regenerate(project.id, sceneId);
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
            {isPlanning ? "Planning…" : "Plan Scenes"}
          </Button>
          {scenes.length > 0 && (
            <Button
              onClick={handleGenerateFrames}
              disabled={loading || project.status === "generating_frames"}
            >
              {project.status === "generating_frames"
                ? "Generating…"
                : "Generate Frames"}
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

      <div className="grid gap-4 sm:grid-cols-2">
        {scenes.map((scene) => {
          const startFrame = (scene.frames ?? []).find(
            (f) => f.frameType === "start",
          );
          const endFrame = (scene.frames ?? []).find(
            (f) => f.frameType === "end",
          );
          return (
            <Card key={scene.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {scene.order + 1}. {scene.title}
                    </CardTitle>
                    <p className="text-xs text-gray-500">
                      {scene.type} · {formatDuration(scene.startSec)} →{" "}
                      {formatDuration(scene.endSec)} (
                      {scene.durationSec.toFixed(1)}s)
                    </p>
                  </div>
                  <button
                    onClick={() => handleRegenerateScene(scene.id)}
                    disabled={loading}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Regen
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <p className="text-xs text-gray-600 leading-relaxed">
                  {scene.visualDescription}
                </p>
                {(startFrame || endFrame) && (
                  <div className="flex gap-2">
                    {startFrame && (
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">
                          Start frame
                        </p>
                        <div className="relative aspect-video w-full overflow-hidden rounded bg-gray-100">
                          <Image
                            src={startFrame.imageUrl}
                            alt="Start frame"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}
                    {endFrame && (
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">End frame</p>
                        <div className="relative aspect-video w-full overflow-hidden rounded bg-gray-100">
                          <Image
                            src={endFrame.imageUrl}
                            alt="End frame"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
