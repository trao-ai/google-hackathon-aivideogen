"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

interface CaptionVideoPlayerProps {
  videoUrl: string;
  subtitleUrl?: string;
  font: string;
  fontSize: number | "custom";
  textColor: string;
  textOpacity: number;
  bgColor: string;
  bgOpacity: number;
  position: "top" | "bottom";
  showCaptions: boolean;
}

export function CaptionVideoPlayer({
  videoUrl,
  subtitleUrl,
  font,
  fontSize,
  textColor,
  textOpacity,
  bgColor,
  bgOpacity,
  position,
  showCaptions,
}: CaptionVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [captions, setCaptions] = useState<CaptionCue[]>([]);
  const [currentCaption, setCurrentCaption] = useState<string>("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);

  // Parse subtitle file
  useEffect(() => {
    if (!subtitleUrl) return;

    fetch(subtitleUrl)
      .then((res) => res.text())
      .then((text) => {
        const cues = parseSubtitles(text);
        setCaptions(cues);
        console.log(`[CaptionPlayer] Loaded ${cues.length} caption cues`);
      })
      .catch((err) => {
        console.error("[CaptionPlayer] Failed to load subtitles:", err);
      });
  }, [subtitleUrl]);

  // Update current caption based on video time
  useEffect(() => {
    if (!showCaptions) {
      setCurrentCaption("");
      return;
    }

    // If no captions loaded, show sample text for preview
    if (captions.length === 0) {
      setCurrentCaption("Sample caption text for styling preview");
      return;
    }

    const cue = captions.find(
      (c) => currentTime >= c.start && currentTime <= c.end,
    );
    setCurrentCaption(cue?.text || "");
  }, [currentTime, captions, showCaptions]);

  // Track video state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleLoadedMetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      setVideoAspectRatio(aspectRatio);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch((err) => console.error("Play failed:", err));
    } else {
      video.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);

    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(!video.muted);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate actual font size and adjust based on video aspect ratio
  // Font size 1-17 maps to pixel sizes
  const fontSizeMap: { [key: number]: number } = {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 22,
    7: 24,
    8: 26,
    9: 28,
    10: 32,
    11: 36,
    12: 40,
    13: 44,
    14: 48,
    15: 54,
    16: 60,
    17: 72,
  };
  const baseFontSize = typeof fontSize === "number" ? fontSizeMap[fontSize] || 24 : 24;

  // Adjust font size based on platform/aspect ratio
  // YouTube (16:9 = 1.778): normal size
  // Instagram square (1:1 = 1.0): 75% size
  // TikTok vertical (9:16 = 0.5625): 65% size
  let fontSizeMultiplier = 1;
  if (videoAspectRatio < 0.75) {
    // Vertical video (TikTok-like)
    fontSizeMultiplier = 0.65;
  } else if (videoAspectRatio < 1.3) {
    // Square or portrait (Instagram-like)
    fontSizeMultiplier = 0.75;
  }

  const actualFontSize = Math.round(baseFontSize * fontSizeMultiplier);

  // Adjust caption max width based on video aspect ratio
  let captionMaxWidth = "90%"; // YouTube default
  if (videoAspectRatio < 0.75) {
    // Vertical video (TikTok-like)
    captionMaxWidth = "35%";
  } else if (videoAspectRatio < 1.3) {
    // Square or portrait (Instagram-like)
    captionMaxWidth = "55%";
  }

  // Convert hex color + opacity to rgba
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  const textColorWithOpacity = hexToRgba(textColor, textOpacity);
  const bgColorWithOpacity = hexToRgba(bgColor, bgOpacity);

  return (
    <div className="w-full">
      {/* Video Container */}
      <div className="relative w-full bg-black rounded-t-lg overflow-hidden">
        {/* Video Element */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video"
          playsInline
        />

        {/* Caption Overlay */}
        {showCaptions && currentCaption && (
          <div
            className={`absolute left-0 right-0 px-6 pointer-events-none flex justify-center ${
              position === "top" ? "top-8" : "bottom-8"
            }`}
          >
            <div
              className="px-4 py-2 rounded-lg text-center"
              style={{
                fontFamily: font,
                fontSize: `${actualFontSize}px`,
                color: textColorWithOpacity,
                backgroundColor: bgColorWithOpacity,
                lineHeight: 1.3,
                fontWeight: 600,
                maxWidth: captionMaxWidth,
              }}
            >
              {currentCaption}
            </div>
          </div>
        )}
      </div>

      {/* Custom Controls - All in one line matching reference image */}
      <div className="bg-[#FAF9F5] rounded-b-lg px-4 py-3 border-t border-brand-border-light">
        <div className="flex items-center gap-3">
          {/* Play/Pause Button - Circular */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[#E1DACD] flex items-center justify-center text-brand-black hover:opacity-80 transition-colors flex-shrink-0"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {/* Current Time */}
          <span className="text-brand-black text-sm font-medium tabular-nums flex-shrink-0">
            {formatTime(currentTime)}
          </span>

          {/* Progress Bar - Takes up remaining space */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-runnable-track]:h-1.5
              [&::-webkit-slider-runnable-track]:rounded-lg
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[#14b8a6]
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-sm
              [&::-webkit-slider-thumb]:-mt-0.5
              [&::-moz-range-track]:h-1.5
              [&::-moz-range-track]:rounded-lg
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-[#14b8a6]
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer"
            style={{
              background: `linear-gradient(to right, #14b8a6 ${(currentTime / (duration || 1)) * 100}%, #e5e7eb ${(currentTime / (duration || 1)) * 100}%)`,
            }}
          />

          {/* Total Duration */}
          <span className="text-brand-black text-sm font-medium tabular-nums flex-shrink-0">
            {formatTime(duration)}
          </span>

          {/* Volume Button */}
          <button
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center text-brand-black hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <SpeakerSlash size={22} weight="fill" />
            ) : (
              <SpeakerHigh size={22} weight="fill" />
            )}
          </button>

          {/* Caption Toggle Icon */}
          <button
            className="w-8 h-8 flex items-center justify-center text-brand-black hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Toggle Captions"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect
                x="2"
                y="4"
                width="20"
                height="16"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect x="5" y="10" width="6" height="4" rx="1" />
              <rect x="13" y="10" width="6" height="4" rx="1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Parse VTT, SRT, or ASS subtitle file
function parseSubtitles(text: string): CaptionCue[] {
  const cues: CaptionCue[] = [];

  // Handle ASS format (Advanced SubStation Alpha)
  if (text.includes("[Events]") || text.includes("Dialogue:")) {
    const lines = text.split("\n");
    let inEvents = false;

    for (const line of lines) {
      if (line.trim() === "[Events]") {
        inEvents = true;
        continue;
      }
      if (line.trim().startsWith("[") && inEvents) {
        break;
      }
      if (!inEvents || !line.startsWith("Dialogue:")) continue;

      const parts = line.substring(9).split(",");
      if (parts.length < 10) continue;

      const startStr = parts[1].trim();
      const endStr = parts[2].trim();
      const text = parts.slice(9).join(",").trim();

      const start = parseASSTime(startStr);
      const end = parseASSTime(endStr);

      const cleanText = text.replace(/\{[^}]*\}/g, "").trim();

      if (start !== null && end !== null && cleanText) {
        cues.push({ start, end, text: cleanText });
      }
    }
  }
  // Handle VTT format
  else if (text.includes("WEBVTT")) {
    const blocks = text.split("\n\n").slice(1);

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      if (lines.length < 2) continue;

      const timelineIndex = lines.findIndex((line) => line.includes("-->"));
      if (timelineIndex === -1) continue;

      const timeline = lines[timelineIndex];
      const textLines = lines.slice(timelineIndex + 1);

      const [startStr, endStr] = timeline.split("-->").map((s) => s.trim());
      const start = parseVTTTime(startStr);
      const end = parseVTTTime(endStr);
      const captionText = textLines.join(" ").replace(/<[^>]*>/g, "");

      if (start !== null && end !== null) {
        cues.push({ start, end, text: captionText });
      }
    }
  }
  // Handle SRT format
  else {
    const blocks = text.split("\n\n");

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      if (lines.length < 3) continue;

      const timeline = lines[1];
      const textLines = lines.slice(2);

      const [startStr, endStr] = timeline.split("-->").map((s) => s.trim());
      const start = parseSRTTime(startStr);
      const end = parseSRTTime(endStr);
      const captionText = textLines.join(" ");

      if (start !== null && end !== null) {
        cues.push({ start, end, text: captionText });
      }
    }
  }

  return cues;
}

function parseVTTTime(timeStr: string): number | null {
  const match = timeStr.match(/(\d+):(\d+):(\d+)\.(\d+)|(\d+):(\d+)\.(\d+)/);
  if (!match) return null;

  if (match[1] !== undefined) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const ms = parseInt(match[4], 10);
    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
  } else {
    const minutes = parseInt(match[5], 10);
    const seconds = parseInt(match[6], 10);
    const ms = parseInt(match[7], 10);
    return minutes * 60 + seconds + ms / 1000;
  }
}

function parseSRTTime(timeStr: string): number | null {
  const match = timeStr.match(/(\d+):(\d+):(\d+),(\d+)/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const ms = parseInt(match[4], 10);

  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

function parseASSTime(timeStr: string): number | null {
  const match = timeStr.match(/(\d+):(\d+):(\d+)\.(\d+)/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const centiseconds = parseInt(match[4], 10);

  return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
}
