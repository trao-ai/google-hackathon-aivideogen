"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  GenderMaleIcon,
  GenderFemaleIcon,
  PlayIcon,
  PauseIcon,
  SpeakerHighIcon,
  ArrowClockwiseIcon,
  SparkleIcon,
  WaveformIcon,
} from "@phosphor-icons/react";
import {
  api,
  type ProjectDetail,
  type Voiceover,
  type VoicePreset,
} from "@/lib/api";

type Props = {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
};

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
];

const ACCENT_OPTIONS = [
  "US English",
  "UK English",
  "Indian English",
  "Neutral",
];
const ACCENT_FILTER_MAP: Record<string, string[]> = {
  "US English": ["american"],
  "UK English": ["british"],
  "Indian English": ["indian"],
  Neutral: [], // empty = show all
};

const WAVEFORM_BARS = [
  12, 20, 32, 18, 28, 36, 14, 24, 30, 16, 34, 22, 28, 36, 12, 26, 32, 20, 14,
  30, 24, 36, 18, 28, 22, 34, 16, 26, 30, 12, 20, 36, 28, 18, 32, 24,
];

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
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(preset.accent?.toLowerCase() ?? "");
}

export function VoiceTab({ project, onRefresh }: Props) {
  const [selectedType, setSelectedType] = useState<VoiceTypeId>("female");
  const [accent, setAccent] = useState("");
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

  useEffect(() => {
    api.voice
      .presets()
      .then((data) => {
        setPresets(data);
        if (data.length > 0 && !selectedVoice) setSelectedVoice(data[0].key);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const voiceovers: Voiceover[] = project.voiceovers ?? [];
  const latestVoiceover = voiceovers[0];

  /* Reset audio when voiceover changes — append cache-buster since URL path stays the same */
  const rawAudioUrl = latestVoiceover?.audioUrl ?? null;
  const audioUrl = rawAudioUrl
    ? `${rawAudioUrl}${rawAudioUrl.includes("?") ? "&" : "?"}t=${latestVoiceover?.createdAt ?? Date.now()}`
    : null;
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [audioUrl]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewingVoice(null);
    }
    if (isPlaying) audio.pause();
    else audio.play();
  }, [isPlaying, audioUrl]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !audioUrl) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      audio.currentTime =
        ratio * (latestVoiceover?.durationSec ?? audio.duration ?? 0);
    },
    [audioUrl, latestVoiceover?.durationSec],
  );

  /* ── Voice preview ── */
  const togglePreview = useCallback(
    (preset: VoicePreset) => {
      if (!preset.previewUrl) return;
      if (previewingVoice === preset.key) {
        previewAudioRef.current?.pause();
        setPreviewingVoice(null);
        return;
      }
      if (previewAudioRef.current) previewAudioRef.current.pause();
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      const audio = new Audio(preset.previewUrl);
      previewAudioRef.current = audio;
      setPreviewingVoice(preset.key);
      audio.play();
      audio.onended = () => setPreviewingVoice(null);
      audio.onerror = () => setPreviewingVoice(null);
    },
    [previewingVoice],
  );

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause();
    };
  }, []);

  /* ── Filter voices by type + accent ── */
  const filteredVoices = presets.filter(
    (p) => matchesGender(p, selectedType) && matchesAccent(p, accent),
  );

  // Auto-select first voice from filtered list when filters change
  useEffect(() => {
    if (
      filteredVoices.length > 0 &&
      !filteredVoices.some((v) => v.key === selectedVoice)
    ) {
      setSelectedVoice(filteredVoices[0].key);
    }
  }, [selectedType, accent, filteredVoices, selectedVoice]);

  /* ── Generate / Regenerate ── */
  const projectTone = project.toneKeywords?.[0] ?? undefined;
  const generateOptions = {
    voice: selectedVoice || undefined,
    tone: projectTone,
    accent: accent || undefined,
  };

  const allOptionsSelected = !!selectedVoice && !!accent;

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
    <div className="flex items-start gap-5">
      <div className="flex-1 min-w-0 flex flex-col items-end gap-5">
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
                  className={`flex-1 p-5 rounded-2xl outline outline-1 -outline-offset-1 flex items-start gap-2.5 transition-all hover:opacity-90 ${
                    isActive
                      ? "bg-brand-surface/70 outline-foreground/70"
                      : "bg-brand-surface/50 outline-brand-border-light"
                  }`}
                >
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-brand-beige flex items-center justify-center">
                    <Icon
                      size={24}
                      weight="regular"
                      className="text-foreground"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-base font-normal text-foreground">
                      {v.label}
                    </span>
                    <span className="text-xs text-brand-foreground-70">
                      {v.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent */}
        <div className="w-full flex flex-col gap-2">
          <span className="text-base font-medium text-foreground">Accent</span>
          <div className="flex items-center gap-3">
            {ACCENT_OPTIONS.map((opt) => {
              const isActive = accent === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAccent(opt)}
                  className={`flex-1 p-4 rounded-xl outline outline-1 -outline-offset-1 text-base font-normal text-center text-foreground transition-all ${
                    isActive
                      ? "bg-brand-surface/70 outline-foreground/70"
                      : "bg-brand-surface/50 outline-brand-border-light"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="w-full text-sm text-brand-red">{error}</p>}

        {/* Generate Voice button — right-aligned between accent and voices */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !allOptionsSelected}
          className="px-4 py-2.5 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Voice"}
        </button>

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
            {filteredVoices.length === 0 && presets.length === 0 && (
              <p className="text-sm text-brand-foreground-70 py-4">
                Loading voices...
              </p>
            )}
            {filteredVoices.length === 0 && presets.length > 0 && (
              <p className="text-sm text-brand-foreground-70 py-4">
                No voices match the selected filters. Try changing voice type or
                accent.
              </p>
            )}
            {filteredVoices.map((voice) => {
              const isActive = selectedVoice === voice.key;
              const isPreviewing = previewingVoice === voice.key;
              const dashIdx = voice.name.indexOf(" - ");
              const displayName =
                dashIdx > 0 ? voice.name.slice(0, dashIdx) : voice.name;
              return (
                <div
                  key={voice.key}
                  onClick={() => setSelectedVoice(voice.key)}
                  className={`w-full px-4 py-2.5 rounded-2xl outline outline-1 -outline-offset-1 flex items-center justify-between cursor-pointer transition-all ${
                    isActive
                      ? "bg-brand-surface outline-foreground/70"
                      : "bg-brand-surface/50 outline-brand-border-light hover:outline-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 shrink-0 rounded-full bg-white overflow-hidden flex items-center justify-center">
                      <span className="text-base font-semibold text-foreground">
                        {displayName.slice(0, 2)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        {displayName}
                      </span>
                      <div className="flex items-center gap-2">
                        {voice.gender && (
                          <span className="text-sm text-brand-foreground-70">
                            {voice.gender}
                          </span>
                        )}
                        {voice.accent && (
                          <>
                            <span className="text-sm text-brand-foreground-70">
                              •
                            </span>
                            <span className="text-sm text-brand-foreground-70 capitalize">
                              {voice.accent}
                            </span>
                          </>
                        )}
                        {voice.personality && (
                          <>
                            <span className="text-sm text-brand-foreground-70">
                              •
                            </span>
                            <span className="text-sm text-brand-foreground-70 capitalize">
                              {voice.personality}
                            </span>
                          </>
                        )}
                      </div>
                      {voice.useCase && (
                        <span className="text-xs text-brand-indigo">
                          Best for: {voice.useCase}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Play button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePreview(voice);
                    }}
                    disabled={!voice.previewUrl}
                    className="w-11 h-11 shrink-0 bg-brand-beige rounded-full flex items-center justify-center hover:bg-foreground/10 transition-colors disabled:opacity-30"
                  >
                    {isPreviewing ? (
                      <PauseIcon
                        size={20}
                        weight="regular"
                        className="text-foreground"
                      />
                    ) : (
                      <PlayIcon
                        size={20}
                        weight="regular"
                        className="text-foreground ml-0.5"
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[442px] shrink-0 flex flex-col gap-7">
        {/* Audio Preview Card */}
        <div className="p-5 bg-brand-surface rounded-2xl border border-brand-border-light flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <WaveformIcon
              size={20}
              weight="regular"
              className="text-foreground"
            />
            <span className="text-lg font-normal text-foreground capitalize">
              Audio Preview
            </span>
          </div>

          {/* Waveform */}
          <div
            className="w-full h-24 rounded-2xl flex items-center justify-center gap-0.5 overflow-hidden"
            style={{ backgroundColor: "#E1DACD99" }}
          >
            {WAVEFORM_BARS.map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-sm ${
                  i % 3 === 1
                    ? "bg-foreground/50"
                    : i % 4 === 0
                      ? "bg-foreground/70"
                      : "bg-foreground"
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
              className="w-9 h-9 shrink-0 bg-brand-beige rounded-full flex items-center justify-center disabled:opacity-50"
            >
              {isPlaying ? (
                <PauseIcon
                  size={20}
                  weight="fill"
                  className="text-foreground"
                />
              ) : (
                <PlayIcon
                  size={20}
                  weight="regular"
                  className="text-foreground ml-0.5"
                />
              )}
            </button>
            <span className="text-sm text-brand-foreground-70">
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-2 bg-brand-border-light rounded-xl overflow-hidden cursor-pointer"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-brand-green rounded-xl transition-[width] duration-150"
                style={{
                  width: `${durationSec > 0 ? (currentTime / durationSec) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm text-brand-foreground-70">
              {formatTime(durationSec)}
            </span>
            <SpeakerHighIcon
              size={20}
              weight="regular"
              className="text-brand-foreground-50"
            />
          </div>

          {/* Duration & Segments */}
          {latestVoiceover && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-foreground-70">
                  Duration
                </span>
                <span className="text-sm text-foreground">
                  {formatDurationMinutes(durationSec)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-foreground-70">
                  Segments
                </span>
                <span className="text-sm text-foreground">{segments}</span>
              </div>
            </div>
          )}

          {!latestVoiceover && (
            <p className="text-sm text-brand-foreground-70 text-center py-2">
              No audio generated yet. Select options and generate.
            </p>
          )}

          {latestVoiceover && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !allOptionsSelected}
              className="w-full px-4 py-2.5 bg-brand-surface/50 rounded-full border border-brand-border-light flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-brand-beige/30 transition-colors disabled:opacity-50"
            >
              <ArrowClockwiseIcon size={20} weight="regular" />
              Re-Generate Voice
            </button>
          )}
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
          <p className="text-sm text-brand-foreground-70">
            Energetic female voice works best for your topic and target audience
            based on engagement data.
          </p>
        </div>
      </div>
    </div>
  );
}
