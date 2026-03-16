"use client";

import { useState } from "react";
import {
  Play,
  SpeakerHigh,
  DownloadSimple,
  Copy,
  ArrowsClockwise,
} from "@phosphor-icons/react";

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

/* ── Chip component for option pills ── */
function OptionChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border border-brand-border-light text-sm transition-colors ${
        selected
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

export function RenderTab() {
  const [format, setFormat] = useState("MP4");
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState("High");
  const [watermark, setWatermark] = useState("No Watermark");
  const [includeCaptions, setIncludeCaptions] = useState(true);

  return (
    <div className="flex flex-col gap-5">
      {/* Top row: Video preview + Export sidebar */}
      <div className="flex gap-5 items-start">
        {/* Video Preview */}
        <div className="flex-1 min-w-0 p-3.5 bg-brand-surface rounded-2xl border border-brand-border-light flex flex-col gap-4 overflow-hidden">
          {/* Video player area */}
          <div className="relative w-full aspect-[13/8] bg-brand-beige rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-brand-surface rounded-full flex items-center justify-center">
                <Play
                  size={24}
                  weight="fill"
                  className="text-foreground ml-0.5"
                />
              </div>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
              <button
                type="button"
                className="w-9 h-9 bg-brand-beige rounded-full flex items-center justify-center shrink-0"
              >
                <Play
                  size={20}
                  weight="regular"
                  className="text-foreground ml-0.5"
                />
              </button>
              <span className="text-sm text-brand-off-white">00:20</span>
              <div className="flex-1 h-2 bg-brand-border-light rounded-xl overflow-hidden">
                <div className="w-8 h-full bg-brand-green rounded-xl" />
              </div>
              <span className="text-sm text-brand-off-white">02:00</span>
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
              Why Churros Outperformed Disney+ in the Profit Race
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="pr-2 border-r border-brand-border-light text-xs text-brand-foreground-70">
                  Duration: 2 minutes
                </span>
                <span className="text-xs text-brand-foreground-70">
                  Total Cost: $12
                </span>
              </div>
              <div className="pl-2 border-l border-brand-border-light flex items-center gap-1.5">
                <span className="text-xs text-brand-foreground-50">
                  13/03/2026,
                </span>
                <span className="text-xs text-brand-foreground-50">
                  2:45 PM
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
                <button
                  type="button"
                  className="px-2 py-1 bg-brand-off-white/50 rounded-lg border border-brand-border-light text-sm text-foreground hover:bg-brand-beige/30 transition-colors"
                >
                  Download SRT
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-brand-off-white/50 rounded-lg border border-brand-border-light text-sm text-foreground hover:bg-brand-beige/30 transition-colors"
                >
                  Download VTT
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-brand-off-white/50 rounded-lg border border-brand-border-light text-sm text-foreground hover:bg-brand-beige/30 transition-colors"
                >
                  Download Transcript
                </button>
              </div>
            </div>
          </div>

          {/* File Size */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-brand-foreground-70">File Size</span>
            <span className="text-sm text-foreground">8.5 MB</span>
          </div>

          {/* Download Button */}
          <button
            type="button"
            className="w-full px-4 py-2.5 bg-brand-black rounded-full flex items-center justify-center gap-2 text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity"
          >
            <DownloadSimple size={20} weight="regular" />
            Download Video
          </button>
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
