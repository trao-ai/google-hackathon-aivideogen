"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MagnifyingGlass,
  X as XIcon,
  CaretDown,
  ArrowsClockwise,
  CheckCircle,
} from "@phosphor-icons/react";
import { CaptionVideoPlayer } from "./CaptionsTab/CaptionVideoPlayer";
import { api } from "@/lib/api";
import type { ProjectDetail } from "@/lib/api";
import { useRouter } from "next/navigation";

interface CaptionsTabProps {
  project: ProjectDetail;
}

const CAPTION_TEMPLATES = [
  {
    id: "standard",
    label: "Standard Subtitles",
    settings: {
      font: "Arial",
      fontSize: 7,
      textColor: "#FFFFFF",
      textOpacity: 100,
      bgColor: "#000000",
      bgOpacity: 80,
      position: "bottom" as const,
    },
  },
  {
    id: "youtube",
    label: "YouTube Style",
    settings: {
      font: "Roboto",
      fontSize: 6,
      textColor: "#FFFFFF",
      textOpacity: 100,
      bgColor: "#000000",
      bgOpacity: 75,
      position: "bottom" as const,
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    settings: {
      font: "Inter",
      fontSize: 5,
      textColor: "#FFFFFF",
      textOpacity: 100,
      bgColor: "#000000",
      bgOpacity: 0,
      position: "bottom" as const,
    },
  },
];

const FONTS = [
  "Arial",
  "Arial Rounded MT Bold",
  "Arima",
  "Arima Madurai",
  "Arimo",
  "Anek Devanagari",
  "Charis SIL",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "PT Sans",
  "Ubuntu",
  "Nunito",
  "Playfair Display",
  "Poppins",
  "Merriweather",
  "Source Sans Pro",
  "Noto Sans",
  "Rubik",
  "Work Sans",
  "Karla",
  "IBM Plex Sans",
  "Manrope",
  "DM Sans",
  "Space Grotesk",
  "Plus Jakarta Sans",
].sort();

const FONT_SIZES = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "10" },
  { value: 11, label: "11" },
  { value: 12, label: "12" },
  { value: 13, label: "13" },
  { value: 14, label: "14" },
  { value: 15, label: "15" },
  { value: 16, label: "16" },
  { value: 17, label: "17" },
  { value: "custom", label: "Custom" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
];

