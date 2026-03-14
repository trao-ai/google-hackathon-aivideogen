"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LightningIcon,
  MonitorPlayIcon,
  FilmStripIcon,
  DeviceMobileIcon,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import type {
  ContentCategory,
  TargetPlatform,
  VideoType,
  VideoStyle,
  ToneKeyword,
  CreateProjectFormData,
  PlatformOption,
  VideoTypeOption,
} from "@/types/components";

const CATEGORIES: ContentCategory[] = [
  "Education",
  "Technology",
  "Finance",
  "Motivation",
  "Entertainment",
];

const PLATFORMS: PlatformOption[] = [
  {
    id: "youtube",
    label: "YouTube",
    resolution: "1920 × 1080 px",
    icon: (
      <MonitorPlayIcon
        size={18}
        weight="regular"
        className="text-foreground/70"
      />
    ),
  },
  {
    id: "instagram",
    label: "Instagram (Reels)",
    resolution: "1080 × 1920 px",
    icon: (
      <DeviceMobileIcon
        size={18}
        weight="regular"
        className="text-foreground/70"
      />
    ),
  },
  {
    id: "tiktok",
    label: "TikTok",
    resolution: "1080 × 1920 px",
    icon: (
      <DeviceMobileIcon
        size={18}
        weight="regular"
        className="text-foreground/70"
      />
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    resolution: "1080 × 1920 px",
    icon: (
      <DeviceMobileIcon
        size={18}
        weight="regular"
        className="text-foreground/70"
      />
    ),
  },
];

const VIDEO_TYPES: VideoTypeOption[] = [
  {
    id: "short",
    label: "Short Video",
    duration: "30–60 seconds",
    description: "Perfect for social media",
    icon: (
      <LightningIcon size={24} weight="regular" className="text-foreground" />
    ),
  },
  {
    id: "medium",
    label: "Medium Video",
    duration: "3–5 minutes",
    description: "Detailed explanations",
    icon: (
      <MonitorPlayIcon size={24} weight="regular" className="text-foreground" />
    ),
  },
  {
    id: "long",
    label: "Long Video",
    duration: "8–12 minutes",
    description: "In-depth content",
    icon: (
      <FilmStripIcon size={24} weight="regular" className="text-foreground" />
    ),
  },
];

const VIDEO_STYLES: VideoStyle[] = [
  "Educational",
  "Storytelling",
  "Documentary",
  "Explainer",
  "Viral Social Media",
];

const TONES: ToneKeyword[] = [
  "Professional",
  "Casual",
  "Energetic",
  "Inspirational",
];

function ChipSelect<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: T[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`p-2.5 rounded-2xl border text-normal font-normal transition-colors ${
            selected === option
              ? "bg-brand-surface border-foreground/70"
              : "bg-brand-surface border-brand-border-light"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateProjectFormData>({
    title: "",
    category: null,
    platform: null,
    videoType: null,
    videoStyle: null,
    tone: null,
  });

  const updateForm = <K extends keyof CreateProjectFormData>(
    key: K,
    value: CreateProjectFormData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.category) return;

    setSubmitting(true);
    try {
      const project = await api.projects.create({
        title: form.title.trim(),
        niche: form.category,
        toneKeywords: form.tone ? [form.tone] : undefined,
      });
      router.push(`/projects/${project.id}`);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-full px-6 py-8 flex flex-col gap-5">
        {/* Page Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">
            Create New Project
          </h1>
          <p className="text-lg font-extralight text-foreground/70">
            Set up your video project and let AI help you create engaging
            content
          </p>
        </div>

        {/* Project Name */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-foreground">
            Project Name
          </label>
          <input
            type="text"
            placeholder="e.g., AI in 2026 Explained"
            value={form.title}
            onChange={(e) => updateForm("title", e.target.value)}
            className="px-4 py-3 bg-[#FAF9F5B2] rounded-xl border border-brand-border-light text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* Content Category */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-foreground">
            Content Category
          </label>
          <ChipSelect
            options={CATEGORIES}
            selected={form.category}
            onSelect={(v) => updateForm("category", v)}
          />
        </div>

        {/* Target Platform */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-foreground">
            Target Platform
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.id}
                type="button"
                onClick={() => updateForm("platform", platform.id)}
                className={`flex-1 min-w-44 p-4 rounded-2xl border flex flex-col gap-2 transition-colors ${
                  form.platform === platform.id
                    ? "bg-brand-surface border-foreground/70"
                    : "bg-brand-surface border-brand-border-light"
                }`}
              >
                <span className="text-base flex items-center font-medium text-foreground">
                  {platform.label}
                </span>
                <span className="flex items-center gap-2">
                  {platform.icon}
                  <span className="text-xs text-foreground/70">
                    {platform.resolution}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Configure Your Video */}
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground capitalize">
            Configure Your Video
          </h2>
          <p className="text-base text-muted-foreground">
            Customize the style and format of your AI-generated video
          </p>
        </div>

        {/* Video Type */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-foreground">
            Video Type
          </label>
          <div className="flex items-center gap-4">
            {VIDEO_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => updateForm("videoType", type.id)}
                className={`flex-1 p-4 rounded-2xl border flex flex-col gap-2 transition-colors bg-[#FAF9F5B2] ${
                  form.videoType === type.id
                    ? "bg-brand-surface border-foreground/70"
                    : "bg-brand-surface border-brand-border-light"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="size-11 p-2.5 bg-secondary rounded-xl flex items-center justify-center">
                    {type.icon}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base font-medium text-[#141413] text-left">
                      {type.label}
                    </span>
                    <span className="text-sm text-[#141413B2] text-left">
                      {type.duration}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[#14141380] text-left">
                  {type.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Video Style */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-foreground">
            Video Style
          </label>
          <ChipSelect
            options={VIDEO_STYLES}
            selected={form.videoStyle}
            onSelect={(v) => updateForm("videoStyle", v)}
          />
        </div>

        {/* Tone */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-foreground">Tone</label>
          <ChipSelect
            options={TONES}
            selected={form.tone}
            onSelect={(v) => updateForm("tone", v)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-5">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-3 bg-brand-surface rounded-full border border-brand-border-light text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.title.trim() || !form.category}
            className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Continue"}
          </button>
        </div>
      </main>
    </div>
  );
}
