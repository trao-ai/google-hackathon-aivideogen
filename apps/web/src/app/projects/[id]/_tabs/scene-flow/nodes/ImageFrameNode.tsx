"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import Image from "next/image";
import { RefreshCw, Pencil, ImageIcon, Loader2 } from "lucide-react";
import type { ImageFrameNodeData } from "../types";
import { resolveMediaUrl } from "../types";
import { useSceneFlow } from "../SceneFlowContext";

function ImageFrameNodeComponent({ data }: { data: ImageFrameNodeData }) {
  const { scene, frame, frameType, platform } = data;
  const {
    onRegenerateFrame,
    onEditFrame,
    onGenerateSceneFrames,
    regeneratingIds,
  } = useSceneFlow();

  const isRegenerating = frame
    ? regeneratingIds.has(frame.id)
    : regeneratingIds.has(`frames-${scene.id}`);

  // Determine aspect ratio based on platform
  const aspectRatio = platform === "instagram" || platform === "tiktok"
    ? "aspect-[9/16]"
    : "aspect-video";

  return (
    <div className="rounded-lg border border-brand-border-light bg-brand-off-white shadow-sm w-[240px] overflow-hidden">
      <Handle type="target" position={Position.Bottom} className="!w-2 !h-2" />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2"
        id="left"
      />

      {/* Header */}
      <div className="px-2.5 py-1.5 border-b border-brand-border-light bg-brand-surface flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground">
          Scene {(scene.orderIndex ?? scene.order ?? 0) + 1} &middot;{" "}
          {frameType === "start" ? "Start" : "End"}
        </span>
        <span className="text-[9px] text-foreground/50 uppercase tracking-wide">
          {scene.sceneType ?? scene.type}
        </span>
      </div>

      {/* Image or placeholder */}
      <div className={`relative ${aspectRatio} w-full bg-brand-surface`}>
        {frame ? (
          <>
            <Image
              src={resolveMediaUrl(frame.imageUrl)}
              alt={`${frameType} frame`}
              fill
              className="object-cover"
              unoptimized
            />
            {isRegenerating && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-foreground/60" />
              </div>
            )}
          </>
        ) : (
          <div className={`absolute inset-0 flex flex-col items-center border-2 border-dashed border-brand-border-light rounded-md m-2 ${
            "justify-center"
          }`}>
            {scene.frameStatus === "generating" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-foreground/60" />
                <span className="text-[10px] text-foreground/60 mt-1">
                  Generating...
                </span>
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5 text-foreground/30" />
                <span className="text-[10px] text-foreground/50 mt-1">
                  No frame yet
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateSceneFrames(scene.id);
                  }}
                  disabled={isRegenerating}
                  className="mt-1 text-[10px] text-foreground bg-white border border-brand-border-light shadow-sm hover:bg-brand-surface rounded px-2 py-1 disabled:opacity-50 transition-colors"
                >
                  {isRegenerating ? "Generating..." : "Generate"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      {frame && (
        <div className="px-2 py-1.5 flex gap-1 border-t border-brand-border-light bg-brand-surface">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRegenerateFrame(scene.id, frame.id);
            }}
            disabled={isRegenerating}
            className="text-[10px] text-foreground hover:bg-brand-border-light rounded px-1.5 py-0.5 flex items-center gap-0.5 disabled:opacity-50"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Regen
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditFrame(scene.id, frame.id, frame.prompt);
            }}
            disabled={isRegenerating}
            className="text-[10px] text-foreground hover:bg-brand-border-light rounded px-1.5 py-0.5 flex items-center gap-0.5 disabled:opacity-50"
          >
            <Pencil className="w-2.5 h-2.5" /> Edit
          </button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2"
        id="right"
      />
    </div>
  );
}

export const ImageFrameNode = memo(ImageFrameNodeComponent);
