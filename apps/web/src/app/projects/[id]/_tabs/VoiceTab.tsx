"use client";

import { useState } from "react";
import type { ProjectDetail, Voiceover } from "@/lib/api";
import { useVoicePresets, useGenerateVoice, useDeleteVoice } from "@/hooks/use-voice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Props {
  project: ProjectDetail;
}

export function VoiceTab({ project }: Props) {
  const [error, setError] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("adam");
  const { data: presets = [] } = useVoicePresets();
  const generateVoice = useGenerateVoice(project.id);
  const deleteVoice = useDeleteVoice(project.id);

  const voiceovers: Voiceover[] = project.voiceovers ?? [];
  const latestVoiceover = voiceovers[0];
  const isVoicing = project.status === "voicing";
  const hasApprovedScript = !!project.selectedScriptId;
  const loading = generateVoice.isPending || deleteVoice.isPending;

  const handleGenerate = () => {
    setError("");
    generateVoice.mutate(selectedVoice, {
      onError: (err) => setError(err.message),
    });
  };

  const handleDelete = (voiceoverId: string) => {
    if (!confirm("Delete this voiceover? The audio file will be permanently removed.")) return;
    deleteVoice.mutate(voiceoverId, {
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Voiceover</h2>
        <div className="flex items-center gap-3">
          {presets.length > 0 && (
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={loading || isVoicing}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {presets.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name} ({p.accent})
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={handleGenerate}
            disabled={loading || isVoicing || !hasApprovedScript}
            title={!hasApprovedScript ? "Approve a script first" : undefined}
          >
            {isVoicing
              ? "Generating…"
              : loading
                ? "Working…"
                : "Generate Voiceover"}
          </Button>
        </div>
      </div>

      {!hasApprovedScript && (
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Approve a script on the Scripts tab before generating voiceover.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!latestVoiceover && !isVoicing && (
        <p className="text-sm text-gray-500">No voiceover yet.</p>
      )}

      {latestVoiceover && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Voiceover — {formatDuration(latestVoiceover.durationSec)}
              </CardTitle>
              <button
                onClick={() => handleDelete(latestVoiceover.id)}
                disabled={loading}
                className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <audio controls className="w-full" src={latestVoiceover.audioUrl.startsWith("http") ? latestVoiceover.audioUrl : `${API}${latestVoiceover.audioUrl}`}>
              Your browser does not support audio.
            </audio>
            <p className="text-xs text-gray-500">
              Duration: {latestVoiceover.durationSec.toFixed(1)}s · Segments:{" "}
              {Array.isArray(latestVoiceover.segments)
                ? latestVoiceover.segments.length
                : 0}{" "}
              · Created: {new Date(latestVoiceover.createdAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
