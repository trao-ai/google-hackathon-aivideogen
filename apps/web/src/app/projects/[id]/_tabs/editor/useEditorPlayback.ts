"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface SceneClipInfo {
  id: string;
  startSec: number;
  endSec: number;
  clipUrl: string | null;
  thumbnailUrl: string | null;
}

export interface UseEditorPlaybackReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  zoomLevel: number;
  activeSceneIndex: number;

  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlayPause: () => void;
  seekTo: (timeSec: number) => void;
  rewind: () => void;
  fastForward: () => void;
  prevFrame: () => void;
  nextFrame: () => void;
  toggleMute: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export function useEditorPlayback(
  totalDuration: number,
  scenes: SceneClipInfo[],
): UseEditorPlaybackReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(40);

  // Find which scene the playhead is in
  const activeSceneIndex = scenes.findIndex(
    (s) => currentTime >= s.startSec && currentTime < s.endSec,
  );

  // RAF loop — advance currentTime independently
  const tick = useCallback(
    (timestamp: number) => {
      if (lastTickRef.current > 0) {
        const deltaSec = (timestamp - lastTickRef.current) / 1000;
        setCurrentTime((prev) => {
          const next = prev + deltaSec;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      lastTickRef.current = timestamp;
      rafRef.current = requestAnimationFrame(tick);
    },
    [totalDuration],
  );

  useEffect(() => {
    if (isPlaying) {
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
      lastTickRef.current = 0;
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, tick]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seekTo = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(t, totalDuration));
      if (audioRef.current) audioRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [totalDuration],
  );

  const rewind = useCallback(() => seekTo(currentTime - 5), [currentTime, seekTo]);
  const fastForward = useCallback(() => seekTo(currentTime + 5), [currentTime, seekTo]);
  const prevFrame = useCallback(() => {
    pause();
    seekTo(currentTime - 1 / 30);
  }, [currentTime, seekTo, pause]);
  const nextFrame = useCallback(() => {
    pause();
    seekTo(currentTime + 1 / 30);
  }, [currentTime, seekTo, pause]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  }, [isMuted]);

  const zoomIn = useCallback(() => setZoomLevel((z) => Math.min(200, z + 10)), []);
  const zoomOut = useCallback(() => setZoomLevel((z) => Math.max(10, z - 10)), []);

  return {
    audioRef,
    currentTime,
    duration: totalDuration,
    isPlaying,
    volume,
    isMuted,
    zoomLevel,
    activeSceneIndex,
    play,
    pause,
    stop,
    togglePlayPause,
    seekTo,
    rewind,
    fastForward,
    prevFrame,
    nextFrame,
    toggleMute,
    zoomIn,
    zoomOut,
  };
}
