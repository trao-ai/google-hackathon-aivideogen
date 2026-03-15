"use client";

import { useState } from "react";
import {
  ArrowUpIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  CopyIcon,
  ArrowClockwiseIcon,
  ImageIcon,
  PencilSimpleIcon,
  CubeIcon,
  SmileyIcon,
  CheckCircleIcon,
  FloppyDiskIcon,
} from "@phosphor-icons/react";
import type { ProjectDetail } from "@/lib/api";

type Props = {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
};

/* ── Mock Data ── */
const SAVED_CHARACTERS = [
  { name: "Tech Explainer", style: "Realistic", age: "Adult" },
  { name: "AI Assistant", style: "3D Avatar", age: "Neutral" },
  { name: "Health Expert", style: "Realistic", age: "Senior" },
];

const GENDER_OPTIONS = ["Female", "Male"];
const AGE_OPTIONS = ["Young", "Adult", "Senior"];
const EMOTION_OPTIONS = ["Friendly", "Professional", "Energetic"];
const APPEARANCE_OPTIONS = [
  { label: "Realistic", icon: ImageIcon },
  { label: "Illustration", icon: PencilSimpleIcon },
  { label: "3D Avatar", icon: CubeIcon },
  { label: "Cartoon", icon: SmileyIcon },
];

const USAGE_SETTINGS = [
  { label: "Use Character in scenes", defaultOn: true },
  { label: "Use character as narrator avatar", defaultOn: false },
  { label: "Animate character expressions", defaultOn: true },
];

