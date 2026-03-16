"use client";

import { useRef, useEffect } from "react";
import { resolveMediaUrl } from "../scene-flow/types";
import type { SceneClipInfo } from "./useEditorPlayback";

export interface ActiveTransition {
  type: string;
  progress: number; // 0 → 1
}

interface EditorVideoPreviewProps {
  scenes: SceneClipInfo[];
  activeSceneIndex: number;
  currentTime: number;
  isPlaying: boolean;
  activeTransition?: ActiveTransition | null;
}

/** Compute CSS styles for the current transition effect */
function getTransitionStyle(transition: ActiveTransition | null | undefined): React.CSSProperties {
  if (!transition) return {};
  const { type, progress } = transition;

  switch (type) {
    case "Fade In":
      return { opacity: progress };
    case "Fade Out":
      return { opacity: 1 - progress };
    case "Cross Dissolve":
      // Fade in the new scene
      return { opacity: progress };
    case "Wipe Left":
      return { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` };
    case "Wipe Right":
      return { clipPath: `inset(0 0 0 ${(1 - progress) * 100}%)` };
    case "Slide Up":
      return { transform: `translateY(${(1 - progress) * 100}%)` };
    case "Slide Down":
      return { transform: `translateY(${-(1 - progress) * 100}%)` };
    default:
      // Generic fade for unknown transitions
      return { opacity: progress };
  }
}

export function EditorVideoPreview({
  scenes,
  activeSceneIndex,
  currentTime,
  isPlaying,
  activeTransition,
}: EditorVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeScene = activeSceneIndex >= 0 ? scenes[activeSceneIndex] : null;
  const clipUrl = activeScene?.clipUrl ? resolveMediaUrl(activeScene.clipUrl) : null;
  const thumbnailUrl = activeScene?.thumbnailUrl ? resolveMediaUrl(activeScene.thumbnailUrl) : null;

  // Sync video playback position to timeline
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeScene?.clipUrl) return;

    // Compute the offset within this clip
    const clipOffset = currentTime - activeScene.startSec;
    const clipDur = v.duration;

    if (clipDur && isFinite(clipDur)) {
      const target = Math.max(0, Math.min(clipOffset, clipDur));
      // Only seek if we're noticeably out of sync (> 0.3s drift)
      if (Math.abs(v.currentTime - target) > 0.3) {
        v.currentTime = target;
      }
    }
  }, [currentTime, activeScene, isPlaying]);

  // Play/pause the video element to match playback state
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clipUrl) return;
    if (isPlaying) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying, clipUrl]);

  // When the active scene changes, reset and seek the new clip
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeScene?.clipUrl) return;
    const clipOffset = Math.max(0, currentTime - activeScene.startSec);
    v.currentTime = clipOffset;
    if (isPlaying) {
      v.play().catch(() => {});
    }
  }, [activeSceneIndex]);

  const transitionStyle = getTransitionStyle(activeTransition);

  return (
    <div
      className="w-full bg-black rounded-md overflow-hidden flex items-center justify-center relative"
      style={{ aspectRatio: "16/9", maxHeight: "420px" }}
    >
      {clipUrl ? (
        <video
          ref={videoRef}
          src={clipUrl}
          className="w-full h-full object-contain"
          style={transitionStyle}
          playsInline
          preload="auto"
          muted
        />
      ) : thumbnailUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={thumbnailUrl}
          alt="Scene frame"
          className="w-full h-full object-contain"
          style={transitionStyle}
        />
      ) : (
        <span className="text-white/40 text-base">
          {scenes.length > 0 ? "No clip for this scene" : "No scenes available"}
        </span>
      )}

      {/* Transition overlay for fade effects */}
      {activeTransition && (activeTransition.type === "Fade In" || activeTransition.type === "Cross Dissolve") && (
        <div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: 1 - activeTransition.progress }}
        />
      )}
      {activeTransition && activeTransition.type === "Fade Out" && (
        <div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: activeTransition.progress }}
        />
      )}
    </div>
  );
}
