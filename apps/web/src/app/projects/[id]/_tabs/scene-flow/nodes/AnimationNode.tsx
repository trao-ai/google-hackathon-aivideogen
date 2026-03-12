"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Film, Play, Pencil, Loader2 } from "lucide-react";
import type { AnimationNodeData } from "../types";
import { resolveMediaUrl } from "../types";
import { useSceneFlow } from "../SceneFlowContext";

function AnimationNodeComponent({ data }: { data: AnimationNodeData }) {
  const { scene, clip, motionNotes } = data;
  const { onGenerateVideo, onEditAnimation, regeneratingIds } = useSceneFlow();

  const isGenerating = regeneratingIds.has(`video-${scene.id}`) || scene.clipStatus === "generating";
  const isFailed = scene.clipStatus === "failed";

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 w-[160px] overflow-hidden">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />

      {/* Header */}
      <div className="px-3 py-1.5 border-b border-indigo-200 flex items-center justify-center gap-1.5">
        <Film className="w-3.5 h-3.5 text-indigo-500" />
        <span className="text-xs font-medium text-indigo-700">Animation</span>
      </div>

      {/* Video preview or generate button */}
      <div className="p-2">
        {clip ? (
          <div className="relative aspect-video w-full rounded overflow-hidden bg-black">
            <video
              src={resolveMediaUrl(clip.videoUrl)}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Play className="w-6 h-6 text-white/70" />
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateVideo(scene.id);
            }}
            disabled={isGenerating}
            className={`w-full aspect-video rounded border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 ${
              isFailed
                ? "border-red-300 bg-red-50 hover:bg-red-100"
                : "border-indigo-300 hover:bg-indigo-100"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                <span className="text-[10px] text-indigo-500 font-medium">
                  Generating...
                </span>
              </>
            ) : isFailed ? (
              <>
                <Play className="w-5 h-5 text-red-400" />
                <span className="text-[10px] text-red-600 font-medium">
                  Failed — Retry
                </span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 text-indigo-400" />
                <span className="text-[10px] text-indigo-500 font-medium">
                  Generate
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Motion notes */}
      <div className="px-2 pb-1.5">
        <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
          {motionNotes || "No motion notes"}
        </p>
      </div>

      {/* Edit button */}
      <div className="px-2 pb-1.5 flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditAnimation(scene.id);
          }}
          className="text-[10px] text-indigo-600 hover:bg-indigo-100 rounded px-1.5 py-0.5 flex items-center gap-0.5"
        >
          <Pencil className="w-2.5 h-2.5" /> Edit
        </button>
        {clip && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateVideo(scene.id);
            }}
            disabled={isGenerating}
            className="text-[10px] text-indigo-600 hover:bg-indigo-100 rounded px-1.5 py-0.5 flex items-center gap-0.5 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
            ) : (
              <Film className="w-2.5 h-2.5" />
            )}{" "}
            Regen
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />
    </div>
  );
}

export const AnimationNode = memo(AnimationNodeComponent);
