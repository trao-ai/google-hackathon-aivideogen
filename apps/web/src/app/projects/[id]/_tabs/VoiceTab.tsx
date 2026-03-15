"use client";

import { useState, useRef, useEffect } from "react";
import {
  GenderMaleIcon,
  GenderFemaleIcon,
  RobotIcon,
  PlayIcon,
  CaretDownIcon,
  SpeakerHighIcon,
  ArrowClockwiseIcon,
  SparkleIcon,
  WaveformIcon,
} from "@phosphor-icons/react";
import { api, type ProjectDetail, type Voiceover, type VoicePreset } from "@/lib/api";

type Props = {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
};

/* ── Voice type cards ── */
type VoiceTypeId = "male" | "female" | "ai";

const VOICE_TYPES: {
  id: VoiceTypeId;
  label: string;
  description: string;
  icon: typeof GenderMaleIcon;
}[] = [
  {
    id: "male",
    label: "Male Voice",
    description: "Deep, authoritative",
    icon: GenderMaleIcon,
  },
  {
    id: "female",
    label: "Female Voice",
    description: "Clear, engaging",
    icon: GenderFemaleIcon,
  },
  {
    id: "ai",
    label: "AI Narrator",
    description: "Professional, neutral",
    icon: RobotIcon,
  },
];

const ACCENT_OPTIONS = [
  "US English",
  "UK English",
  "Indian English",
  "Neutral",
];
const TONE_OPTIONS = ["Energetic", "Calm", "Motivational", "Professional"];

const AVAILABLE_VOICES = [
  {
    name: "Rachel",
    gender: "Female",
    accent: "American",
    style: "Clear, engaging",
    bestFor: "Explainers, educational content",
  },
  {
    name: "Adam",
    gender: "Male",
    accent: "American",
    style: "Deep, authoritative",
    bestFor: "Business and documentary videos",
  },
];

/* ── Waveform bars (mock visualization) ── */
const WAVEFORM_BARS = [
  12, 20, 32, 18, 28, 36, 14, 24, 30, 16, 34, 22, 28, 36, 12, 26, 32, 20,
  14, 30, 24, 36, 18, 28, 22, 34, 16, 26, 30, 12, 20, 36, 28, 18, 32, 24,
];

