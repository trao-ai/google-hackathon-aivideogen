"use client";

import { useState } from "react";
import { api, type Scene } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Film } from "lucide-react";
import { resolveMediaUrl } from "../types";

interface Props {
  projectId: string;
  scene: Scene;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export function AnimationEditPanel({
  projectId,
  scene,
  onClose,
  onRefresh,
}: Props) {
  const [motionNotes, setMotionNotes] = useState(
    scene.motionNotes ?? scene.animationNotes ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      await api.scenes.updateMotion(projectId, scene.id, { motionNotes });
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setError("");
    // Save motion notes first if changed
    if (motionNotes !== (scene.motionNotes ?? scene.animationNotes ?? "")) {
      await handleSave();
    }
    setGenerating(true);
    try {
      await api.scenes.generateVideo(projectId, scene.id);
      await onRefresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const hasFrames =
    (scene.frames ?? []).some((f) => f.frameType === "start") &&
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

        {/* Current video preview */}
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

        {/* Motion notes editor */}
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
            Generate both start and end frames before creating a video.
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
