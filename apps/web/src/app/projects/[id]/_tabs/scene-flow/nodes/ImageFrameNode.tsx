"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import Image from "next/image";
import { RefreshCw, Pencil, ImageIcon, Loader2 } from "lucide-react";
import type { ImageFrameNodeData } from "../types";
import { resolveMediaUrl } from "../types";
import { useSceneFlow } from "../SceneFlowContext";

function ImageFrameNodeComponent({ data }: { data: ImageFrameNodeData }) {
  const { scene, frame, frameType } = data;
  const { onRegenerateFrame, onEditFrame, regeneratingIds } = useSceneFlow();

  const isRegenerating = frame ? regeneratingIds.has(frame.id) : false;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm w-[240px] overflow-hidden">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />

      {/* Header */}
      <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">
          Scene {(scene.orderIndex ?? scene.order ?? 0) + 1} &middot;{" "}
          {frameType === "start" ? "Start" : "End"}
        </span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
          {scene.sceneType ?? scene.type}
        </span>
      </div>

      {/* Image or placeholder */}
      <div className="relative aspect-video w-full bg-gray-100">
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
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded m-1">
            {scene.frameStatus === "generating" ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-[10px] text-blue-500 mt-1">
                  Generating...
                </span>
              </>
            ) : (
              <>
                <ImageIcon className="w-6 h-6 text-gray-300" />
                <span className="text-[10px] text-gray-400 mt-1">
                  No frame yet
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      {frame && (
        <div className="px-2 py-1.5 flex gap-1 border-t bg-gray-50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRegenerateFrame(scene.id, frame.id);
            }}
            disabled={isRegenerating}
            className="text-xs text-blue-600 hover:bg-blue-50 rounded px-2 py-1 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className="w-3 h-3" /> Regen
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditFrame(scene.id, frame.id, frame.prompt);
            }}
            disabled={isRegenerating}
            className="text-xs text-gray-600 hover:bg-gray-100 rounded px-2 py-1 flex items-center gap-1 disabled:opacity-50"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />
    </div>
  );
}

export const ImageFrameNode = memo(ImageFrameNodeComponent);