export function CaptionsTab({ project }: CaptionsTabProps) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState("standard");
  const [font, setFont] = useState("Arial");
  const [fontSearch, setFontSearch] = useState("");
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const selectedFontRef = useRef<HTMLButtonElement>(null);
  const [fontSize, setFontSize] = useState<number | "custom">(7);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textOpacity, setTextOpacity] = useState(100);
  const [bgColor, setBgColor] = useState("#000000");
  const [bgOpacity, setBgOpacity] = useState(80);
  const [position, setPosition] = useState<"top" | "bottom">("bottom");
  const [highlightKeywords, setHighlightKeywords] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [burnInCaptions, setBurnInCaptions] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  // Load saved caption settings on mount
  useEffect(() => {
    const loadCaptionSettings = async () => {
      try {
        const settings = await api.captions.get(project.id);
        if (settings) {
          setFont(settings.font);
          setFontSize(settings.fontSize);
          setTextColor(settings.textColor);
          setTextOpacity(settings.textOpacity);
          setBgColor(settings.bgColor);
          setBgOpacity(settings.bgOpacity);
          setPosition(settings.position);
          setSelectedTemplate(settings.template);
          setHighlightKeywords(settings.highlightKeywords);
          setTargetLanguage(settings.targetLanguage);
          setBurnInCaptions(settings.burnInCaptions);
        }
      } catch (error) {
        console.error("Failed to load caption settings:", error);
      }
    };
    loadCaptionSettings();
  }, [project.id]);

  // Apply template settings when template changes
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = CAPTION_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setFont(template.settings.font);
      setFontSize(template.settings.fontSize);
      setTextColor(template.settings.textColor);
      setTextOpacity(template.settings.textOpacity);
      setBgColor(template.settings.bgColor);
      setBgOpacity(template.settings.bgOpacity);
      setPosition(template.settings.position);
    }
  };

  // Handle regenerate captions
  const handleRegenerateCaptions = async () => {
    setIsRegenerating(true);
    try {
      await api.captions.regenerate(project.id);
      router.refresh();
    } catch (error) {
      console.error("Failed to regenerate captions:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle apply changes
  const handleApplyChanges = async () => {
    console.log("Apply Changes clicked - starting save...");
    setIsApplying(true);
    setSavedSuccessfully(false);
    try {
      // Save caption settings to database
      await api.captions.update(project.id, {
        font,
        fontSize: typeof fontSize === "number" ? fontSize : 7,
        textColor,
        textOpacity,
        bgColor,
        bgOpacity,
        position,
        template: selectedTemplate,
        highlightKeywords,
        targetLanguage,
        burnInCaptions,
      });

      // Settings saved - will be used in next render
      setSavedSuccessfully(true);
      setTimeout(() => setSavedSuccessfully(false), 3000);
      router.refresh();
    } catch (error) {
      console.error("Failed to save caption settings:", error);
    } finally {
      setIsApplying(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        fontDropdownRef.current &&
        !fontDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFontDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll to selected font when dropdown opens
  useEffect(() => {
    if (isFontDropdownOpen && selectedFontRef.current) {
      selectedFontRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [isFontDropdownOpen]);

  // Filter fonts based on search
  const filteredFonts = FONTS.filter((f) =>
    f.toLowerCase().includes(fontSearch.toLowerCase()),
  );

  // Get first scene clip for caption editing preview (prioritize scene clips)
  const firstSceneWithClip = project.scenes?.find((s: any) => s.clip?.videoUrl);
  const hasSceneClip = !!firstSceneWithClip?.clip?.videoUrl;

  // Get the latest render as fallback
  const latestRender = project.renders?.[0];
  const hasRender = !!latestRender?.videoUrl;

  // Determine which video to show - PRIORITIZE scene clips for caption editing
  const videoUrl = hasSceneClip
    ? firstSceneWithClip!.clip!.videoUrl!
    : latestRender?.videoUrl;

  // Use subtitle from render only if we're showing the render
  const subtitleUrl =
    !hasSceneClip && hasRender
      ? latestRender!.subtitleUrl || undefined
      : undefined;

  const hasVideo = !!videoUrl;
  const hasSubtitles = !!subtitleUrl;
  const hasVoiceover = !!project.voiceovers && project.voiceovers.length > 0;

  return (
    <div className="flex gap-6">
      {/* Video Preview - 60% width */}
      <div className="w-[60%] flex-shrink-0">
        <div className="bg-brand-surface rounded-xl border border-brand-border-light p-4">
          {hasVideo ? (
            <>
              <CaptionVideoPlayer
                videoUrl={videoUrl!}
                subtitleUrl={subtitleUrl}
                font={font}
                fontSize={fontSize}
                textColor={textColor}
                textOpacity={textOpacity}
                bgColor={bgColor}
                bgOpacity={bgOpacity}
                position={position}
                showCaptions={true}
              />
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {project.title || "Untitled Project"}
                </h3>
              </div>
            </>
          ) : (
            <div className="aspect-video bg-brand-surface-dark rounded-lg flex items-center justify-center">
              <div className="text-center px-8">
                <p className="text-muted-foreground mb-2">
                  No video available for caption preview.
                </p>
                <p className="text-sm text-muted-foreground">
                  Generate scene videos first, or skip to Export to render the
                  final video.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Caption Settings Panel - 40% width - ONE unified container */}
      <div className="w-[40%]">
        <div className="bg-brand-surface rounded-3xl border border-brand-border-light p-8 flex flex-col gap-8">
          {/* Caption Templates */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">
              Caption Templates
            </h3>
            <div className="flex gap-2">
              {CAPTION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateChange(template.id)}
                  className={`px-4 py-3 rounded-lg text-[15px] transition-colors ${
                    selectedTemplate === template.id
                      ? "bg-brand-black text-brand-off-white font-medium"
                      : "bg-[#FAF9F580] border border-[#E3E2DE] text-foreground hover:bg-gray-50 font-normal"
                  }`}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caption Style Settings */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-foreground">
              Caption Style Settings
            </h3>

            {/* Font and Font Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Font
                </label>
                <div ref={fontDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-lg border border-[#E3E2DE] bg-[#FAF9F580] px-4 py-2.5 text-sm focus:outline-none"
                  >
                    <span>{font}</span>
                    <CaretDown size={16} className="opacity-50" />
                  </button>

                  {isFontDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-hidden rounded-lg border bg-[#FAF9F5] shadow-lg animate-in fade-in-80">
                      {/* Search Input */}
                      <div className="p-3 pb-0">
                        <div className="relative mb-3">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <MagnifyingGlass
                              size={20}
                              className="text-gray-400"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Search"
                            value={fontSearch}
                            onChange={(e) => setFontSearch(e.target.value)}
                            className="w-full rounded-full border border-[#E3E2DE] bg-[#FAF9F5] pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-gray-300"
                          />
                          {fontSearch && (
                            <button
                              onClick={() => setFontSearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
                            >
                              <XIcon size={16} className="text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-[#E3E2DE]" />

                      {/* Font List */}
                      <div className="p-3 pt-3">
                        <div className="max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {filteredFonts.map((f) => (
                            <button
                              key={f}
                              ref={font === f ? selectedFontRef : null}
                              onClick={() => {
                                setFont(f);
                                setIsFontDropdownOpen(false);
                                setFontSearch("");
                              }}
                              className={`w-full text-left px-3 py-2.5 text-base rounded-lg transition-colors ${
                                font === f
                                  ? "bg-[#F0EEE7]"
                                  : "hover:bg-[#F0EEE7]"
                              }`}
                              style={{ fontFamily: f }}
                            >
                              {f}
                            </button>
                          ))}
                          {filteredFonts.length === 0 && (
                            <div className="px-3 py-6 text-center text-sm text-gray-500">
                              No fonts found
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Font Size
                </label>
                <Select
                  value={fontSize.toString()}
                  onValueChange={(v) =>
                    setFontSize(v === "custom" ? "custom" : Number(v))
                  }
                >
                  <SelectTrigger className="bg-[#FAF9F580] border-[#E3E2DE] rounded-lg px-4 py-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map((size) => (
                      <SelectItem
                        key={size.value.toString()}
                        value={size.value.toString()}
                      >
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Text Color and Background Color */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Text Color
                </label>
                <div className="flex gap-1 items-center">
                  <div
                    className="relative w-10 h-10 rounded-lg border border-[#E3E2DE] overflow-hidden cursor-pointer flex-shrink-0"
                    style={{ backgroundColor: textColor }}
                  >
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={textColor.toUpperCase()}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F580] border border-[#E3E2DE] rounded-l-lg rounded-r-sm text-sm font-mono focus:outline-none"
                  />
                  <input
                    type="number"
                    value={textOpacity}
                    onChange={(e) =>
                      setTextOpacity(
                        Math.min(
                          100,
                          Math.max(0, parseInt(e.target.value) || 0),
                        ),
                      )
                    }
                    className="px-3 py-2 bg-[#FAF9F580] border border-[#E3E2DE] rounded-r-lg rounded-l-sm text-sm text-center focus:outline-none"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Background Color
                </label>
                <div className="flex gap-1 items-center">
                  <div
                    className="relative w-10 h-10 rounded-lg border border-[#E3E2DE] overflow-hidden cursor-pointer flex-shrink-0"
                    style={{ backgroundColor: bgColor }}
                  >
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={bgColor.toUpperCase()}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F580] border border-[#E3E2DE] rounded-l-lg rounded-r-sm text-sm font-mono focus:outline-none"
                    maxLength={7}
                  />
                  <input
                    type="number"
                    value={bgOpacity}
                    onChange={(e) =>
                      setBgOpacity(
                        Math.min(
                          100,
                          Math.max(0, parseInt(e.target.value) || 0),
                        ),
                      )
                    }
                    className="px-3 py-2 bg-[#FAF9F580] border border-[#E3E2DE] rounded-r-lg rounded-l-sm text-sm text-center focus:outline-none"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Position
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setPosition("top")}
                  className={`flex-1 px-4 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                    position === "top"
                      ? "bg-brand-black text-brand-off-white"
                      : "bg-[#FAF9F580] border border-[#E3E2DE] text-foreground hover:bg-gray-50"
                  }`}
                >
                  Top
                </button>
                <button
                  onClick={() => setPosition("bottom")}
                  className={`flex-1 px-4 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                    position === "bottom"
                      ? "bg-brand-black text-brand-off-white"
                      : "bg-[#FAF9F580] border border-[#E3E2DE] text-foreground hover:bg-gray-50"
                  }`}
                >
                  Bottom
                </button>
              </div>
            </div>
          </div>

          {/* Highlight Keywords */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Highlight Keywords
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Perfect for social media engagement
                </p>
              </div>
              <button
                onClick={() => setHighlightKeywords(!highlightKeywords)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  highlightKeywords
                    ? "bg-brand-black"
                    : "bg-[#FAF9F580] border border-[#E3E2DE]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                    highlightKeywords ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* AI Caption Tools */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-foreground">
              AI Caption Tools
            </h3>

            {/* Translate Captions */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Translate Captions
              </label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="bg-[#FAF9F580] border-[#E3E2DE] rounded-lg px-4 py-2.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Burn-in Toggle */}
            <div className="flex items-center justify-between border border-[#E3E2DE] rounded-lg p-4">
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  Include captions in video (burned-in)
                </h4>
              </div>
              <button
                onClick={() => setBurnInCaptions(!burnInCaptions)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  burnInCaptions
                    ? "bg-brand-black"
                    : "bg-[#FAF9F580] border border-[#E3E2DE]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                    burnInCaptions ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-full bg-[#FAF9F580] border-[#E3E2DE] hover:opacity-80 text-sm flex items-center gap-2 !px-4 !py-2.5 !h-auto"
              disabled={!hasVoiceover || isRegenerating}
              onClick={handleRegenerateCaptions}
            >
              <ArrowsClockwise size={18} />
              {isRegenerating ? "Regenerating..." : "Regenerate Captions"}
            </Button>
            <Button
              className="flex-1 bg-brand-black text-brand-off-white rounded-full hover:opacity-80 text-sm flex items-center gap-2 !px-4 !py-2.5 !h-auto"
              disabled={isApplying}
              onClick={handleApplyChanges}
            >
              <CheckCircle size={18} />
              {isApplying ? "Saving..." : savedSuccessfully ? "Saved!" : "Apply Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
