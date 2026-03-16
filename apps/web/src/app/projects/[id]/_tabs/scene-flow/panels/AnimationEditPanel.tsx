"use client";

import { useState } from "react";
import type { Scene } from "@/lib/api";
import { useUpdateMotion, useGenerateVideo } from "@/hooks/use-scenes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Film } from "lucide-react";
import { resolveMediaUrl } from "../types";
import { useSceneFlow } from "../SceneFlowContext";

interface Props {
  projectId: string;
  scene: Scene;
  onClose: () => void;
}

export function AnimationEditPanel({
  projectId,
  scene,
  onClose,
}: Props) {
  const [motionNotes, setMotionNotes] = useState(
    scene.motionNotes ?? scene.animationNotes ?? "",
  );
  const { videoProvider } = useSceneFlow();
  const [error, setError] = useState("");
  const updateMotion = useUpdateMotion(projectId);
  const generateVideo = useGenerateVideo(projectId);

  const saving = updateMotion.isPending;
  const generating = generateVideo.isPending;

  const handleSave = () => {
    setError("");
    updateMotion.mutate(
      { sceneId: scene.id, motionNotes },
      { onError: (err) => setError(err.message) },
    );
  };

  const handleGenerate = async () => {
    setError("");
    if (motionNotes !== (scene.motionNotes ?? scene.animationNotes ?? "")) {
      await updateMotion.mutateAsync({ sceneId: scene.id, motionNotes });
    }
    generateVideo.mutate(scene.id, {
      onSuccess: () => onClose(),
      onError: (err) => setError(err.message),
    });
  };

  const isSeDance = videoProvider === "seedance";
  const hasFrames = isSeDance
    ? (scene.frames ?? []).some((f) => f.frameType === "start")
    : (scene.frames ?? []).some((f) => f.frameType === "start") &&
      (scene.frames ?? []).some((f) => f.frameType === "end");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Animation &middot; Scene {(scene.orderIndex ?? scene.order ?? 0) + 1}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {scene.clip && (
          <div className="relative aspect-video w-full rounded overflow-hidden bg-black mb-4">
            <video
              src={resolveMediaUrl(scene.clip.videoUrl)}
              controls
              className="w-full h-full"
              playsInline
            />
          </div>
        )}

        <div className="space-y-2 mb-4">
          <Label htmlFor="motion-notes">
            Motion Description (what should happen in the animation)
          </Label>
          <Textarea
            id="motion-notes"
            value={motionNotes}
            onChange={(e) => setMotionNotes(e.target.value)}
            rows={4}
            placeholder="Describe the motion and animation between the start and end frames..."
            className="text-sm"
          />
        </div>

        {!hasFrames && (
          <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800 mb-4">
            {isSeDance
              ? "Generate the start frame before creating a video."
              : "Generate both start and end frames before creating a video."}
          </p>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={
              saving ||
              motionNotes ===
                (scene.motionNotes ?? scene.animationNotes ?? "")
            }
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : null}
            Save Notes
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || !hasFrames}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Film className="w-4 h-4 mr-1" />
            )}
            Generate Video
          </Button>
        </div>
      </div>
    </div>
  );
}