/* ── Dropdown Component ── */
function Dropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-2" ref={ref}>
      <span className="text-base font-medium text-foreground">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-2.5 bg-[#FAF9F5]/50 rounded-xl border border-brand-border-light flex items-center justify-between text-sm font-normal"
        >
          <span className={value ? "text-foreground" : "text-[#a0a0a0]"}>
            {value || placeholder}
          </span>
          <CaretDownIcon
            size={20}
            weight="regular"
            className="text-foreground/50"
          />
        </button>
        {open && (
          <div className="absolute z-10 top-full mt-1 w-full p-2 bg-[#FAF9F5] rounded-xl shadow-[0px_6px_10px_rgba(0,0,0,0.1)] border border-brand-border-light backdrop-blur-[35px] flex flex-col gap-2.5">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm font-normal text-foreground ${
                  value === opt ? "bg-[#F0EEE7]" : "hover:bg-[#F0EEE7]/50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helper ── */
function formatDurationMinutes(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s} seconds`;
  if (s === 0) return `${m} minute${m > 1 ? "s" : ""}`;
  return `${m}m ${s}s`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function VoiceTab({ project, onRefresh }: Props) {
  const [selectedType, setSelectedType] = useState<VoiceTypeId>("female");
  const [accent, setAccent] = useState("");
  const [tone, setTone] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Rachel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [presets, setPresets] = useState<VoicePreset[]>([]);

  useEffect(() => {
    api.voice.presets().then(setPresets).catch(() => {});
  }, []);

  const voiceovers: Voiceover[] = project.voiceovers ?? [];
  const latestVoiceover = voiceovers[0];

  /* Show sidebar if we already have a voiceover */
  const showSidebar = generated || !!latestVoiceover;

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    try {
      await api.voice.generate(project.id, selectedVoice.toLowerCase());
      await onRefresh();
      setGenerated(true);
    } catch {
      /* API unavailable — show sidebar with mock data */
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await api.voice.generate(project.id, selectedVoice.toLowerCase());
      await onRefresh();
    } catch {
      /* silently ignore when API is unavailable */
    } finally {
      setLoading(false);
    }
  };

  const durationSec = latestVoiceover?.durationSec ?? 120;
  const segments = latestVoiceover?.segments?.length ?? 11;

  return (
    <div className="flex items-start gap-5">
      {/* Left Content */}
      <div className="flex-1 flex flex-col items-end gap-5">
        {/* Voice Type */}
        <div className="w-full flex flex-col gap-2">
          <span className="text-base font-medium text-foreground">
            Voice Type
          </span>
          <div className="flex items-center gap-5">
            {VOICE_TYPES.map((v) => {
              const Icon = v.icon;
              const isActive = selectedType === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedType(v.id)}
                  className={`flex-1 p-5 rounded-2xl border flex items-start gap-2.5 transition-opacity hover:opacity-90 ${
                    isActive
                      ? "bg-[#FAF9F5]/70 border-foreground/70"
                      : "bg-[#FAF9F5]/50 border-brand-border-light"
                  }`}
                >
                  <div className="size-11 p-3.5 bg-secondary rounded-xl flex items-center justify-center">
                    <Icon
                      size={24}
                      weight="regular"
                      className="text-foreground"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-base font-medium text-foreground">
                      {v.label}
                    </span>
                    <span className="text-sm font-normal text-brand-foreground-70">
                      {v.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent & Emotion Row */}
        <div className="w-full flex items-start gap-7">
          <Dropdown
            label="Accent"
            placeholder="Select an accent"
            options={ACCENT_OPTIONS}
            value={accent}
            onChange={setAccent}
          />
          <Dropdown
            label="Emotion & Tone"
            placeholder="Select emotion and tone"
            options={TONE_OPTIONS}
            value={tone}
            onChange={setTone}
          />
        </div>

        {/* Generate Voice Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2.5 bg-brand-black rounded-full text-[15px] font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Voice"}
        </button>

        {error && (
          <p className="w-full text-sm text-brand-red">{error}</p>
        )}

        {/* Available Voices */}
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-medium text-foreground">
              Available Voices
            </span>
            <span className="text-sm font-medium text-brand-foreground-70">
              Select from a library of AI voices and preview how they sound in
              your video.
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {AVAILABLE_VOICES.map((voice) => {
              const isActive = selectedVoice === voice.name;
              return (
                <button
                  key={voice.name}
                  type="button"
                  onClick={() => setSelectedVoice(voice.name)}
                  className={`w-full px-4 py-2.5 rounded-2xl border flex items-center justify-between overflow-hidden ${
                    isActive
                      ? "bg-[#FAF9F5] border-foreground/70"
                      : "bg-[#FAF9F5]/50 border-brand-border-light"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar placeholder */}
                    <div className="size-[52px] bg-secondary rounded-full shrink-0" />
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-[15px] font-semibold text-foreground">
                        {voice.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-normal text-brand-foreground-70">
                          {voice.gender}
                        </span>
                        <span className="text-sm font-normal text-brand-foreground-70">
                          &bull; {voice.accent}
                        </span>
                        <span className="text-sm font-normal text-brand-foreground-70">
                          &bull; {voice.style}
                        </span>
                      </div>
                      <span className="text-xs font-normal text-brand-indigo">
                        Best for: {voice.bestFor}
                      </span>
                    </div>
                  </div>
                  <div className="size-11 p-2.5 bg-secondary rounded-full flex items-center justify-center">
                    <PlayIcon
                      size={20}
                      weight="regular"
                      className="text-foreground"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar — shown after Generate Voice or if voiceover exists */}
      {showSidebar && (
        <div className="w-[442px] shrink-0 flex flex-col gap-7">
          {/* Audio Preview Card */}
          <div className="p-5 bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <WaveformIcon size={20} weight="regular" className="text-foreground" />
              <span className="text-xl font-semibold text-foreground capitalize">
                Audio Preview
              </span>
            </div>

            {/* Waveform Visualization */}
            <div className="w-full h-24 bg-[#E1DACD99] rounded-2xl flex items-center justify-center gap-[5px] overflow-hidden">
              {WAVEFORM_BARS.map((h, i) => (
                <div
                  key={i}
                  className={`w-[31px] rounded-sm ${
                    i % 3 === 1
                      ? "bg-foreground/50"
                      : i % 5 === 0
                        ? "bg-foreground/70"
                        : "bg-foreground"
                  }`}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="size-[38px] p-2.5 bg-secondary rounded-full flex items-center justify-center"
              >
                <PlayIcon size={20} weight="fill" className="text-foreground" />
              </button>
              <span className="text-sm font-normal text-brand-foreground-70">
                00:20
              </span>
              <div className="flex-1 h-2 bg-brand-border-light rounded-full overflow-hidden">
                <div className="w-1/6 h-full bg-brand-green rounded-full" />
              </div>
              <span className="text-sm font-normal text-brand-foreground-70">
                {formatTime(durationSec)}
              </span>
              <SpeakerHighIcon
                size={20}
                weight="regular"
                className="text-[#777777]"
              />
            </div>

            {/* Duration & Segments */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-normal text-brand-foreground-70">
                  Duration
                </span>
                <span className="text-[15px] font-normal text-foreground">
                  {formatDurationMinutes(durationSec)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-normal text-brand-foreground-70">
                  Segments
                </span>
                <span className="text-[15px] font-normal text-foreground">
                  {segments}
                </span>
              </div>
            </div>

            {/* Re-Generate Button */}
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-[#FAF9F5]/50 rounded-full border border-brand-border-light flex items-center justify-center gap-2 text-[15px] font-medium text-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <ArrowClockwiseIcon size={20} weight="regular" />
              Re-Generate Voice
            </button>
          </div>

          {/* AI Suggestion */}
          <div className="p-4 bg-gradient-to-br from-[#5379FF33] to-[#00A19133] rounded-2xl border border-[#5678FC80] flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <SparkleIcon
                size={20}
                weight="fill"
                className="text-brand-indigo"
              />
              <span className="text-base font-semibold text-foreground">
                AI Suggestion
              </span>
            </div>
            <p className="text-sm font-normal text-brand-foreground-70">
              Energetic female voice works best for your topic and target
              audience based on engagement data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
