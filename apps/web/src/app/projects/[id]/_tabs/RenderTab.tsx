"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SpeakerHigh,
  DownloadSimple,
  Copy,
  ArrowsClockwise,
  CircleNotch,
} from "@phosphor-icons/react";
import type { ProjectDetail } from "@/lib/api";
import { useRenders, useStartRender } from "@/hooks/use-renders";
import { useExports, useStartExport } from "@/hooks/use-exports";
import { formatDuration, formatCost } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";
import type { Render } from "@/types/api";

/* ── Mock data ── */
const MOCK_TITLES = [
  "How Disney's $5 Churro Beat Disney+ in Profit",
  "The Surprising Reason Disney's Churros Make More Money Than Disney+",
  "Why Disney's Most Profitable Product Isn't Streaming",
];

const MOCK_DESCRIPTION = `Did you know a simple churro in Disney parks can generate higher profits than Disney+?

In this video we break down the surprising economics behind Disney's theme park snacks and its billion-dollar streaming platform.

Learn how high-margin physical products can outperform large digital services and what this reveals about modern entertainment business models.`;

const MOCK_TAGS = [
  [
    "Disney business",
    "Disney business",
    "Disney churros",
    "Disney parks economics",
    "Disney+ vs theme parks",
  ],
  [
    "business case study",
    "entertainment industry",
    "viral business stories",
    "streaming business model",
  ],
];

const MOCK_CATEGORIES = ["Education", "Business & Finance"];

const MOCK_HASHTAGS = [
  "#Disney",
  "#BusinessStrategy",
  "#ThemeParks",
  "#EntertainmentEconomics",
];

const FORMAT_OPTIONS = ["MP4", "MOV", "WebM"];
const RESOLUTION_OPTIONS = ["720p", "1080p", "4K"];
const QUALITY_OPTIONS = ["Standard", "High", "Ultra"];
const WATERMARK_OPTIONS = [
  "No Watermark",
  "Add Platform Watermark",
  "Custom Watermark",
];

function renderStepLabel(step: string | null | undefined): string {
  switch (step) {
    case "downloading_clips":
      return "Downloading scene clips...";
    case "generating_sfx":
      return "Generating AI sound design...";
    case "composing":
      return "Composing video with FFmpeg...";
    case "uploading":
      return "Uploading final video...";
    default:
      return "Rendering in progress...";
  }
}

interface Props {
  project: ProjectDetail;
}

/* ── Chip component for option pills ── */
function OptionChip({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg border border-brand-border-light text-sm transition-colors ${
        disabled
          ? "opacity-40 cursor-not-allowed bg-brand-off-white/50 text-foreground"
          : selected
            ? "bg-brand-black text-brand-off-white"
            : "bg-brand-off-white/50 text-foreground hover:bg-brand-beige/30"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Copiable text row ── */
function CopyRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="px-4 py-3.5 rounded-xl border border-brand-border-light flex items-center justify-between gap-3 overflow-hidden"
      style={{ backgroundColor: "#E1DACD4D" }}
    >
      <span className="flex-1 text-sm text-foreground">{text}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 text-brand-foreground-50 hover:text-foreground transition-colors"
      >
        <Copy size={20} weight="regular" />
      </button>
    </div>
  );
}

/* ── Tag chip with copy ── */
function TagChip({ label }: { label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(label);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-4 py-3 bg-brand-off-white/50 rounded-lg border border-brand-border-light flex items-center gap-2.5 text-sm text-foreground hover:bg-brand-beige/30 transition-colors"
    >
      {label}
      <Copy size={20} weight="regular" className="text-brand-foreground-50" />
    </button>
  );
}

/* ── Section header with regenerate button ── */
function SectionHeader({
  title,
  subtitle,
  buttonLabel,
  onRegenerate,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onRegenerate: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h4 className="text-sm font-normal text-foreground">{title}</h4>
        <p className="text-xs text-brand-foreground-70">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onRegenerate}
        className="shrink-0 px-4 py-2.5 bg-brand-black rounded-full flex items-center gap-2 text-sm font-normal text-brand-off-white hover:opacity-90 transition-opacity"
      >
        <ArrowsClockwise size={20} weight="regular" />
        {buttonLabel}
      </button>
    </div>
  );
}

