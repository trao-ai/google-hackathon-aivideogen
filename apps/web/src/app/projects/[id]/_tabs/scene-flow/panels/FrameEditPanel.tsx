"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X } from "lucide-react";
import { resolveMediaUrl } from "../types";

interface Props {
  projectId: string;
  sceneId: string;
  frameId: string;
  currentPrompt: string;
  imageUrl?: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export function FrameEditPanel({
  projectId,
  sceneId,
  frameId,
  currentPrompt,
  imageUrl,
  onClose,
  onRefresh,
}: Props) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegenerate = async (useNewPrompt: boolean) => {
    setError("");
    setLoading(true);
    try {
      await api.frames.regenerateOne(
        projectId,
        sceneId,
        frameId,
        useNewPrompt ? prompt : undefined,
      );
      await onRefresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Frame</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current image preview */}
        {imageUrl && (
          <div className="relative aspect-video w-full rounded overflow-hidden bg-gray-100 mb-4">
            <Image
              src={resolveMediaUrl(imageUrl)}
              alt="Current frame"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Prompt editor */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="frame-prompt">Image Prompt</Label>
          <Textarea
            id="frame-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            className="text-sm font-mono"
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleRegenerate(false)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : null}
            Regen (Keep Prompt)
          </Button>
          <Button
            onClick={() => handleRegenerate(true)}
            disabled={loading || prompt === currentPrompt}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : null}
            Regen with New Prompt
          </Button>
        </div>
      </div>
    </div>
  );
}
