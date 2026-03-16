"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LinkIcon, ChartBarIcon } from "@phosphor-icons/react";
import { useProject } from "@/hooks/use-projects";
import { useProjectStore } from "@/stores/project-store";
import { useStartResearch } from "@/hooks/use-research";
import { useGenerateScript } from "@/hooks/use-scripts";
import { useGenerateVoice } from "@/hooks/use-voice";
import {
  usePlanScenes,
  useGenerateFrames,
  useGenerateAllVideos,
} from "@/hooks/use-scenes";
import { getProjectStep } from "@/lib/pipeline";
import { Header } from "@/components/layout/Header";
import { StepNav } from "@/components/project/StepNav";
import { Button } from "@/components/ui/button";
import { VideoModelSelector } from "./_tabs/scene-flow/components/VideoModelSelector";
import { TopicsTab } from "./_tabs/TopicsTab";
import { ResearchTab } from "./_tabs/ResearchTab";
import { ScriptsTab } from "./_tabs/ScriptsTab";
import { CharacterTab } from "./_tabs/CharacterTab";
import { VoiceTab } from "./_tabs/VoiceTab";
import { ScenesTab } from "./_tabs/ScenesTab";
import { CaptionsTab } from "./_tabs/CaptionsTab";
import { RenderTab } from "./_tabs/RenderTab";
import { CostsTab } from "./_tabs/CostsTab";
import { EditorView } from "./_tabs/EditorView";
import type { StepNavItem } from "@/types/components";

