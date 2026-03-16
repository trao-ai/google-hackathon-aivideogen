"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  GenderMaleIcon,
  GenderFemaleIcon,
  RobotIcon,
  PlayIcon,
  PauseIcon,
  CaretDownIcon,
  SpeakerHighIcon,
  ArrowClockwiseIcon,
  SparkleIcon,
  WaveformIcon,
  CheckIcon,
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
  { id: "male", label: "Male Voice", description: "Deep, authoritative", icon: GenderMaleIcon },
  { id: "female", label: "Female Voice", description: "Clear, engaging", icon: GenderFemaleIcon },
  { id: "ai", label: "AI Narrator", description: "Professional, neutral", icon: RobotIcon },
];

const ACCENT_OPTIONS = ["US English", "UK English", "Indian English", "Neutral"];
const TONE_OPTIONS = ["Energetic", "Calm", "Motivational", "Professional"];
const AGE_OPTIONS = ["All Ages", "Young", "Middle Aged", "Old"];
const USE_CASE_OPTIONS = ["All", "Narration", "Characters", "Conversational", "News"];

/** Map UI accent label → ElevenLabs accent strings for filtering */
const ACCENT_FILTER_MAP: Record<string, string[]> = {
  "US English": ["american"],
  "UK English": ["british"],
  "Indian English": ["indian"],
  "Neutral": [], // empty = show all
};

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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
          className={`w-full px-4 py-2.5 bg-[#FAF9F5]/50 rounded-xl border flex items-center justify-between text-sm font-normal transition-colors ${
            value ? "border-foreground/40" : "border-brand-border-light"
          }`}
        >
          <span className={value ? "text-foreground font-medium" : "text-[#a0a0a0]"}>
            {value || placeholder}
          </span>
          <CaretDownIcon size={20} weight="regular" className="text-foreground/50" />
        </button>
        {open && (
          <div className="absolute z-10 top-full mt-1 w-full p-2 bg-[#FAF9F5] rounded-xl shadow-[0px_6px_10px_rgba(0,0,0,0.1)] border border-brand-border-light backdrop-blur-[35px] flex flex-col gap-1">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm text-foreground flex items-center justify-between ${
                  value === opt ? "bg-[#F0EEE7] font-medium" : "font-normal hover:bg-[#F0EEE7]/50"
                }`}
              >
                {opt}
                {value === opt && <CheckIcon size={16} weight="bold" className="text-foreground/70 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */
function formatDurationMinutes(sec: number): string {
  const totalSec = Math.round(sec);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s} seconds`;
  if (s === 0) return `${m} minute${m > 1 ? "s" : ""}`;
  return `${m}m ${s}s`;
}

function formatTime(sec: number): string {
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function matchesGender(preset: VoicePreset, type: VoiceTypeId): boolean {
  if (type === "ai") return true;
  const gender = preset.gender?.toLowerCase() ?? "";
  return type === "male" ? gender === "male" : gender === "female";
}

function matchesAccent(preset: VoicePreset, uiAccent: string): boolean {
  if (!uiAccent) return true;
  const allowed = ACCENT_FILTER_MAP[uiAccent];
  if (!allowed || allowed.length === 0) return true; // "Neutral" or unknown → show all
  return allowed.includes(preset.accent?.toLowerCase() ?? "");
}

function matchesAge(preset: VoicePreset, uiAge: string): boolean {
  if (!uiAge || uiAge === "All Ages") return true;
  return (preset.age?.toLowerCase() ?? "") === uiAge.toLowerCase().replace(/\s+/g, "_");
}

function matchesUseCase(preset: VoicePreset, uiUseCase: string): boolean {
  if (!uiUseCase || uiUseCase === "All") return true;
  return (preset.useCase?.toLowerCase() ?? "") === uiUseCase.toLowerCase();
}

export function VoiceTab({ project, onRefresh }: Props) {
  const [selectedType, setSelectedType] = useState<VoiceTypeId>("female");
  const [accent, setAccent] = useState("");
  const [tone, setTone] = useState("");
  const [age, setAge] = useState("");
  const [useCase, setUseCase] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [presets, setPresets] = useState<VoicePreset[]>([]);

  /* ── Audio playback state ── */
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  /* ── Voice preview playback ── */
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  /* Fetch voice presets */
  useEffect(() => {
    api.voice.presets().then((data) => {
      setPresets(data);
      if (data.length > 0 && !selectedVoice) setSelectedVoice(data[0].key);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const voiceovers: Voiceover[] = project.voiceovers ?? [];
  const latestVoiceover = voiceovers[0];

  /* Reset audio when voiceover changes */
  const audioUrl = latestVoiceover?.audioUrl ?? null;
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }, [audioUrl]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (previewAudioRef.current) { previewAudioRef.current.pause(); setPreviewingVoice(null); }
    if (isPlaying) audio.pause(); else audio.play();
  }, [isPlaying, audioUrl]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleEnded = useCallback(() => { setIsPlaying(false); setCurrentTime(0); }, []);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !audioUrl) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * (latestVoiceover?.durationSec ?? audio.duration ?? 0);
    },
    [audioUrl, latestVoiceover?.durationSec],
  );

  /* ── Voice preview ── */
  const togglePreview = useCallback((preset: VoicePreset) => {
    if (!preset.previewUrl) return;
    if (previewingVoice === preset.key) {
      previewAudioRef.current?.pause();
      setPreviewingVoice(null);
      return;
    }
    if (previewAudioRef.current) previewAudioRef.current.pause();
    if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
    const audio = new Audio(preset.previewUrl);
    previewAudioRef.current = audio;
    setPreviewingVoice(preset.key);
    audio.play();
    audio.onended = () => setPreviewingVoice(null);
    audio.onerror = () => setPreviewingVoice(null);
  }, [previewingVoice]);

  useEffect(() => { return () => { previewAudioRef.current?.pause(); }; }, []);

  /* ── Filter voices by type + accent + age + useCase ── */
  const filteredVoices = presets.filter(
    (p) =>
      matchesGender(p, selectedType) &&
      matchesAccent(p, accent) &&
      matchesAge(p, age) &&
      matchesUseCase(p, useCase),
  );

  // Auto-select first voice from filtered list when filters change
  useEffect(() => {
    if (filteredVoices.length > 0 && !filteredVoices.some((v) => v.key === selectedVoice)) {
      setSelectedVoice(filteredVoices[0].key);
    }
  }, [selectedType, accent, age, useCase, filteredVoices, selectedVoice]);

  /* ── Generate / Regenerate ── */
  const generateOptions = {
    voice: selectedVoice || undefined,
    tone: tone || undefined,
    accent: accent || undefined,
  };

  const allOptionsSelected = !!selectedVoice && !!tone && !!accent;

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    try {
      await api.voice.generate(project.id, generateOptions);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate voice");
    } finally {
      setLoading(false);
    }
  };

  const durationSec = latestVoiceover?.durationSec ?? 0;
  const segments = latestVoiceover?.segments?.length ?? 0;

  return (
    <div className="flex items-start gap-5 overflow-hidden">
      {/* Left Content */}
      <div className="flex-1 min-w-0 flex flex-col items-end gap-5">
        {/* Voice Type */}
        <div className="w-full flex flex-col gap-2">
          <span className="text-base font-medium text-foreground">Voice Type</span>
          <div className="flex items-center gap-5">
            {VOICE_TYPES.map((v) => {
              const Icon = v.icon;
              const isActive = selectedType === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedType(v.id)}
                  className={`flex-1 min-w-0 p-5 rounded-2xl border-2 flex items-start gap-2.5 transition-all hover:opacity-90 ${
                    isActive
                      ? "bg-[#FAF9F5] border-foreground/70 shadow-sm"
                      : "bg-[#FAF9F5]/50 border-brand-border-light"
                  }`}
                >
                  <div className={`size-11 p-3.5 rounded-xl flex items-center justify-center ${
                    isActive ? "bg-foreground/10" : "bg-secondary"
                  }`}>
                    <Icon size={24} weight={isActive ? "fill" : "regular"} className="text-foreground" />
                  </div>
                  <div className="flex flex-col items-start gap-0.5 min-w-0">
                    <span className="text-base font-medium text-foreground truncate w-full">{v.label}</span>
                    <span className="text-sm font-normal text-brand-foreground-70 truncate w-full">{v.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent & Emotion Row */}
        <div className="w-full flex items-start gap-7">
          <Dropdown label="Accent" placeholder="Select an accent" options={ACCENT_OPTIONS} value={accent} onChange={setAccent} />
          <Dropdown label="Emotion & Tone" placeholder="Select emotion and tone" options={TONE_OPTIONS} value={tone} onChange={setTone} />
        </div>

        {/* Age & Use Case Row */}
        <div className="w-full flex items-start gap-7">
          <Dropdown label="Age" placeholder="All Ages" options={AGE_OPTIONS} value={age} onChange={setAge} />
          <Dropdown label="Use Case" placeholder="All" options={USE_CASE_OPTIONS} value={useCase} onChange={setUseCase} />
        </div>

        {error && <p className="w-full text-sm text-brand-red">{error}</p>}

        {/* Available Voices */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-medium text-foreground">Available Voices</span>
              <span className="text-sm font-medium text-brand-foreground-70">
                Select a voice and click play to preview.
              </span>
            </div>
            {filteredVoices.length > 0 && (
              <span className="text-xs font-medium text-brand-foreground-70 shrink-0">
                {filteredVoices.length} voice{filteredVoices.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto overflow-x-hidden pr-1">
            {filteredVoices.length === 0 && presets.length === 0 && (
              <p className="text-sm text-brand-foreground-70 py-4">Loading voices...</p>
            )}
            {filteredVoices.length === 0 && presets.length > 0 && (
              <p className="text-sm text-brand-foreground-70 py-4">
                No voices match the selected filters. Try changing voice type or accent.
              </p>
            )}
            {filteredVoices.map((voice) => {
              const isActive = selectedVoice === voice.key;
              const isPreviewing = previewingVoice === voice.key;
              // Split "Adam - Engaging, Friendly and Bright" into name + tagline
              const dashIdx = voice.name.indexOf(" - ");
              const displayName = dashIdx > 0 ? voice.name.slice(0, dashIdx) : voice.name;
              const tagline = dashIdx > 0 ? voice.name.slice(dashIdx + 3) : null;
              return (
                <div
                  key={voice.key}
                  onClick={() => setSelectedVoice(voice.key)}
                  className={`w-full px-4 py-3 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all overflow-hidden ${
                    isActive
                      ? "bg-[#FAF9F5] border-foreground/70 shadow-sm"
                      : "bg-[#FAF9F5]/50 border-transparent hover:border-brand-border-light"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`size-10 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold uppercase ${
                    isActive
                      ? "bg-foreground/10 text-foreground"
                      : "bg-secondary text-foreground/60"
                  }`}>
                    {displayName.slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {displayName}
                      </span>
                      {tagline && (
                        <span className="text-xs text-brand-foreground-70 truncate hidden sm:inline">
                          {tagline}
                        </span>
                      )}
                      {voice.gender && (
                        <span className="text-[11px] text-brand-foreground-70 capitalize shrink-0 px-1.5 py-0.5 bg-secondary rounded">
                          {voice.gender}
                        </span>
                      )}
                      {voice.age && (
                        <span className="text-[11px] text-brand-foreground-70 capitalize shrink-0 px-1.5 py-0.5 bg-secondary rounded">
                          {voice.age}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-brand-foreground-70 capitalize truncate">
                        {voice.accent}
                      </span>
                      {voice.personality && (
                        <span className="text-[11px] text-brand-indigo/80 capitalize shrink-0 px-1.5 py-0.5 bg-brand-indigo/10 rounded">
                          {voice.personality}
                        </span>
                      )}
                      {voice.useCase && (
                        <span className="text-[11px] text-brand-foreground-70 capitalize shrink-0 px-1.5 py-0.5 bg-secondary rounded">
                          {voice.useCase}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selected indicator + Preview play */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isActive && (
                      <div className="size-6 rounded-full bg-foreground flex items-center justify-center">
                        <CheckIcon size={14} weight="bold" className="text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); togglePreview(voice); }}
                      disabled={!voice.previewUrl}
                      className="size-9 bg-secondary rounded-full flex items-center justify-center hover:bg-foreground/10 transition-colors disabled:opacity-30"
                    >
                      {isPreviewing ? (
                        <PauseIcon size={16} weight="fill" className="text-foreground" />
                      ) : (
                        <PlayIcon size={16} weight="fill" className="text-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar — always visible */}
      <div className="w-[442px] shrink-0 flex flex-col gap-5">
        {/* Generate / Re-Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !allOptionsSelected}
          className="w-full px-4 py-3 bg-brand-black rounded-full text-[15px] font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            "Generating..."
          ) : latestVoiceover ? (
            <><ArrowClockwiseIcon size={20} weight="regular" /> Re-Generate Voice</>
          ) : (
            "Generate Voice"
          )}
        </button>
        {!allOptionsSelected && !loading && (
          <p className="text-xs text-brand-foreground-70 -mt-3 text-center">
            Select voice type, accent, tone & a voice to generate.
          </p>
        )}

        {/* Audio Preview Card */}
        <div className="p-5 bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <WaveformIcon size={20} weight="regular" className="text-foreground" />
            <span className="text-xl font-semibold text-foreground capitalize">Audio Preview</span>
          </div>

          {/* Waveform */}
          <div className="w-full h-24 bg-[#E1DACD99] rounded-2xl flex items-center justify-center gap-[5px] overflow-hidden">
            {WAVEFORM_BARS.map((h, i) => (
              <div
                key={i}
                className={`w-[31px] rounded-sm ${
                  i % 3 === 1 ? "bg-foreground/50" : i % 5 === 0 ? "bg-foreground/70" : "bg-foreground"
                }`}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleEnded}
            />
          )}

          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              disabled={!audioUrl}
              className="size-[38px] p-2.5 bg-secondary rounded-full flex items-center justify-center disabled:opacity-50"
            >
              {isPlaying ? (
                <PauseIcon size={20} weight="fill" className="text-foreground" />
              ) : (
                <PlayIcon size={20} weight="fill" className="text-foreground" />
              )}
            </button>
            <span className="text-sm font-normal text-brand-foreground-70">{formatTime(currentTime)}</span>
            <div className="flex-1 h-2 bg-brand-border-light rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
              <div
                className="h-full bg-brand-green rounded-full transition-[width] duration-150"
                style={{ width: `${durationSec > 0 ? (currentTime / durationSec) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-normal text-brand-foreground-70">{formatTime(durationSec)}</span>
            <SpeakerHighIcon size={20} weight="regular" className="text-[#777777]" />
          </div>

          {/* Duration & Segments — only show when audio exists */}
          {latestVoiceover && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-normal text-brand-foreground-70">Duration</span>
                <span className="text-[15px] font-normal text-foreground">{formatDurationMinutes(durationSec)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-normal text-brand-foreground-70">Segments</span>
                <span className="text-[15px] font-normal text-foreground">{segments}</span>
              </div>
            </div>
          )}

          {!latestVoiceover && (
            <p className="text-sm text-brand-foreground-70 text-center py-2">
              No audio generated yet. Select options and generate.
            </p>
          )}
        </div>

        {/* AI Suggestion */}
        <div className="p-4 bg-gradient-to-br from-[#5379FF33] to-[#00A19133] rounded-2xl border border-[#5678FC80] flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <SparkleIcon size={20} weight="fill" className="text-brand-indigo" />
            <span className="text-base font-semibold text-foreground">AI Suggestion</span>
          </div>
          <p className="text-sm font-normal text-brand-foreground-70">
            Energetic female voice works best for your topic and target audience based on engagement data.
          </p>
        </div>
      </div>
    </div>
  );
}