/* ── Chip Select ── */
function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2.5 rounded-[10px] border text-[15px] font-normal text-foreground transition-opacity hover:opacity-80 ${
            value === opt
              ? "bg-[#F7F6F1] border-foreground/70"
              : "bg-[#F7F6F1]/50 border-brand-border-light"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ── Toggle ── */
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-[45px] h-6 relative rounded-full border transition-colors ${
        checked ? "bg-foreground" : "bg-[#a0a0a0]"
      }`}
    >
      <div
        className={`size-[18px] absolute top-[2px] bg-[#FAF9F5] rounded-full transition-[left] ${
          checked ? "left-[24px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

export function CharacterTab({
  project: _project,
  onRefresh: _onRefresh,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [gender, setGender] = useState("Female");
  const [ageStyle, setAgeStyle] = useState("Adult");
  const [emotion, setEmotion] = useState("Friendly");
  const [appearance, setAppearance] = useState("Realistic");
  const [usageSettings, setUsageSettings] = useState(
    USAGE_SETTINGS.map((s) => s.defaultOn),
  );

  const toggleSetting = (index: number) => {
    setUsageSettings((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  return (
    <div className="flex items-start gap-5">
      {/* Left Column — Generate from Prompt */}
      <div className="w-[28%] shrink-0 flex flex-col gap-2.5">
        {/* Chat Area */}
        <div className="h-[620px] bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex flex-col overflow-hidden relative">
          {/* Gradient blobs (decorative) */}
          <div className="absolute top-0 left-4 size-[60px] bg-brand-green rounded-full blur-[60px] opacity-30" />
          <div className="absolute top-20 right-8 size-[86px] bg-brand-green rounded-full blur-[70px] opacity-20" />
          <div className="absolute bottom-32 left-8 size-[69px] bg-brand-green rounded-full blur-[60px] opacity-20" />

          {/* Header */}
          <div className="p-4 bg-secondary/60 border-b border-brand-border-light">
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-medium text-foreground">
                Generate from Prompt
              </span>
              <span className="text-base font-normal text-brand-foreground-70">
                Create an AI character for your video using a simple prompt.
              </span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 pt-5 flex flex-col gap-5">
            {/* AI Message */}
            <div className="p-4 bg-[#F0EEE7]/70 rounded-[20px]">
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-medium text-foreground">
                  Hi! I&apos;m your Character Creator assistant.
                </span>
                <span className="text-sm font-normal text-brand-foreground-70">
                  I can help you design characters for your videos—such as
                  narrators, presenters, or animated guides—based on your topic
                  and style.
                  <br />
                  <br />
                  Describe the character you want, and I&apos;ll generate it for
                  you instantly.
                </span>
              </div>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-2">
              <ThumbsUpIcon
                size={18}
                weight="regular"
                className="text-[#777]"
              />
              <ThumbsDownIcon
                size={18}
                weight="regular"
                className="text-[#777]"
              />
              <CopyIcon size={18} weight="regular" className="text-[#777]" />
              <ArrowClockwiseIcon
                size={18}
                weight="regular"
                className="text-[#777]"
              />
            </div>

            {/* Suggestions */}
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-normal text-brand-foreground-70">
                Try asking:
              </span>
              <div className="px-4 py-2.5 bg-[#F0EEE7]/70 rounded-[20px]">
                <span className="text-sm font-normal text-brand-foreground-70">
                  Create a professional business presenter for my video
                </span>
              </div>
              <div className="px-4 py-2.5 bg-[#F0EEE7]/70 rounded-[20px]">
                <span className="text-sm font-normal text-brand-foreground-70">
                  Create a motivational speaker character
                </span>
              </div>
            </div>

            {/* User message example */}
            <div className="flex justify-end">
              <div className="px-4 py-2.5 bg-[#EFEBDD]/60 rounded-[20px]">
                <span className="text-sm font-normal text-foreground text-right">
                  Show me a tech expert explaining business strategies
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-1 bg-gradient-to-r from-[#00A19140] to-[#5379FF40] rounded-[25px] shadow-sm">
          <div className="flex items-center pl-4 pr-2 py-2 bg-[#FAF9F4] rounded-[25px] border-[1.4px] border-brand-green">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g. Tech expert explaining business strategies"
              className="flex-1 text-sm font-normal text-foreground placeholder:text-[#a0a0a0] bg-transparent outline-none"
            />
            <button
              type="button"
              className="size-[30px] p-2 bg-secondary rounded-[25px] flex items-center justify-center shrink-0"
            >
              <ArrowUpIcon
                size={18}
                weight="regular"
                className="text-foreground"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Center Column — Generate with AI + Customization */}
      <div className="flex-1 min-w-0 p-5 bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xl font-semibold text-foreground">
              Generate with AI
            </span>
            <span className="text-base font-normal text-brand-foreground-70">
              Create a character automatically based on your video topic.
            </span>
          </div>
          <button
            type="button"
            className="px-4 py-2.5 bg-[#F7F6F1]/50 rounded-full border border-brand-border-light text-[15px] font-medium text-foreground hover:opacity-80 transition-opacity"
          >
            Generate with AI
          </button>
        </div>

        {/* Character Preview (empty state) */}
        <div className="h-[373px] p-5 bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex items-center justify-center">
          <span className="text-base font-normal text-brand-foreground-70">
            Character preview will appear here
          </span>
        </div>

        {/* Character Customization */}
        <div className="p-5 bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex flex-col gap-4">
          <span className="text-xl font-semibold text-foreground capitalize">
            Character Customization
          </span>

          {/* Gender + Age Style */}
          <div className="flex items-start gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-base font-medium text-foreground">
                Gender
              </span>
              <ChipGroup
                options={GENDER_OPTIONS}
                value={gender}
                onChange={setGender}
              />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-base font-medium text-foreground">
                Age Style
              </span>
              <ChipGroup
                options={AGE_OPTIONS}
                value={ageStyle}
                onChange={setAgeStyle}
              />
            </div>
          </div>

          {/* Emotion */}
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium text-foreground">
              Emotion
            </span>
            <ChipGroup
              options={EMOTION_OPTIONS}
              value={emotion}
              onChange={setEmotion}
            />
          </div>

          {/* Appearance Style */}
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium text-foreground">
              Appearance Style
            </span>
            <div className="flex items-center gap-3">
              {APPEARANCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = appearance === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setAppearance(opt.label)}
                    className={`px-4 py-2.5 rounded-[10px] border flex items-center gap-2 text-[15px] font-normal text-foreground transition-opacity hover:opacity-80 ${
                      isActive
                        ? "bg-[#F7F6F1] border-foreground/70"
                        : "bg-[#F7F6F1]/50 border-brand-border-light"
                    }`}
                  >
                    <Icon
                      size={20}
                      weight="regular"
                      className="text-foreground"
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Character Usage Settings */}
          <span className="text-xl font-semibold text-foreground capitalize">
            Character Usage Settings
          </span>

          {USAGE_SETTINGS.map((setting, i) => (
            <div
              key={setting.label}
              className="flex items-center justify-between"
            >
              <span className="text-base font-medium text-foreground">
                {setting.label}
              </span>
              <Toggle
                checked={usageSettings[i]}
                onChange={() => toggleSetting(i)}
              />
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              className="flex-1 px-4 py-2.5 bg-[#F7F6F1]/50 rounded-full border border-brand-border-light flex items-center justify-center gap-2.5 text-[15px] font-medium text-foreground hover:opacity-80 transition-opacity"
            >
              <CheckCircleIcon size={20} weight="regular" />
              Apply Changes
            </button>
            <button
              type="button"
              className="flex-1 px-4 py-2.5 bg-brand-black rounded-full flex items-center justify-center gap-2 text-[15px] font-medium text-brand-off-white hover:opacity-90 transition-opacity"
            >
              <FloppyDiskIcon size={20} weight="regular" />
              Save Character
            </button>
          </div>
        </div>
      </div>

      {/* Right Column — Saved Characters */}
      <div className="w-[20%] shrink-0 p-5 bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex flex-col gap-4">
        <span className="text-xl font-semibold text-foreground">
          Saved Character
        </span>

        {SAVED_CHARACTERS.map((char) => (
          <div
            key={char.name}
            className="p-5 bg-[#F0EEE7]/30 rounded-xl border border-brand-border-light flex flex-col gap-3"
          >
            <div className="flex items-center gap-4">
              <div className="size-[60px] bg-[#908585] rounded-xl shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-foreground">
                  {char.name}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-normal text-brand-foreground-70">
                    {char.style}
                  </span>
                  <span className="text-sm font-normal text-brand-foreground-70">
                    &bull; {char.age}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="w-full px-4 py-2.5 bg-[#FAF9F5] rounded-full border border-brand-border-light text-[15px] font-medium text-foreground hover:opacity-80 transition-opacity"
            >
              Use Character
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
