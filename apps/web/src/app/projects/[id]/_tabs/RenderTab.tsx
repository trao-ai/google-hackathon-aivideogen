"use client";

import { useState } from "react";
import type { ProjectDetail } from "@/lib/api";
import { useRenders, useStartRender } from "@/hooks/use-renders";
import { Button } from "@/components/ui/button";
import { formatDuration, formatCost } from "@/lib/utils";

interface Props {
  project: ProjectDetail;
}

export function RenderTab({ project }: Props) {
  const [error, setError] = useState("");
  const { data: renders = [] } = useRenders(project.id);
  const startRender = useStartRender(project.id);

  const isComposing = project.status === "composition";
  const scenes = project.scenes ?? [];
  const clipCount = scenes.filter((s) => s.clip != null).length;
  const hasAnyClips = clipCount > 0;
  const hasVoiceover = (project.voiceovers ?? []).length > 0;

  const handleRender = () => {
    setError("");
    startRender.mutate(undefined, {
      onError: (err) => setError(err.message),
    });
  };

  const canRender = hasAnyClips && hasVoiceover && !isComposing;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Final Video</h2>
        <Button
          onClick={handleRender}
          disabled={startRender.isPending || !canRender}
          title={
            !hasAnyClips
              ? "Generate at least one scene video first"
              : !hasVoiceover
                ? "Generate voiceover first"
                : undefined
          }
        >
          {isComposing
            ? "Rendering..."
            : startRender.isPending
              ? "Working..."
              : "Render Video"}
        </Button>
      </div>

      {!hasAnyClips && (
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Generate at least one scene video before rendering.
        </p>
      )}

      {hasAnyClips && !hasVoiceover && (
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Generate a voiceover before rendering.
        </p>
      )}

      {hasAnyClips && clipCount < scenes.length && (
        <p className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {clipCount} of {scenes.length} scenes have clips. The render will
          use the available clips.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isComposing && renders.every((r) => r.status !== "processing") && (
        <div className="rounded-lg border bg-white p-8 text-center">
          <div className="mb-2 text-lg font-medium text-gray-800">
            Composing video...
          </div>
          <p className="text-sm text-gray-500">
            Starting render pipeline...
          </p>
        </div>
      )}

      {renders.map((render) => (
        <div key={render.id} className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-medium">
              Render
              {render.status === "complete" && render.durationSec
                ? ` - ${formatDuration(render.durationSec)}`
                : ""}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                render.status === "complete"
                  ? "bg-green-100 text-green-700"
                  : render.status === "failed"
                    ? "bg-red-100 text-red-700"
                    : render.status === "processing"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {render.status}
            </span>
          </div>

          <div className="p-4">
            {render.status === "processing" && (
              <p className="text-sm text-blue-600">
                {render.step === "downloading_clips"
                  ? "Downloading scene clips from storage..."
                  : render.step === "generating_sfx"
                    ? "Generating AI sound effects for transitions..."
                    : render.step === "composing"
                      ? "Composing clips with FFmpeg..."
                      : render.step === "uploading"
                        ? "Uploading final video..."
                        : "Rendering in progress..."}
              </p>
            )}

            {render.status === "failed" && render.errorMsg && (
              <p className="text-sm text-red-600">
                Error: {render.errorMsg}
              </p>
            )}

            {render.status === "complete" && render.videoUrl && (
              <div className="space-y-3">
                <video
                  controls
                  className="w-full rounded-lg"
                  src={render.videoUrl}
                >
                  Your browser does not support video playback.
                </video>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {render.durationSec?.toFixed(1)}s
                    {" | "}
                    {formatCost(render.costUsd)}
                    {" | "}
                    {new Date(render.createdAt).toLocaleString()}
                  </p>
                  <a
                    href={render.videoUrl}
                    download={`${project.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Download MP4
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {renders.length === 0 && !isComposing && (
        <p className="text-sm text-gray-500">
          No renders yet. Click &quot;Render Video&quot; to compose the final
          output.
        </p>
      )}
    </div>
  );
}
