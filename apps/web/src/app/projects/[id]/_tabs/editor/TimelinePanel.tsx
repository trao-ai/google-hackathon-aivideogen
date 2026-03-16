"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { PlayIcon, SpeakerHighIcon, ArrowCounterClockwiseIcon, ArrowUUpLeftIcon, ArrowUUpRightIcon } from "@phosphor-icons/react";
import { TimeRuler } from "./TimeRuler";
import { TimelineTrack, TRACK_HEIGHTS } from "./TimelineTrack";
import type { TimelineSegment, TransitionSegment, VoiceSegment, SfxSegment } from "./TimelineTrack";

function formatTimecode(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface TimelinePanelProps {
  totalDuration: number;
  currentTime: number;
  zoomLevel: number;
  isPlaying: boolean;
  scenes: TimelineSegment[];
  transitions: TransitionSegment[];
  voiceSegment: VoiceSegment | null;
  sfxSegments: SfxSegment[];
  onSeek: (timeSec: number) => void;
  onCancel: () => void;
  onSave: () => void;
  onSegmentTrim: (id: string, newStartSec: number, newEndSec: number) => void;
  onSegmentMove: (id: string, newStartSec: number) => void;
}

const LABEL_WIDTH = 72;
const RULER_HEIGHT = 32;

const TRACK_ORDER: { label: string; type: "scenes" | "transitions" | "voice" | "sfx" }[] = [
  { label: "Scenes", type: "scenes" },
  { label: "Transition", type: "transitions" },
  { label: "Voice", type: "voice" },
  { label: "SFX", type: "sfx" },
];

export function TimelinePanel({
  totalDuration,
  currentTime,
  zoomLevel,
  isPlaying,
  scenes,
  transitions,
  voiceSegment,
  sfxSegments,
  onSeek,
  onCancel,
  onSave,
  onSegmentTrim,
  onSegmentMove,
}: TimelinePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Click-to-seek on empty timeline area — also deselects
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
      const clickX = e.clientX - rect.left + scrollLeft;
      if (clickX < 0) return;
      const timeSec = clickX / zoomLevel;
      onSeek(Math.max(0, Math.min(timeSec, totalDuration)));
      setSelectedSegmentId(null);
    },
    [zoomLevel, totalDuration, onSeek],
  );

  // Auto-scroll to follow playhead
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) return;
    const container = scrollRef.current;
    const playheadX = currentTime * zoomLevel;
    const visibleRight = container.scrollLeft + container.clientWidth;
    if (playheadX > visibleRight - 40) {
      container.scrollLeft = playheadX - container.clientWidth / 2;
    }
  }, [currentTime, isPlaying, zoomLevel]);

  const handleSelect = useCallback((id: string) => {
    setSelectedSegmentId(id);
  }, []);

  return (
    <div className="rounded-md border border-brand-border-light bg-[#FAF9F5] overflow-hidden">
      {/* Header — separate from the tracks */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Timeline</span>
          <div className="w-8 h-8 rounded-full border-[1.5px] border-foreground/50 flex items-center justify-center">
            <PlayIcon size={14} weight="fill" className="text-foreground/50 ml-0.5" />
          </div>
          <div className="flex items-center px-3 py-1.5 rounded-full bg-[#E8E4DB]">
            <span className="text-xs font-medium text-foreground tabular-nums">
              {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#E8E4DB] flex items-center justify-center">
            <SpeakerHighIcon size={16} className="text-foreground/60" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-full border border-brand-border-light text-xs font-medium text-foreground hover:opacity-80 transition-opacity"
          >
            Reset
          </button>
          <div className="flex items-center gap-1">
            <button type="button" className="w-7 h-7 rounded-full flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-colors">
              <ArrowUUpLeftIcon size={16} weight="bold" />
            </button>
            <button type="button" className="w-7 h-7 rounded-full flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-colors">
              <ArrowUUpRightIcon size={16} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks area — labels on left, scrollable content on right */}
      <div className="flex">
        {/* Fixed labels column */}
        <div className="shrink-0" style={{ width: LABEL_WIDTH }}>
          <div style={{ height: RULER_HEIGHT }} />
          {TRACK_ORDER.map(({ label, type }) => (
            <div
              key={type}
              className="flex items-center px-4"
              style={{ height: TRACK_HEIGHTS[type] }}
            >
              <span className="text-xs font-medium text-foreground/50">{label}</span>
            </div>
          ))}
        </div>

        {/* Scrollable tracks area */}
        <div
          ref={scrollRef}
          className="overflow-x-auto relative cursor-pointer flex-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:rounded-full"
          onClick={handleTimelineClick}
        >
          <TimeRuler totalDuration={totalDuration} zoomLevel={zoomLevel} />

          <TimelineTrack
            trackType="scenes"
            totalDuration={totalDuration}
            zoomLevel={zoomLevel}
            currentTime={currentTime}
            segments={scenes}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={handleSelect}
            onSegmentTrim={onSegmentTrim}
            onSegmentMove={onSegmentMove}
          />
          <TimelineTrack
            trackType="transitions"
            totalDuration={totalDuration}
            zoomLevel={zoomLevel}
            currentTime={currentTime}
            transitions={transitions}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={handleSelect}
            onSegmentTrim={onSegmentTrim}
            onSegmentMove={onSegmentMove}
          />
          <TimelineTrack
            trackType="voice"
            totalDuration={totalDuration}
            zoomLevel={zoomLevel}
            currentTime={currentTime}
            voiceSegment={voiceSegment}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={handleSelect}
            onSegmentTrim={onSegmentTrim}
            onSegmentMove={onSegmentMove}
          />
          <TimelineTrack
            trackType="sfx"
            totalDuration={totalDuration}
            zoomLevel={zoomLevel}
            currentTime={currentTime}
            sfxSegments={sfxSegments}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={handleSelect}
            onSegmentTrim={onSegmentTrim}
            onSegmentMove={onSegmentMove}
          />

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
            style={{ left: `${currentTime * zoomLevel}px` }}
          >
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-1 -mt-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
