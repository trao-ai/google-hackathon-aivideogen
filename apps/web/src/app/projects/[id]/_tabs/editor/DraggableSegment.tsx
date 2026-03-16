"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface DraggableSegmentProps {
  id: string;
  startSec: number;
  endSec: number;
  zoomLevel: number;
  isSelected: boolean;
  color: "blue" | "green";
  /** "full" = selectable + trim handles. "moveOnly" = always shows frame, move only, no trim. */
  mode?: "full" | "moveOnly";
  children: React.ReactNode;
  onSelect: (id: string) => void;
  onTrim: (id: string, newStartSec: number, newEndSec: number) => void;
  onMove: (id: string, newStartSec: number) => void;
}

const MIN_CLIP_DURATION = 0.3;

const COLOR_STYLES = {
  blue: {
    selected: "ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 z-10",
    unselected: "border border-brand-border-light hover:ring-1 hover:ring-blue-400/50",
    handle: "bg-blue-500",
  },
  green: {
    selected: "ring-2 ring-[#5CB88A] shadow-lg shadow-[#5CB88A]/20 z-10",
    unselected: "ring-2 ring-[#5CB88A]",
    handle: "bg-[#5CB88A]",
  },
};

export function DraggableSegment({
  id,
  startSec,
  endSec,
  zoomLevel,
  isSelected,
  color,
  mode = "full",
  children,
  onSelect,
  onTrim,
  onMove,
}: DraggableSegmentProps) {
  const [isDragging, setIsDragging] = useState<"left" | "right" | "move" | null>(null);
  const dragStartRef = useRef({ x: 0, startSec: 0, endSec: 0 });
  const didDragRef = useRef(false);

  const left = startSec * zoomLevel;
  const width = Math.max((endSec - startSec) * zoomLevel, 20);
  const styles = COLOR_STYLES[color];

  // For moveOnly mode, always show the frame (use "unselected" style which now has a permanent ring)
  const frameClass = mode === "moveOnly"
    ? styles.unselected
    : isSelected ? styles.selected : styles.unselected;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "left" | "right" | "move") => {
      e.preventDefault();
      e.stopPropagation();
      didDragRef.current = false;
      setIsDragging(type);
      dragStartRef.current = { x: e.clientX, startSec, endSec };
    },
    [startSec, endSec],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      if (Math.abs(dx) > 3) didDragRef.current = true;
      const dtSec = dx / zoomLevel;
      const { startSec: origStart, endSec: origEnd } = dragStartRef.current;

      if (isDragging === "left") {
        const newStart = Math.max(0, origStart + dtSec);
        if (origEnd - newStart >= MIN_CLIP_DURATION) {
          onTrim(id, newStart, origEnd);
        }
      } else if (isDragging === "right") {
        const newEnd = origEnd + dtSec;
        if (newEnd - origStart >= MIN_CLIP_DURATION) {
          onTrim(id, origStart, newEnd);
        }
      } else if (isDragging === "move") {
        const newStart = Math.max(0, origStart + dtSec);
        onMove(id, newStart);
      }
    };

    const handleMouseUp = () => setIsDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, zoomLevel, id, onTrim, onMove]);

  // Show handles: always for moveOnly, on select for full
  const showHandles = mode === "moveOnly" || (mode === "full" && isSelected);

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-md overflow-hidden select-none transition-shadow ${frameClass}`}
      style={{ left, width }}
      onClick={(e) => {
        e.stopPropagation();
        if (!didDragRef.current && mode === "full") onSelect(id);
        didDragRef.current = false;
      }}
    >
      {/* Content */}
      <div className="absolute inset-0 overflow-hidden">
        {children}
      </div>

      {/* Drag-to-move area */}
      <div
        className={`absolute inset-0 z-[3] ${
          isDragging === "move" ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={(e) => handleMouseDown(e, "move")}
      />

      {/* Handle bars — always visible for moveOnly, on select for full. Always functional for trimming. */}
      {showHandles && (
        <>
          <div
            className={`absolute left-0 top-0 bottom-0 w-3 ${styles.handle} rounded-l-md cursor-col-resize flex items-center justify-center z-20`}
            onMouseDown={(e) => handleMouseDown(e, "left")}
          >
            <div className="w-[3px] h-5 bg-white/90 rounded-full" />
          </div>
          <div
            className={`absolute right-0 top-0 bottom-0 w-3 ${styles.handle} rounded-r-md cursor-col-resize flex items-center justify-center z-20`}
            onMouseDown={(e) => handleMouseDown(e, "right")}
          >
            <div className="w-[3px] h-5 bg-white/90 rounded-full" />
          </div>
        </>
      )}
    </div>
  );
}