const STEPS: StepNavItem[] = [
  { id: "topic", label: "Topic" },
  { id: "research", label: "Research" },
  { id: "character", label: "Character" },
  { id: "script", label: "Script" },
  { id: "voice", label: "Voice" },
  { id: "scenes", label: "Scenes" },
  { id: "captions", label: "Captions" },
  { id: "cost", label: "Cost" },
  { id: "export", label: "Export" },
];

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  topic: {
    title: "Today\u2019s Viral Topics",
    subtitle:
      "Discovered from 80+ live signals including Reddit, Hacker News, and Google Trends. Pick one to get started.",
  },
  research: {
    title: "Research Stage",
    subtitle: "Review AI-generated research and add your insights.",
  },
  character: {
    title: "Character Creation",
    subtitle:
      "Create or generate an AI character to appear in your video scenes.",
  },
  script: {
    title: "Script Generation",
    subtitle: "Review and edit your AI-generated script",
  },
  voice: {
    title: "Voice Generation",
    subtitle: "Select voice settings and generate AI narration",
  },
  scenes: {
    title: "Scene Generation",
    subtitle: "Review and customize visual scenes for your video",
  },
  captions: {
    title: "Captions",
    subtitle: "Review and customize captions for your video.",
  },
  cost: {
    title: "Cost & Production Estimation",
    subtitle:
      "Review the AI cost and see how much time and effort you save compared to traditional video production.",
  },
  export: {
    title: "Final Video Preview",
    subtitle: "Review your video and export to your preferred platform",
  },
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: apiProject, isLoading, refetch } = useProject(id);
  const { activeStep, setActiveStep, autoNavigated, setAutoNavigated } =
    useProjectStore();
  const [footerError, setFooterError] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  const project =
    apiProject ??
    ({
      id,
      title: searchParams.get("title") ?? "Untitled Project",
      niche: searchParams.get("niche") ?? "Technology",
      status: "draft",
      totalCostUsd: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topics: [],
    } satisfies import("@/types/api").ProjectDetail);

  const startResearch = useStartResearch(id);
  const generateScript = useGenerateScript(id);
  const generateVoice = useGenerateVoice(id);
  const planScenes = usePlanScenes(id);
  const generateFrames = useGenerateFrames(id);
  const generateAllVideos = useGenerateAllVideos(id);

  useEffect(() => {
    if (!project || autoNavigated) return;
    const step = getProjectStep(project.status);
    setActiveStep(step);
    setAutoNavigated(true);
  }, [project, autoNavigated, setActiveStep, setAutoNavigated]);

  useEffect(() => {
    return () => {
      useProjectStore.getState().reset();
    };
  }, [id]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === activeStep);
  const tabInfo = TAB_TITLES[activeStep];

  if (isLoading && !apiProject) {
    return (
      <div className="min-h-screen bg-secondary">
        <Header />
        <p className="text-muted-foreground py-16 text-center">
          Loading project...
        </p>
      </div>
    );
  }

  // Derive real stats from project data
  const researchBrief = (project.researchBriefs ?? [])[0];
  const sourceCount = researchBrief?.sources?.length ?? 0;
  const confidenceScore = researchBrief
    ? Math.round((researchBrief.confidenceScore ?? 0) * 100)
    : 0;
  const hasTopicSelected = !!project.selectedTopicId;
  const hasResearch = !!researchBrief;
  const hasScript = (project.scripts ?? []).length > 0;
  const hasVoiceover = (project.voiceovers ?? []).length > 0;
  const hasScenes = (project.scenes ?? []).length > 0;

  const isResearching = project.status === "researching";
  const isScripting = project.status === "scripting";
  const isVoicing =
    project.status === "voicing" || project.status === "voice_generating";
  const isPlanning = project.status === "planning_scenes";

  const footerLoading =
    startResearch.isPending ||
    generateScript.isPending ||
    generateVoice.isPending ||
    planScenes.isPending;

  const handleStartResearch = () => {
    setFooterError("");
    startResearch.mutate(undefined, {
      onSuccess: () => setActiveStep("research"),
      onError: (err) => setFooterError(err.message),
    });
  };

  const handleGenerateScript = () => {
    setFooterError("");
    const duration: "short" | "long" =
      project.videoType === "short" ? "short" : "long";
    generateScript.mutate(
      { duration },
      {
        onSuccess: () => setActiveStep("script"),
        onError: (err) => setFooterError(err.message),
      },
    );
  };

  const handleGenerateVoice = () => {
    setFooterError("");
    generateVoice.mutate(undefined, {
      onSuccess: () => setActiveStep("voice"),
      onError: (err) => setFooterError(err.message),
    });
  };

  const handlePlanScenes = () => {
    setFooterError("");
    planScenes.mutate(undefined, {
      onSuccess: () => setActiveStep("scenes"),
      onError: (err) => setFooterError(err.message),
    });
  };

  return (
    <div className="flex flex-col h-screen bg-secondary">
      <Header totalSpend={project.totalCostUsd ?? 0} />

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        <div className="bg-brand-off-white rounded-2xl border border-brand-border-light p-5 flex flex-col gap-5">
          {activeStep !== "topic" &&
            project.title &&
            !(activeStep === "scenes" && showEditor) && (
              <div className="flex items-start justify-between gap-8">
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold text-foreground">
                    {project.title}
                  </h1>
                  {project.niche && (
                    <p className="text-base font-extralight text-[#141413B2]">
                      A Surprising Look At How This Topic Connects To{" "}
                      {project.niche} And Beyond.
                    </p>
                  )}
                </div>
              </div>
            )}

          {activeStep === "topic" && (
            <div className="flex items-start justify-between gap-8">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-foreground">
                  {tabInfo.title}
                </h1>
                <p className="text-base font-extralight text-[#141413B2]">
                  {tabInfo.subtitle}
                </p>
              </div>
            </div>
          )}

          {!(activeStep === "scenes" && showEditor) && (
            <StepNav
              steps={STEPS}
              activeStep={activeStep}
              currentStepIndex={currentStepIndex}
              totalSteps={STEPS.length}
              onStepClick={setActiveStep}
            />
          )}

          {activeStep !== "topic" &&
            !(activeStep === "scenes" && showEditor) && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold text-foreground">
                    {tabInfo.title}
                  </h2>
                  <p className="text-sm font-extralight text-[#141413B2]">
                    {tabInfo.subtitle}
                  </p>
                </div>
                {activeStep === "research" && hasResearch && (
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-brand-green-light rounded-full text-xs font-medium text-brand-green flex items-center gap-1.5">
                      <LinkIcon size={14} weight="bold" />
                      Sources: {sourceCount}
                    </span>
                    <span className="px-3 py-1.5 bg-brand-indigo-light rounded-full text-xs font-medium text-brand-indigo flex items-center gap-1.5">
                      <ChartBarIcon size={14} weight="bold" />
                      Confidence: {confidenceScore}%
                    </span>
                  </div>
                )}
                {activeStep === "scenes" && (
                  <div className="flex items-center gap-3">
                    <VideoModelSelector
                      projectId={id}
                      disabled={
                        generateFrames.isPending ||
                        generateAllVideos.isPending ||
                        project.status === "video_generation"
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={() => planScenes.mutate()}
                      disabled={
                        planScenes.isPending ||
                        project.status === "planning_scenes" ||
                        !hasVoiceover
                      }
                      title={
                        !hasVoiceover ? "Generate voiceover first" : undefined
                      }
                      className="px-4 py-2.5 rounded-full border border-brand-border-light bg-brand-surface hover:bg-brand-surface hover:opacity-80 text-sm hover:text-black"
                    >
                      {project.status === "planning_scenes"
                        ? "Planning..."
                        : "Plan Scene"}
                    </Button>
                    {hasScenes &&
                      !(project.scenes ?? []).some(
                        (s) => (s.frames ?? []).length > 0,
                      ) && (
                        <Button
                          onClick={() => generateFrames.mutate()}
                          disabled={
                            generateFrames.isPending ||
                            project.status === "frame_generation"
                          }
                          className="px-4 py-2.5 bg-brand-black text-brand-off-white rounded-full hover:opacity-90 text-sm font-medium"
                        >
                          {project.status === "frame_generation"
                            ? "Generating..."
                            : "Generate Frames"}
                        </Button>
                      )}
                    {(project.scenes ?? []).some(
                      (s) => (s.frames ?? []).length > 0,
                    ) && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => generateFrames.mutate()}
                          disabled={
                            generateFrames.isPending ||
                            project.status === "frame_generation"
                          }
                          className="px-4 py-2.5 rounded-full border border-brand-border-light bg-brand-surface hover:bg-brand-surface hover:opacity-80 text-sm hover:text-black"
                        >
                          Regenerate Frames
                        </Button>
                        <Button
                          onClick={() => generateAllVideos.mutate()}
                          disabled={
                            generateAllVideos.isPending ||
                            project.status === "video_generation"
                          }
                          className="px-4 py-2.5 bg-brand-black text-brand-off-white rounded-full hover:opacity-90 text-sm font-medium"
                        >
                          {project.status === "video_generation"
                            ? "Generating..."
                            : "Generate all videos"}
                        </Button>
                        {(project.scenes ?? []).some(
                          (s) => s.clip?.videoUrl,
                        ) && (
                          <Button
                            onClick={() => setShowEditor(true)}
                            className="px-4 py-2.5 bg-brand-black text-brand-off-white rounded-full hover:opacity-90 text-sm font-medium"
                          >
                            Editor &rarr;
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

          {activeStep === "topic" && <TopicsTab project={project} />}
          {activeStep === "research" && <ResearchTab project={project} />}
          {activeStep === "character" && (
            <CharacterTab
              project={project}
              onRefresh={async () => {
                await refetch();
              }}
            />
          )}
          {activeStep === "script" && <ScriptsTab project={project} />}
          {activeStep === "voice" && (
            <VoiceTab
              project={project}
              onRefresh={async () => {
                await refetch();
              }}
            />
          )}
          {activeStep === "scenes" && showEditor ? (
            <EditorView project={project} onBack={() => setShowEditor(false)} />
          ) : activeStep === "scenes" ? (
            <ScenesTab project={project} />
          ) : null}
          {activeStep === "captions" && <CaptionsTab project={project} />}
          {activeStep === "export" && <RenderTab project={project} />}
          {activeStep === "cost" && <CostsTab />}
        </div>
      </main>

      {!(activeStep === "scenes" && showEditor) && (
        <div className="shrink-0 bg-brand-off-white border-t border-brand-border-light shadow-[0px_-4px_16px_rgba(225,218,205,0.2)] px-5 py-3 flex items-center justify-between gap-5">
          <div>
            {footerError && (
              <p className="text-sm text-brand-red">{footerError}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-3 bg-brand-surface rounded-full border border-brand-border-light text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
            >
              Back
            </button>

            {/* Topic → Research: Start research */}
            {activeStep === "topic" && hasTopicSelected && (
              <button
                type="button"
                onClick={handleStartResearch}
                disabled={footerLoading || isResearching}
                className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isResearching || startResearch.isPending
                  ? "Researching..."
                  : "Start Research"}
              </button>
            )}

            {/* Research → Character: Approve & Continue */}
            {activeStep === "research" && hasResearch && (
              <button
                type="button"
                onClick={() => setActiveStep("character")}
                className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity"
              >
                Approve &amp; Continue
              </button>
            )}

            {/* Character → Script: Approve Character & Continue */}
            {activeStep === "character" && (
              <button
                type="button"
                onClick={handleGenerateScript}
                disabled={footerLoading || isScripting}
                className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isScripting || generateScript.isPending
                  ? "Generating Script..."
                  : "Approve Character & Continue"}
              </button>
            )}

            {/* Script → Voice: Generate voiceover */}
            {activeStep === "script" && hasScript && (
              <button
                type="button"
                onClick={handleGenerateVoice}
                disabled={footerLoading || isVoicing}
                className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isVoicing || generateVoice.isPending
                  ? "Generating Voice..."
                  : "Generate Voiceover"}
              </button>
            )}

            {/* Voice → Scenes: Plan scenes */}
            {activeStep === "voice" && hasVoiceover && (
              <button
                type="button"
                onClick={handlePlanScenes}
                disabled={footerLoading || isPlanning}
                className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPlanning || planScenes.isPending
                  ? "Planning Scenes..."
                  : "Plan Scenes"}
              </button>
            )}

            {/* Scenes → Captions: Navigate to captions */}
            {activeStep === "scenes" && hasScenes && (
              <button
                type="button"
                onClick={() => setActiveStep("captions")}
                className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity"
              >
                Continue to Captions
              </button>
            )}

            {/* Captions → Cost: Navigate to cost */}
            {activeStep === "captions" && (
              <button
                type="button"
                onClick={() => setActiveStep("cost")}
                className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity"
              >
                Continue to Cost
              </button>
            )}

            {/* Cost → Export: Start Rendering */}
            {activeStep === "cost" && (
              <button
                type="button"
                onClick={() => setActiveStep("export")}
                className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity"
              >
                Start Rendering
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
