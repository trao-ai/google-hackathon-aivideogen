"use client";

import {
  SkipBackIcon,
  CaretLeftIcon,
  StopIcon,
  PlayIcon,
  PauseIcon,
  CaretRightIcon,
  SkipForwardIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onRewind: () => void;
  onPrevFrame: () => void;
  onStop: () => void;
  onPlayPause: () => void;
  onNextFrame: () => void;
  onFastForward: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoomLevel: number;
}

function CtrlBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 rounded-full bg-[#E1DACD] flex items-center justify-center text-brand-black hover:opacity-80 transition-opacity"
    >
      {children}
    </button>
  );
}

export function PlaybackControls({
  isPlaying,
  onRewind,
  onPrevFrame,
  onStop,
  onPlayPause,
  onNextFrame,
  onFastForward,
  onZoomIn,
  onZoomOut,
  zoomLevel,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {/* Zoom out */}
      <CtrlBtn onClick={onZoomOut}>
        <MinusIcon size={16} weight="bold" />
      </CtrlBtn>

      {/* Transport */}
      <CtrlBtn onClick={onRewind}>
        <SkipBackIcon size={16} weight="fill" />
      </CtrlBtn>
      <CtrlBtn onClick={onPrevFrame}>
        <CaretLeftIcon size={16} weight="fill" />
      </CtrlBtn>
      <CtrlBtn onClick={onStop}>
        <StopIcon size={16} weight="fill" />
      </CtrlBtn>
      <button
        type="button"
        onClick={onPlayPause}
        className="w-10 h-10 rounded-full bg-brand-black flex items-center justify-center text-white hover:opacity-90 transition-opacity"
      >
        {isPlaying ? <PauseIcon size={20} weight="fill" /> : <PlayIcon size={20} weight="fill" />}
      </button>
      <CtrlBtn onClick={onNextFrame}>
        <CaretRightIcon size={16} weight="fill" />
      </CtrlBtn>
      <CtrlBtn onClick={onFastForward}>
        <SkipForwardIcon size={16} weight="fill" />
      </CtrlBtn>

      {/* Zoom in */}
      <CtrlBtn onClick={onZoomIn}>
        <PlusIcon size={16} weight="bold" />
      </CtrlBtn>
    </div>
  );
}