/** Fires a toast once when render fails — avoids re-toasting on every poll */
function RenderFailedToast({ message }: { message: string }) {
  const { toast } = useToast();
  useEffect(() => {
    toast(`Render failed: ${message}`, "error");
  }, [message, toast]);
  return null;
}

export function RenderTab({ project }: Props) {
  const { toast } = useToast();
  const [format, setFormat] = useState("MP4");
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState("High");
  const [watermark, setWatermark] = useState("No Watermark");
  const [includeCaptions, setIncludeCaptions] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const { data: renders = [] } = useRenders(project.id);
  const startRender = useStartRender(project.id);

  const scenes = project.scenes ?? [];
  const completedRenderForExports = renders.find((r) => r.status === "complete");
  const { data: exportVariants = [] } = useExports(
    project.id,
    completedRenderForExports?.id,
  );
  const startExport = useStartExport(
    project.id,
    completedRenderForExports?.id,
  );
  const clipCount = scenes.filter((s) => s.clip != null).length;
  const hasAnyClips = clipCount > 0;
  const hasVoiceover = (project.voiceovers ?? []).length > 0;
  const isComposing = project.status === "composition";

  // Find the latest render
  const latestRender: Render | undefined = renders[0];
  const completedRender = renders.find((r) => r.status === "complete");
  const activeRender = renders.find(
    (r) => r.status === "processing" || r.status === "pending",
  );

  const canRender = hasAnyClips && hasVoiceover && !isComposing && !activeRender;

  // Find a matching completed export for current sidebar selections
  const normalizedFormat = format.toLowerCase();
  const normalizedResolution = resolution.toLowerCase();
  const normalizedQuality = quality.toLowerCase();
  const matchingExport = exportVariants.find(
    (e) =>
      e.format === normalizedFormat &&
      e.resolution === normalizedResolution &&
      e.quality === normalizedQuality &&
      e.status === "complete" &&
      e.videoUrl,
  );
  const activeExport = exportVariants.find(
    (e) =>
      e.format === normalizedFormat &&
      e.resolution === normalizedResolution &&
      e.quality === normalizedQuality &&
      (e.status === "processing" || e.status === "pending"),
  );
  const isExporting = startExport.isPending || !!activeExport;

  const handleRender = () => {
    startRender.mutate(undefined, {
      onError: (err) => toast(err.message, "error"),
    });
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const downloadFile = async (fileUrl: string, filename: string) => {
    setIsDownloading(true);
    try {
      const resp = await fetch(fileUrl);
      if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast("Download failed. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadViaProxy = (params: {
    type: "render" | "export" | "subtitle";
    exportId?: string;
    filename: string;
  }) => {
    if (!completedRender) return;
    const qs = new URLSearchParams({
      type: params.type,
      filename: params.filename,
      ...(params.exportId ? { exportId: params.exportId } : {}),
    });
    const url = `${apiBase}/api/projects/${project.id}/renders/${completedRender.id}/download?${qs}`;
    // Use direct navigation to avoid CORS — the API sets Content-Disposition: attachment
    const link = document.createElement("a");
    link.href = url;
    link.download = params.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    startExport.mutate(
      {
        format: normalizedFormat,
        resolution: normalizedResolution,
        quality: normalizedQuality,
      },
      { onError: (err) => toast(err.message, "error") },
    );
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setVideoDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !videoDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * videoDuration;
  };

  const progressPct = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;
  const displayDuration = completedRender?.durationSec ?? 0;
  const displayCost = project.totalCostUsd ?? 0;
  const displayDate = completedRender
    ? new Date(completedRender.createdAt)
    : new Date();

  return (
    <div className="flex flex-col gap-5">
      {/* Prerequisite warnings */}
      {!hasAnyClips && (
        <p className="rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800 border border-yellow-200">
          Generate at least one scene video before rendering.
        </p>
      )}
      {hasAnyClips && !hasVoiceover && (
        <p className="rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800 border border-yellow-200">
          Generate a voiceover before rendering.
        </p>
      )}
      {hasAnyClips && clipCount < scenes.length && (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 border border-blue-200">
          {clipCount} of {scenes.length} scenes have clips. The render will use the available clips.
        </p>
      )}
      {activeRender && (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 border border-blue-200">
          {renderStepLabel(activeRender.step)}
        </p>
      )}
      {latestRender?.status === "failed" && latestRender.errorMsg && (
        <RenderFailedToast message={latestRender.errorMsg} />
      )}

      {/* Top row: Video preview + Export sidebar */}
      <div className="flex gap-5 items-start">
        {/* Video Preview */}
        <div className="flex-1 min-w-0 p-3.5 bg-brand-surface rounded-2xl border border-brand-border-light flex flex-col gap-4 overflow-hidden">
          {/* Video player area */}
          <div className="relative w-full aspect-[13/8] bg-brand-beige rounded-2xl overflow-hidden">
            {completedRender?.videoUrl ? (
              <video
                ref={videoRef}
                src={completedRender.videoUrl}
                className="absolute inset-0 w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={completedRender?.videoUrl ? togglePlay : handleRender}
                disabled={!completedRender?.videoUrl && !canRender}
                className="w-12 h-12 bg-brand-surface rounded-full flex items-center justify-center disabled:opacity-50"
              >
                {activeRender || startRender.isPending ? (
                  <CircleNotch
                    size={24}
                    weight="bold"
                    className="text-foreground animate-spin"
                  />
                ) : isPlaying ? (
                  <Pause
                    size={24}
                    weight="fill"
                    className="text-foreground"
                  />
                ) : (
                  <Play
                    size={24}
                    weight="fill"
                    className="text-foreground ml-0.5"
                  />
                )}
              </button>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
              <button
                type="button"
                onClick={completedRender?.videoUrl ? togglePlay : undefined}
                className="w-9 h-9 bg-brand-beige rounded-full flex items-center justify-center shrink-0"
              >
                {isPlaying ? (
                  <Pause size={20} weight="regular" className="text-foreground" />
                ) : (
                  <Play
                    size={20}
                    weight="regular"
                    className="text-foreground ml-0.5"
                  />
                )}
              </button>
              <span className="text-sm text-brand-off-white">
                {formatDuration(currentTime)}
              </span>
              <div
                className="flex-1 h-2 bg-brand-border-light rounded-xl overflow-hidden cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-brand-green rounded-xl transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-sm text-brand-off-white">
                {formatDuration(videoDuration || displayDuration)}
              </span>
              <SpeakerHigh
                size={20}
                weight="regular"
                className="text-brand-off-white"
              />
            </div>
          </div>

          {/* Video info */}
          <div className="flex flex-col gap-0">
            <h3 className="text-lg font-medium text-foreground">
              {project.title}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="pr-2 border-r border-brand-border-light text-xs text-brand-foreground-70">
                  Duration: {displayDuration > 0 ? formatDuration(displayDuration) : "—"}
                </span>
                <span className="text-xs text-brand-foreground-70">
                  Total Cost: {formatCost(displayCost)}
                </span>
              </div>
              <div className="pl-2 border-l border-brand-border-light flex items-center gap-1.5">
                <span className="text-xs text-brand-foreground-50">
                  {displayDate.toLocaleDateString()},
                </span>
                <span className="text-xs text-brand-foreground-50">
                  {displayDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Export Sidebar */}
        <div className="w-[400px] shrink-0 p-3.5 bg-brand-surface rounded-2xl border border-brand-border-light flex flex-col gap-3 overflow-hidden">
          <h3 className="text-lg font-normal text-foreground capitalize">
            Export Video
          </h3>

          <div className="flex flex-col gap-4">
            {/* Format */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-normal text-foreground">
                Format
              </span>
              <div className="flex items-center gap-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt}
                    label={opt}
                    selected={format === opt}
                    onClick={() => setFormat(opt)}
                  />
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-light text-foreground">
                Resolution
              </span>
              <div className="flex items-center gap-2">
                {RESOLUTION_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt}
                    label={opt}
                    selected={resolution === opt}
                    onClick={() => setResolution(opt)}
                    disabled={opt === "4K"}
                  />
                ))}
              </div>
            </div>

            {/* Video Quality */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-light text-foreground">
                Video Quality
              </span>
              <div className="flex items-center gap-2">
                {QUALITY_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt}
                    label={opt}
                    selected={quality === opt}
                    onClick={() => setQuality(opt)}
                  />
                ))}
              </div>
            </div>

            {/* Watermark */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-normal text-foreground">
                Watermark
              </span>
              <div className="flex items-center gap-2">
                {WATERMARK_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt}
                    label={opt}
                    selected={watermark === opt}
                    onClick={() => setWatermark(opt)}
                  />
                ))}
              </div>
            </div>

            {/* Captions & Subtitles */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-normal text-foreground">
                  Captions & Subtitles
                </span>
                <span className="text-xs text-brand-foreground-70">
                  Download subtitle files generated from the AI narration.
                </span>
              </div>

              <div className="px-3 py-2.5 bg-brand-off-white/50 rounded-lg border border-brand-border-light flex items-center justify-between">
                <span className="text-sm text-foreground">
                  Include captions in video
                </span>
                <button
                  type="button"
                  onClick={() => setIncludeCaptions(!includeCaptions)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    includeCaptions ? "bg-brand-black" : "bg-brand-border-light"
                  }`}
                >
                  <div
                    className={`w-[18px] h-[18px] rounded-full bg-brand-off-white absolute top-[3px] transition-all ${
                      includeCaptions ? "left-6" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {completedRender?.subtitleUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      downloadViaProxy({
                        type: "subtitle",
                        filename: `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}.ass`,
                      })
                    }
                    className="px-2 py-1 bg-brand-off-white/50 rounded-lg border border-brand-border-light text-sm text-foreground hover:bg-brand-beige/30 transition-colors"
                  >
                    Download Subtitles
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled
                      className="px-2 py-1 bg-brand-off-white/50 rounded-lg border border-brand-border-light text-sm text-foreground opacity-50 cursor-not-allowed"
                    >
                      Download SRT
                    </button>
                    <button
                      type="button"
                      disabled
                      className="px-2 py-1 bg-brand-off-white/50 rounded-lg border border-brand-border-light text-sm text-foreground opacity-50 cursor-not-allowed"
                    >
                      Download VTT
                    </button>
                    <button
                      type="button"
                      disabled
                      className="px-2 py-1 bg-brand-off-white/50 rounded-lg border border-brand-border-light text-sm text-foreground opacity-50 cursor-not-allowed"
                    >
                      Download Transcript
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* File Size */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-brand-foreground-70">File Size</span>
            <span className="text-sm text-foreground">
              {matchingExport?.fileSizeBytes
                ? `${(matchingExport.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`
                : "—"}
            </span>
          </div>

          {/* Export status */}
          {activeExport && (
            <p className="text-xs text-blue-700">
              {activeExport.step === "downloading"
                ? "Downloading source..."
                : activeExport.step === "transcoding"
                  ? "Transcoding video..."
                  : activeExport.step === "uploading"
                    ? "Uploading..."
                    : "Processing..."}
            </p>
          )}

          {/* Download / Export / Render Button */}
          {completedRender?.videoUrl ? (
            <div className="flex flex-col gap-2">
              {/* Primary: Download (raw render or matching export) */}
              <button
                type="button"
                onClick={() => {
                  if (matchingExport?.videoUrl) {
                    downloadViaProxy({
                      type: "export",
                      exportId: matchingExport.id,
                      filename: `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}.${normalizedFormat}`,
                    });
                  } else {
                    downloadViaProxy({
                      type: "render",
                      filename: `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`,
                    });
                  }
                }}
                disabled={isDownloading}
                className="w-full px-4 py-2.5 bg-brand-black rounded-full flex items-center justify-center gap-2 text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <CircleNotch size={20} weight="bold" className="animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <DownloadSimple size={20} weight="regular" />
                    Download Video
                  </>
                )}
              </button>
              {/* Secondary: Export with selected format/res/quality */}
              {!matchingExport?.videoUrl && (
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full px-4 py-2.5 bg-brand-off-white/50 rounded-full flex items-center justify-center gap-2 text-sm font-normal text-foreground border border-brand-border-light hover:bg-brand-beige/30 transition-colors disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <CircleNotch size={20} weight="bold" className="animate-spin" />
                      Exporting {format} {resolution}...
                    </>
                  ) : (
                    <>
                      <DownloadSimple size={20} weight="regular" />
                      Export as {format} {resolution}
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleRender}
                disabled={!canRender || startRender.isPending}
                className="w-full px-4 py-2.5 bg-brand-off-white/50 rounded-full flex items-center justify-center gap-2 text-sm font-normal text-foreground border border-brand-border-light hover:bg-brand-beige/30 transition-colors disabled:opacity-50"
              >
                {activeRender || startRender.isPending ? (
                  <>
                    <CircleNotch size={20} weight="bold" className="animate-spin" />
                    Re-rendering...
                  </>
                ) : (
                  <>
                    <ArrowsClockwise size={20} weight="regular" />
                    Re-render Video
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRender}
              disabled={!canRender || startRender.isPending}
              className="w-full px-4 py-2.5 bg-brand-black rounded-full flex items-center justify-center gap-2 text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {activeRender || startRender.isPending ? (
                <>
                  <CircleNotch size={20} weight="bold" className="animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <DownloadSimple size={20} weight="regular" />
                  Render Video
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* AI YouTube Optimization — aligned with video player width */}
      <div
        className="flex flex-col gap-3"
        style={{ maxWidth: "calc(100% - 400px - 1.25rem)" }}
      >
        <h3 className="text-lg font-medium text-foreground">
          AI YouTube Optimization
        </h3>

        {/* Suggested Titles */}
        <div className="flex flex-col gap-2">
          <SectionHeader
            title="Suggested Titles"
            subtitle="AI-generated title ideas optimized for search visibility and viewer engagement."
            buttonLabel="Regenerate Titles"
            onRegenerate={() => {}}
          />
          <div className="flex flex-col gap-3">
            {MOCK_TITLES.map((title) => (
              <CopyRow key={title} text={title} />
            ))}
          </div>
        </div>

        {/* Suggested Description */}
        <div className="flex flex-col gap-3">
          <SectionHeader
            title="Suggested Description"
            subtitle="AI-generated video description optimized for YouTube search and audience engagement."
            buttonLabel="Regenerate Description"
            onRegenerate={() => {}}
          />
          <div className="px-4 py-3.5 rounded-xl border border-brand-border-light flex items-start justify-between gap-3 overflow-hidden" style={{ backgroundColor: "#E1DACD4D" }}>
            <p className="flex-1 text-sm text-foreground whitespace-pre-line">
              {MOCK_DESCRIPTION}
            </p>
            <button
              type="button"
              className="shrink-0 text-brand-foreground-50 hover:text-foreground transition-colors mt-0.5"
            >
              <Copy size={20} weight="regular" />
            </button>
          </div>
        </div>

        {/* Suggested Tags */}
        <div className="flex flex-col gap-3">
          <SectionHeader
            title="Suggested Tags"
            subtitle="Tags help YouTube understand the topic of the video."
            buttonLabel="Regenerate Tags"
            onRegenerate={() => {}}
          />
          <div className="flex flex-col gap-3">
            {MOCK_TAGS.map((row, i) => (
              <div key={i} className="flex items-center gap-3 flex-wrap">
                {row.map((tag, j) => (
                  <TagChip key={`${i}-${j}`} label={tag} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Video Category */}
        <div className="flex flex-col gap-3">
          <SectionHeader
            title="Suggested Video Category"
            subtitle="Suggested category based on your video topic to improve content classification."
            buttonLabel="Regenerate Video Category"
            onRegenerate={() => {}}
          />
          <div className="flex items-center gap-3">
            {MOCK_CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="px-4 py-3 bg-brand-off-white/50 rounded-lg border border-brand-border-light text-sm text-foreground"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Suggested Hashtags */}
        <div className="flex flex-col gap-3">
          <SectionHeader
            title="Suggested Hashtags"
            subtitle="Recommended hashtags to help your video appear in relevant searches and trends."
            buttonLabel="Regenerate Hashtags"
            onRegenerate={() => {}}
          />
          <div className="flex items-center gap-3 flex-wrap">
            {MOCK_HASHTAGS.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
