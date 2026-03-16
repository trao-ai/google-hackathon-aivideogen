"use client";

import { SceneClipSegment } from "./SceneClipSegment";
import { DraggableSegment } from "./DraggableSegment";

export interface TimelineSegment {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
  thumbnailUrl?: string;
}

export interface TransitionSegment {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
}

export interface SfxSegment {
  id: string;
  startSec: number;
  endSec: number;
}

export interface VoiceSegment {
  id: string;
  startSec: number;
  endSec: number;
}

export type TrackType = "scenes" | "transitions" | "voice" | "sfx";

// Waveform bar heights
const WAVEFORM_HEIGHTS = [
  30, 50, 25, 60, 35, 20, 65, 40, 28, 55, 22, 45, 70, 30, 42, 58, 24, 52,
  32, 62, 26, 44, 56, 20, 38, 68, 28, 48, 34, 60, 22, 54, 30, 46, 62, 26,
  38, 52, 24, 58, 32, 48, 65, 28, 40, 55, 22, 50, 36, 60, 24, 52, 30, 45,
  66, 26, 42, 58, 20, 38, 54, 30, 48, 62, 24, 36, 56, 28, 50, 64, 32, 40,
];

interface TimelineTrackProps {
  trackType: TrackType;
  totalDuration: number;
  zoomLevel: number;
  currentTime: number;
  segments?: TimelineSegment[];
  transitions?: TransitionSegment[];
  voiceSegment?: VoiceSegment | null;
  sfxSegments?: SfxSegment[];
  selectedSegmentId?: string | null;
  onSegmentSelect?: (id: string) => void;
  onSegmentTrim?: (id: string, newStartSec: number, newEndSec: number) => void;
  onSegmentMove?: (id: string, newStartSec: number) => void;
}

export const TRACK_HEIGHTS: Record<TrackType, number> = {
  scenes: 72,
  transitions: 56,
  voice: 64,
  sfx: 64,
};

const BAR_GAP = 3;  // px gap between bars
const BAR_WIDTH = 3; // px width of each bar
const BAR_STEP = BAR_WIDTH + BAR_GAP; // total px per bar slot
const PAD = 12; // px padding on each side (inside handles)

/** Waveform bars — played portion is dark, unplayed is light gray */
function WaveformBars({
  segStartSec,
  segEndSec,
  zoomLevel,
  currentTime,
  offset = 0,
}: {
  segStartSec: number;
  segEndSec: number;
  zoomLevel: number;
  currentTime: number;
  offset?: number;
}) {
  const segWidthPx = (segEndSec - segStartSec) * zoomLevel;
  const usableWidth = Math.max(segWidthPx - PAD * 2, 0);
  const barCount = Math.max(Math.floor(usableWidth / BAR_STEP), 4);
  const segDuration = segEndSec - segStartSec;

  return (
    <div className="w-full h-full flex items-center justify-center gap-[3px] px-3">
      {Array.from({ length: barCount }).map((_, i) => {
        // Time this bar represents
        const barFrac = barCount > 1 ? i / (barCount - 1) : 0;
        const barTime = segStartSec + barFrac * segDuration;
        const isPlayed = currentTime >= barTime;

        return (
          <div
            key={i}
            className={`w-[3px] rounded-full shrink-0 ${
              isPlayed ? "bg-[#333]" : "bg-[#C0C0C0]"
            }`}
            style={{ height: `${WAVEFORM_HEIGHTS[(i + offset) % WAVEFORM_HEIGHTS.length]}%` }}
          />
        );
      })}
    </div>
  );
}

export function TimelineTrack({
  trackType,
  totalDuration,
  zoomLevel,
  currentTime,
  segments,
  transitions,
  voiceSegment,
  sfxSegments,
  selectedSegmentId,
  onSegmentSelect,
  onSegmentTrim,
  onSegmentMove,
}: TimelineTrackProps) {
  const trackHeight = TRACK_HEIGHTS[trackType];
  const totalWidth = totalDuration * zoomLevel;
  const select = onSegmentSelect ?? (() => {});
  const trim = onSegmentTrim ?? (() => {});
  const move = onSegmentMove ?? (() => {});

  return (
    <div className="relative" style={{ width: totalWidth, height: trackHeight }}>

      {/* ──── Scenes ──── */}
      {trackType === "scenes" && segments?.map((seg) => (
        <SceneClipSegment
          key={seg.id}
          segment={seg}
          zoomLevel={zoomLevel}
          isSelected={selectedSegmentId === seg.id}
          onSelect={select}
          onTrim={trim}
          onMove={move}
        />
      ))}

      {/* ──── Transitions — green frame always visible, no trim ──── */}
      {trackType === "transitions" && transitions?.map((tr) => (
        <DraggableSegment
          key={tr.id}
          id={tr.id}
          startSec={tr.startSec}
          endSec={tr.endSec}
          zoomLevel={zoomLevel}
          isSelected={selectedSegmentId === tr.id}
          color="green"
          mode="moveOnly"
          onSelect={select}
          onTrim={trim}
          onMove={move}
        >
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs font-semibold text-foreground whitespace-nowrap px-2">
              {tr.label}
            </span>
          </div>
        </DraggableSegment>
      ))}

      {/* ──── Voice — selectable, waveform with played/unplayed ──── */}
      {trackType === "voice" && voiceSegment && (
        <DraggableSegment
          id={voiceSegment.id}
          startSec={voiceSegment.startSec}
          endSec={voiceSegment.endSec}
          zoomLevel={zoomLevel}
          isSelected={selectedSegmentId === voiceSegment.id}
          color="green"
          mode="full"
          onSelect={select}
          onTrim={trim}
          onMove={move}
        >
          <WaveformBars
            segStartSec={voiceSegment.startSec}
            segEndSec={voiceSegment.endSec}
            zoomLevel={zoomLevel}
            currentTime={currentTime}
          />
        </DraggableSegment>
      )}

      {/* ──── SFX — green frame always visible, waveform with played/unplayed ──── */}
      {trackType === "sfx" && sfxSegments?.map((sfx, idx) => (
        <DraggableSegment
          key={sfx.id}
          id={sfx.id}
          startSec={sfx.startSec}
          endSec={sfx.endSec}
          zoomLevel={zoomLevel}
          isSelected={selectedSegmentId === sfx.id}
          color="green"
          mode="moveOnly"
          onSelect={select}
          onTrim={trim}
          onMove={move}
        >
          <WaveformBars
            segStartSec={sfx.startSec}
            segEndSec={sfx.endSec}
            zoomLevel={zoomLevel}
            currentTime={currentTime}
            offset={idx * 12}
          />
        </DraggableSegment>
      ))}
    </div>
  );
}
