"use client";

import { useState, useEffect, useRef } from "react";
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
  SpinnerIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { ProjectDetail, Character } from "@/lib/api";

type Props = {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
};

const GENDER_OPTIONS = ["Female", "Male"];
const AGE_OPTIONS = ["Young", "Adult", "Senior"];
const EMOTION_OPTIONS = ["Friendly", "Professional", "Energetic"];
const APPEARANCE_OPTIONS = [
  { label: "Realistic", icon: ImageIcon },
  { label: "Illustration", icon: PencilSimpleIcon },
  { label: "3D Avatar", icon: CubeIcon },
  { label: "Cartoon", icon: SmileyIcon },
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
          className={`px-4 py-2.5 rounded-[10px] border text-[15px] font-normal transition-colors ${
            value === opt
              ? "bg-brand-black text-white border-brand-black"
              : "bg-[#F7F6F1]/50 border-brand-border-light text-foreground hover:bg-brand-black hover:text-white hover:border-brand-black"
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

export function CharacterTab({ project, onRefresh }: Props) {
  const [prompt, setPrompt] = useState("");
  const [gender, setGender] = useState("Female");
  const [ageStyle, setAgeStyle] = useState("Adult");
  const [emotion, setEmotion] = useState("Friendly");
  const [appearance, setAppearance] = useState("Illustration");
  const [useInScenes, setUseInScenes] = useState(true);
  const [useAsNarrator, setUseAsNarrator] = useState(false);
  const [animateExpressions, setAnimateExpressions] = useState(true);
  const [transparentBg, setTransparentBg] = useState(false);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isManualGenerating, setIsManualGenerating] = useState(false);
  const [isChatGenerating, setIsChatGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  // Chat messages — persisted per project in localStorage
  type ChatMsg = { role: "user" | "ai"; text: string };
  const chatStorageKey = `atlas-char-chat-${project.id}`;
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(chatStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persist chat messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages));
    } catch { /* quota exceeded — ignore */ }
  }, [chatMessages, chatStorageKey]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatGenerating]);

  // Load characters on mount
  useEffect(() => {
    const load = async () => {
      try {
        const chars = await api.characters.list(project.id);
        setCharacters(chars);
        // Select the project's selected character, or fall back to the first one with an image
        const sel =
          chars.find((c) => c.id === project.selectedCharacterId) ||
          chars.find((c) => c.imageUrl);
        if (sel) {
          setSelectedCharacter(sel);
          populateFormFromCharacter(sel);
        }
      } catch (err) {
        console.error("Failed to load characters:", err);
      }
    };
    load();
  }, [project.id, project.selectedCharacterId]);

  const populateFormFromCharacter = (char: Character) => {
    setGender(char.gender);
    setAgeStyle(char.ageStyle);
    setEmotion(char.emotion);
    setAppearance(char.appearance);
    setUseInScenes(char.useInScenes);
    setUseAsNarrator(char.useAsNarrator);
    setAnimateExpressions(char.animateExpressions);
    setTransparentBg(char.transparentBg ?? false);
    // Don't restore prompt to input — it was already sent
  };

  const refreshCharacters = async () => {
    const chars = await api.characters.list(project.id);
    setCharacters(chars);
    return chars;
  };

  // Poll for character image generation completion (max 60s)
  const pollForImage = async (characterId: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const chars = await api.characters.list(project.id);
        const char = chars.find((c) => c.id === characterId);
        if (char?.imageUrl) {
          setCharacters(chars);
          setSelectedCharacter(char);
          populateFormFromCharacter(char);
          return char;
        }
      } catch {
        // Network error during poll — keep trying
      }
    }
    // Timeout — refresh and return null to signal failure
    await refreshCharacters();
    return null;
  };

  const [genError, setGenError] = useState<string | null>(null);

  // Generate character (from prompt or auto)
  const handleGenerate = async (userPrompt?: string, fromChat = false) => {
    setGenError(null);
    if (fromChat) {
      setIsChatGenerating(true);
    } else {
      setIsManualGenerating(true);
    }
    try {
      const result = await api.characters.generate(project.id, {
        prompt: userPrompt || undefined,
        gender,
        ageStyle,
        emotion,
        appearance,
        useInScenes,
        useAsNarrator,
        animateExpressions,
        transparentBg,
      });
      await onRefresh();
      const char = await pollForImage(result.characterId);
      if (char) {
        if (fromChat) {
          setChatMessages((prev) => [
            ...prev,
            { role: "ai", text: `Your character "${char.name}" is ready! Check the preview.` },
          ]);
        }
      } else {
        // Poll timed out — generation likely failed
        const errMsg = "Generation failed or timed out. The AI model may be busy — please try again.";
        setGenError(errMsg);
        if (fromChat) {
          setChatMessages((prev) => [...prev, { role: "ai", text: errMsg }]);
        }
      }
    } catch (err) {
      console.error("Character generation failed:", err);
      const errMsg = "Something went wrong. Please try again.";
      setGenError(errMsg);
      if (fromChat) {
        setChatMessages((prev) => [...prev, { role: "ai", text: errMsg }]);
      }
    } finally {
      if (fromChat) {
        setIsChatGenerating(false);
      } else {
        setIsManualGenerating(false);
      }
    }
  };

  // Generate from prompt (left column send button)
  const handlePromptSend = () => {
    if (!prompt.trim() || isChatGenerating) return;
    const text = prompt.trim();
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setPrompt("");
    handleGenerate(text, true);
  };

  // Apply Changes — update selected character settings
  const handleApplyChanges = async () => {
    if (!selectedCharacter) return;
    setIsSaving(true);
    try {
      const updated = await api.characters.update(project.id, selectedCharacter.id, {
        gender,
        ageStyle,
        emotion,
        appearance,
        useInScenes,
        useAsNarrator,
        animateExpressions,
        transparentBg,
      });
      setSelectedCharacter(updated);
      await refreshCharacters();
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (err) {
      console.error("Failed to update character:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Character — create new with current settings + generate image
  const handleSaveCharacter = async () => {
    if (isManualGenerating) return;
    handleGenerate(prompt.trim() || undefined);
  };

  // Use Character — select a saved character
  const handleUseCharacter = async (char: Character) => {
    try {
      await api.characters.select(project.id, char.id);
      setSelectedCharacter(char);
      populateFormFromCharacter(char);
      await onRefresh();
      await refreshCharacters();
    } catch (err) {
      console.error("Failed to select character:", err);
    }
  };

  // Delete a character
  const handleDeleteCharacter = async (charId: string) => {
    try {
      await api.characters.delete(project.id, charId);
      if (selectedCharacter?.id === charId) {
        setSelectedCharacter(null);
      }
      await onRefresh();
      await refreshCharacters();
    } catch (err) {
      console.error("Failed to delete character:", err);
    }
  };

  return (
    <div className="flex items-start gap-5">
      {/* Left Column — Generate from Prompt */}
      <div className="w-[28%] shrink-0 flex flex-col gap-2.5">
        {/* Chat Area */}
        <div className="h-[630px] bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex flex-col overflow-hidden relative">
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
          <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4 flex flex-col gap-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Initial AI greeting */}
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

            {/* Suggestions (only show if no messages yet) */}
            {chatMessages.length === 0 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-sm font-normal text-brand-foreground-70">
                  Try asking:
                </span>
                {[
                  "Create a professional business presenter for my video",
                  "Create a motivational speaker character",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="px-4 py-2.5 bg-[#F0EEE7]/70 rounded-[20px] text-left hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setChatMessages((prev) => [...prev, { role: "user", text: suggestion }]);
                      handleGenerate(suggestion, true);
                    }}
                    disabled={isChatGenerating}
                  >
                    <span className="text-sm font-normal text-brand-foreground-70">
                      {suggestion}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Dynamic chat messages */}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-[20px] ${
                    msg.role === "user"
                      ? "bg-brand-black text-white"
                      : "bg-[#F0EEE7]/70 text-foreground"
                  }`}
                >
                  <span className="text-sm font-normal">{msg.text}</span>
                </div>
              </div>
            ))}

            {/* Generating spinner — only for chat-initiated generation */}
            {isChatGenerating && (
              <div className="flex justify-start">
                <div className="px-4 py-3 bg-[#F0EEE7]/70 rounded-[20px] flex items-center gap-3">
                  <SpinnerIcon size={18} className="animate-spin text-foreground" />
                  <span className="text-sm font-normal text-brand-foreground-70">
                    Generating your character...
                  </span>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-1 bg-gradient-to-r from-[#00A19140] to-[#5379FF40] rounded-[25px] shadow-sm">
          <div className="flex items-center pl-4 pr-2 py-2 bg-[#FAF9F4] rounded-[25px] border-[1.4px] border-brand-green">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePromptSend()}
              placeholder="E.g. Tech expert explaining business strategies"
              className="flex-1 text-sm font-normal text-foreground placeholder:text-[#a0a0a0] bg-transparent outline-none"
              disabled={isChatGenerating}
            />
            <button
              type="button"
              onClick={handlePromptSend}
              disabled={isChatGenerating || !prompt.trim()}
              className="size-[30px] p-2 bg-secondary rounded-[25px] flex items-center justify-center shrink-0 disabled:opacity-40"
            >
              {isChatGenerating ? (
                <SpinnerIcon size={18} className="animate-spin text-foreground" />
              ) : (
                <ArrowUpIcon size={18} weight="regular" className="text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Center Column — Generate with AI + Customization */}
      <div className="flex-1 min-w-0 h-[690px] p-5 bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:rounded-full">
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
            onClick={() => handleGenerate()}
            disabled={isManualGenerating}
            className="px-4 py-2.5 bg-[#F7F6F1]/50 rounded-full border border-brand-border-light text-[15px] font-medium text-foreground hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {isManualGenerating ? "Generating..." : "Generate with AI"}
          </button>
        </div>

        {/* Character Preview */}
        <div className="h-[373px] shrink-0 rounded-2xl border border-brand-border-light flex items-center justify-center overflow-hidden bg-[#F0EEE7]/30">
          {isManualGenerating ? (
            <div className="flex flex-col items-center gap-3">
              <SpinnerIcon size={32} className="animate-spin text-foreground" />
              <span className="text-base font-normal text-brand-foreground-70">
                Generating character...
              </span>
            </div>
          ) : genError && !selectedCharacter?.imageUrl ? (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <span className="text-base font-medium text-red-500">
                Generation failed
              </span>
              <span className="text-sm font-normal text-brand-foreground-70">
                {genError}
              </span>
              <button
                type="button"
                onClick={() => { setGenError(null); handleGenerate(); }}
                className="mt-2 px-4 py-2 bg-brand-black text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          ) : selectedCharacter?.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={selectedCharacter.imageUrl}
              alt={selectedCharacter.name}
              className="h-full w-full object-contain rounded-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                console.error("Failed to load character image:", selectedCharacter.imageUrl);
              }}
            />
          ) : (
            <span className="text-base font-normal text-brand-foreground-70">
              Character preview will appear here
            </span>
          )}
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
                    className={`group px-4 py-2.5 rounded-[10px] border flex items-center gap-2 text-[15px] font-normal transition-colors ${
                      isActive
                        ? "bg-brand-black text-white border-brand-black"
                        : "bg-[#F7F6F1]/50 border-brand-border-light text-foreground hover:bg-brand-black hover:text-white hover:border-brand-black"
                    }`}
                  >
                    <Icon
                      size={20}
                      weight="regular"
                      className="transition-colors"
                      style={{ color: "inherit" }}
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transparent Background */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-medium text-foreground">
                Transparent Background
              </span>
              <span className="text-sm font-normal text-brand-foreground-70">
                Generate on a clean white background for easy removal
              </span>
            </div>
            <Toggle checked={transparentBg} onChange={setTransparentBg} />
          </div>

          {/* Character Usage Settings */}
          <span className="text-xl font-semibold text-foreground capitalize">
            Character Usage Settings
          </span>

          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-foreground">
              Use Character in scenes
            </span>
            <Toggle checked={useInScenes} onChange={setUseInScenes} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-foreground">
              Use character as narrator avatar
            </span>
            <Toggle checked={useAsNarrator} onChange={setUseAsNarrator} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-foreground">
              Animate character expressions
            </span>
            <Toggle checked={animateExpressions} onChange={setAnimateExpressions} />
          </div>

          {/* Action Buttons */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={handleApplyChanges}
              disabled={!selectedCharacter || isSaving}
              className="flex-1 px-4 py-2.5 bg-[#F7F6F1]/50 rounded-full border border-brand-border-light flex items-center justify-center gap-2.5 text-[15px] font-medium text-foreground hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              <CheckCircleIcon size={20} weight="regular" />
              {isSaving ? "Saving..." : savedMsg ? "Saved!" : "Apply Changes"}
            </button>
            <button
              type="button"
              onClick={handleSaveCharacter}
              disabled={isManualGenerating}
              className="flex-1 px-4 py-2.5 bg-brand-black rounded-full flex items-center justify-center gap-2 text-[15px] font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <FloppyDiskIcon size={20} weight="regular" />
              {isManualGenerating ? "Generating..." : "Save Character"}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column — Saved Characters */}
      <div className="w-[20%] shrink-0 h-[690px] p-5 bg-[#FAF9F5] rounded-2xl border border-brand-border-light flex flex-col gap-4">
        <span className="text-xl font-semibold text-foreground shrink-0">
          Saved Characters
        </span>

        {characters.length === 0 && (
          <div className="py-8 text-center">
            <span className="text-sm text-brand-foreground-70">
              No characters yet. Generate one to get started.
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:rounded-full">
        {characters.map((char) => (
          <div
            key={char.id}
            className={`p-5 rounded-xl border flex flex-col gap-3 ${
              char.id === project.selectedCharacterId
                ? "bg-[#F0EEE7]/60 border-foreground/30"
                : "bg-[#F0EEE7]/30 border-brand-border-light"
            }`}
          >
            <div className="flex items-center gap-4">
              {char.imageUrl ? (
                <img
                  src={char.imageUrl}
                  alt={char.name}
                  className="size-[60px] rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="size-[60px] bg-[#908585] rounded-xl shrink-0 flex items-center justify-center">
                  {!char.imageUrl && (
                    <SpinnerIcon size={20} className="animate-spin text-white" />
                  )}
                </div>
              )}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-base font-semibold text-foreground truncate">
                  {char.name}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-normal text-brand-foreground-70">
                    {char.appearance}
                  </span>
                  <span className="text-sm font-normal text-brand-foreground-70">
                    &bull; {char.ageStyle}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleUseCharacter(char)}
                className={`flex-1 px-4 py-2.5 rounded-full border text-[15px] font-medium transition-opacity hover:opacity-80 ${
                  char.id === project.selectedCharacterId
                    ? "bg-brand-black text-brand-off-white border-brand-black"
                    : "bg-[#FAF9F5] border-brand-border-light text-foreground"
                }`}
              >
                {char.id === project.selectedCharacterId ? "Selected" : "Use Character"}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCharacter(char.id)}
                className="px-3 py-2.5 rounded-full border border-brand-border-light text-red-500 hover:bg-red-50 transition-colors"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
