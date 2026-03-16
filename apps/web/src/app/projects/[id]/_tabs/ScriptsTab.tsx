"use client";

import { useState } from "react";
import {
  SparkleIcon,
  FileTextIcon,
  CheckCircleIcon,
  TrashIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import type { ProjectDetail, Script, ScriptSection } from "@/lib/api";
import {
  useGenerateScript,
  useApproveScript,
  useDeleteScript,
  useRewriteSection,
} from "@/hooks/use-scripts";

type Props = {
  project: ProjectDetail;
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function SectionCard({
  section,
  onAction,
  rewritingAction,
}: {
  section: ScriptSection;
  onAction?: (action: string) => void;
  rewritingAction?: string | null;
}) {
  const actions = ["Rewrite Tone", "Make Shorter"];
  return (
    <div className="flex-1 p-5 bg-[#FBFBF7] rounded-2xl border border-brand-border-light flex flex-col justify-between gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-1">
          <h4 className="flex-1 text-lg font-semibold text-foreground capitalize">
            {section.sectionType.replace(/_/g, " ")}
          </h4>
          <span className="text-sm font-normal text-brand-foreground-70">
            {formatDuration(section.estimatedDurationSec)}
          </span>
        </div>
        <p className="text-sm font-normal text-brand-foreground-70">
          {section.text}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {actions.map((action, i) => (
          <button
            key={action}
            type="button"
            disabled={!!rewritingAction}
            onClick={() => onAction?.(action)}
            className={`whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${
              i === 0
                ? "bg-brand-surface border border-brand-border-light text-foreground"
                : "bg-brand-black text-brand-off-white"
            }`}
          >
            {rewritingAction === action ? "Rewriting..." : action}
          </button>
        ))}
      </div>
    </div>
  );
}

function MainSectionRow({
  section,
  onAction,
  rewritingAction,
}: {
  section: ScriptSection;
  onAction?: (action: string) => void;
  rewritingAction?: string | null;
}) {
  const actions = ["Rewrite Tone", "Make Shorter"];
  return (
    <div className="p-3 bg-[#F0EEE7]/50 rounded-xl border border-brand-border-light flex flex-col gap-3">
      <div className="flex items-start gap-5">
        <div className="flex-1 flex flex-col gap-1">
          <h4 className="text-lg font-semibold text-foreground capitalize">
            {section.sectionType.replace(/_/g, " ")}
          </h4>
          <p className="text-sm font-normal text-brand-foreground-70">
            {section.text}
          </p>
        </div>
        <span className="shrink-0 text-sm font-normal text-brand-foreground-70">
          {formatDuration(section.estimatedDurationSec)}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {actions.map((action, i) => (
          <button
            key={action}
            type="button"
            disabled={!!rewritingAction}
            onClick={() => onAction?.(action)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${
              i === 0
                ? "bg-brand-surface border border-brand-border-light text-foreground"
                : "bg-brand-black text-brand-off-white"
            }`}
          >
            {rewritingAction === action ? "Rewriting..." : action}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScriptsTab({ project }: Props) {
  const [error, setError] = useState("");
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [rewritingAction, setRewritingAction] = useState<string | null>(null);
  const generateScript = useGenerateScript(project.id);
  const approveScript = useApproveScript(project.id);
  const deleteScript = useDeleteScript(project.id);
  const rewriteSection = useRewriteSection(project.id);

  const scripts: Script[] = project.scripts ?? [];
  const activeScript = scripts[0]; // Most recent script
  const sections = activeScript?.sections ?? [];
  const isGenerating = generateScript.isPending || project.status === "scripting";
  const loading = generateScript.isPending || approveScript.isPending || deleteScript.isPending;

  const handleRewrite = (sectionId: string, action: string) => {
    if (!activeScript) return;
    setError("");
    setRewritingId(sectionId);
    setRewritingAction(action);
    const instructions =
      action === "Make Shorter"
        ? "Make this section significantly shorter and more concise while keeping the key message. Cut filler words and redundant phrases."
        : "Rewrite the tone to be more engaging, energetic, and conversational. Add more hooks and personality while keeping the same information.";
    rewriteSection.mutate(
      { scriptId: activeScript.id, sectionId, instructions },
      {
        onSuccess: () => {
          setRewritingId(null);
          setRewritingAction(null);
        },
        onError: (err) => {
          setError(err.message);
          setRewritingId(null);
          setRewritingAction(null);
        },
      },
    );
  };

  // Derive duration from project's videoType
  const duration: "short" | "long" =
    project.videoType === "short" ? "short" : "long";

  const handleGenerate = () => {
    setError("");
    generateScript.mutate(
      { duration },
      { onError: (err) => setError(err.message) },
    );
  };

  const handleApprove = (scriptId: string) => {
    setError("");
    approveScript.mutate(scriptId, {
      onError: (err) => setError(err.message),
    });
  };

  const handleDelete = (scriptId: string) => {
    setError("");
    deleteScript.mutate(scriptId, {
      onError: (err) => setError(err.message),
    });
  };

  // Categorize sections for layout
  const introTypes = new Set(["cold_open", "hook", "promise"]);
  const closingTypes = new Set(["consequences", "closing_hook", "cta", "twist"]);

  const introSections = sections.filter((s) => introTypes.has(s.sectionType));
  const mainSections = sections.filter(
    (s) => !introTypes.has(s.sectionType) && !closingTypes.has(s.sectionType),
  );
  const closingSections = sections.filter((s) =>
    closingTypes.has(s.sectionType),
  );

  // Script stats
  const wordCount = activeScript
    ? activeScript.fullText.split(/\s+/).filter(Boolean).length
    : 0;
  const estDuration = activeScript
    ? formatDuration(activeScript.estimatedDurationSec)
    : "0s";
  const scriptFlow = sections
    .map((s) => s.sectionType.replace(/_/g, " "))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" → ");

  // No script yet - show generate button
  if (!activeScript) {
    return (
      <div className="flex flex-col gap-5">
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <div className="rounded-2xl border border-dashed border-brand-border-light py-16 text-center">
          <p className="mb-3 text-foreground/70">
            {isGenerating
              ? "Generating your script..."
              : "No script generated yet."}
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || isGenerating}
            className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Script"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-brand-red">{error}</p>}

      {/* Script Flow */}
      {scriptFlow && (
        <p className="text-base font-normal text-brand-foreground-70">
          {scriptFlow}
        </p>
      )}

      {/* Main Layout: Content + Sidebar */}
      <div className="flex items-start gap-5">
        {/* Left: Script Sections */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Intro Row */}
          {introSections.length > 0 && (
            <div className="flex items-stretch gap-5">
              {introSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onAction={(action) => handleRewrite(section.id, action)}
                  rewritingAction={rewritingId === section.id ? rewritingAction : null}
                />
              ))}
            </div>
          )}

          {/* Main Context */}
          {mainSections.length > 0 && (
            <div className="p-5 bg-[#FBFBF7] rounded-2xl flex flex-col gap-5">
              <h3 className="text-2xl font-semibold text-foreground">
                Main Context
              </h3>
              {mainSections.map((section) => (
                <MainSectionRow
                  key={section.id}
                  section={section}
                  onAction={(action) => handleRewrite(section.id, action)}
                  rewritingAction={rewritingId === section.id ? rewritingAction : null}
                />
              ))}
            </div>
          )}

          {/* Closing Row */}
          {closingSections.length > 0 && (
            <div className="flex items-stretch gap-5">
              {closingSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onAction={(action) => handleRewrite(section.id, action)}
                  rewritingAction={rewritingId === section.id ? rewritingAction : null}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Script Tools Sidebar */}
        <div className="w-[352px] shrink-0 p-5 bg-[#FBFBF7] rounded-2xl border border-brand-border-light flex flex-col gap-5">
          {/* Stats */}
          <div className="flex flex-col gap-2">
            <h4 className="text-base font-semibold text-foreground">
              Script Tools
            </h4>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-normal text-brand-foreground-70">
                  Word Count:
                </span>
                <span className="text-base font-semibold text-foreground">
                  {wordCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-normal text-brand-foreground-70">
                  Est. Duration:
                </span>
                <span className="text-base font-semibold text-foreground">
                  {estDuration}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-normal text-brand-foreground-70">
                  Sections:
                </span>
                <span className="text-base font-semibold text-foreground">
                  {sections.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-normal text-brand-foreground-70">
                  Status:
                </span>
                <span className="text-base font-semibold text-foreground capitalize">
                  {activeScript.status}
                </span>
              </div>
            </div>
          </div>

          {/* Title Candidates */}
          {activeScript.titleCandidates?.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-brand-indigo-light to-brand-green-light rounded-xl border border-brand-indigo-border flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <SparkleIcon
                  size={20}
                  weight="fill"
                  className="text-brand-indigo"
                />
                <span className="text-base font-semibold text-foreground">
                  Title Suggestions
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {activeScript.titleCandidates.map((title, i) => (
                  <p
                    key={i}
                    className="text-sm font-normal text-brand-foreground-70"
                  >
                    {i + 1}. {title}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-5">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || isGenerating}
              className="w-full px-4 py-2.5 bg-[#FBFBF7] rounded-full border border-brand-border-light flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <ArrowClockwiseIcon size={20} weight="regular" />
              {isGenerating ? "Generating..." : "Regenerate"}
            </button>
            {activeScript.status !== "approved" && (
              <button
                type="button"
                onClick={() => handleApprove(activeScript.id)}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-brand-black rounded-full flex items-center justify-center gap-2 text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <CheckCircleIcon size={20} weight="regular" />
                Approve
              </button>
            )}
            {activeScript.status === "approved" && (
              <div className="w-full px-4 py-2.5 bg-brand-green-light rounded-full flex items-center justify-center gap-2 text-sm font-medium text-brand-green">
                <CheckCircleIcon size={20} weight="fill" />
                Approved
              </div>
            )}
            <button
              type="button"
              onClick={() => handleDelete(activeScript.id)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-[#FBFBF7] rounded-full border border-brand-red flex items-center justify-center gap-2 text-sm font-medium text-brand-red hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <TrashIcon size={20} weight="regular" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
