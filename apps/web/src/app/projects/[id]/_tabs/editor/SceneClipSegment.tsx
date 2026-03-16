"use client";

import { resolveMediaUrl } from "../scene-flow/types";
import { DraggableSegment } from "./DraggableSegment";
import type { TimelineSegment } from "./TimelineTrack";

interface SceneClipSegmentProps {
  segment: TimelineSegment;
  zoomLevel: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTrim: (id: string, newStartSec: number, newEndSec: number) => void;
  onMove: (id: string, newStartSec: number) => void;
}

const FILMSTRIP_THUMB_WIDTH = 54;
const FILMSTRIP_THUMB_HEIGHT = 68;

export function SceneClipSegment({
  segment,
  zoomLevel,
  isSelected,
  onSelect,
  onTrim,
  onMove,
}: SceneClipSegmentProps) {
  const width = Math.max((segment.endSec - segment.startSec) * zoomLevel, 20);
  const thumbUrl = segment.thumbnailUrl ? resolveMediaUrl(segment.thumbnailUrl) : null;
  const thumbCount = Math.max(1, Math.ceil(width / FILMSTRIP_THUMB_WIDTH));

  return (
    <DraggableSegment
      id={segment.id}
      startSec={segment.startSec}
      endSec={segment.endSec}
      zoomLevel={zoomLevel}
      isSelected={isSelected}
      color="blue"
      onSelect={onSelect}
      onTrim={onTrim}
      onMove={onMove}
    >
      {/* Filmstrip thumbnails tiled across the clip */}
      <div className="absolute inset-0 flex overflow-hidden">
        {thumbUrl
          ? Array.from({ length: thumbCount }).map((_, i) => (
              <img
                key={i}
                src={thumbUrl}
                alt=""
                className="shrink-0 object-cover"
                style={{ width: FILMSTRIP_THUMB_WIDTH, height: FILMSTRIP_THUMB_HEIGHT }}
                draggable={false}
              />
            ))
          : <div className="w-full h-full bg-[#E8E4DB]" />
        }
      </div>
      {/* Gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/50 to-transparent" />
      {/* Label */}
      {width > 40 && (
        <span className="absolute bottom-1 left-2 text-[10px] font-semibold text-white drop-shadow-sm truncate z-[2]">
          {segment.label}
        </span>
      )}
    </DraggableSegment>
  );
}
