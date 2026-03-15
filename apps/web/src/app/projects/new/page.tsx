"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LightningIcon,
  MonitorPlayIcon,
  FilmStripIcon,
  DeviceMobileIcon,
} from "@phosphor-icons/react";
import { useCreateProject } from "@/hooks/use-projects";
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
          className={`px-4 py-2.5 rounded-xl bg-[#FAF9F580] border text-base font-normal transition-colors ${
            selected === option
              ? "bg-brand-surface border-brand-black"
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
  const createProject = useCreateProject();
  const [form, setForm] = useState<CreateProjectFormData>({
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

  const handleSubmit = () => {
    if (!form.category) return;

    const title = `${form.category} Project`;
    const niche = form.category;

    createProject.mutate(
      {
        title,
        niche,
        platform: form.platform ?? undefined,
        videoType: form.videoType ?? undefined,
        videoStyle: form.videoStyle ?? undefined,
        toneKeywords: form.tone ? [form.tone] : undefined,
      },
      {
        onSuccess: (project) => {
          router.push(`/projects/${project.id}`);
        },
        onError: () => {
          /* API unavailable — navigate with a mock ID so the UI is still usable */
          const mockId = crypto.randomUUID();
          router.push(
            `/projects/${mockId}?title=${encodeURIComponent(title)}&niche=${encodeURIComponent(niche)}`,
          );
        },
      },
    );
  };

  return (
    <div className="flex flex-col h-screen bg-secondary">
      <Header />

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-0">
        <div className="bg-brand-off-white rounded-2xl border border-brand-border-light p-5 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-medium text-foreground">
              Create New Project
            </h1>
            <p className="text-lg font-light text-foreground/70">
              Set up your video project and let AI help you create engaging
              content
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-foreground">
              Content Category
            </label>
            <ChipSelect
              options={CATEGORIES}
              selected={form.category}
              onSelect={(v) => updateForm("category", v)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-foreground">
              Target Platform
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => updateForm("platform", platform.id)}
                  className={`flex-1 min-w-44 p-4 bg-[#FAF9F580] rounded-xl border flex flex-col gap-2 transition-colors ${
                    form.platform === platform.id
                      ? "bg-brand-surface border-brand-black"
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

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-medium text-foreground capitalize">
                Configure Your Video
              </h2>
              <p className="text-sm font-light text-muted-foreground">
                Customize the style and format of your AI-generated video
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-base font-normal text-foreground">
                Video Type
              </label>
              <div className="flex items-center gap-5">
                {VIDEO_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => updateForm("videoType", type.id)}
                    className={`flex-1 p-4 rounded-xl border bg-[#FAF9F580] flex flex-col gap-2 transition-colors ${
                      form.videoType === type.id
                        ? "bg-brand-surface border-brand-black"
                        : "bg-brand-surface border-brand-border-light"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="size-11 p-2 bg-secondary rounded-xl flex items-center justify-center">
                        {type.icon}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-medium text-foreground text-left">
                          {type.label}
                        </span>
                        <span className="text-sm text-muted-foreground text-left">
                          {type.duration}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      {type.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-foreground">
              Video Style
            </label>
            <ChipSelect
              options={VIDEO_STYLES}
              selected={form.videoStyle}
              onSelect={(v) => updateForm("videoStyle", v)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-foreground">
              Tone
            </label>
            <ChipSelect
              options={TONES}
              selected={form.tone}
              onSelect={(v) => updateForm("tone", v)}
            />
          </div>
        </div>
      </main>

      <div className="shrink-0 bg-brand-off-white border-t border-brand-border-light shadow-[0px_-4px_16px_rgba(225,218,205,0.2)] px-5 py-4 flex items-center justify-end gap-5">
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
          disabled={createProject.isPending || !form.category}
          className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {createProject.isPending ? "Creating..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
