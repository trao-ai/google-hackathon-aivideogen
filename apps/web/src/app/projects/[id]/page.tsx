"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { api, type ProjectDetail } from "@/lib/api";
import { getProjectStep } from "@/lib/pipeline";
import { Header } from "@/components/layout/Header";
import { StepNav } from "@/components/project/StepNav";
import { TopicsTab } from "./_tabs/TopicsTab";
import { ResearchTab } from "./_tabs/ResearchTab";
import { ScriptsTab } from "./_tabs/ScriptsTab";
import { VoiceTab } from "./_tabs/VoiceTab";
import { ScenesTab } from "./_tabs/ScenesTab";
import { RenderTab } from "./_tabs/RenderTab";
import { CostsTab } from "./_tabs/CostsTab";
import type { PipelineStep, StepNavItem } from "@/types/components";

const STEPS: StepNavItem[] = [
  { id: "topic", label: "Topic" },
  { id: "research", label: "Research" },
  { id: "script", label: "Script" },
  { id: "voice", label: "Voice" },
  { id: "scenes", label: "Scenes" },
  { id: "cost", label: "Cost" },
  { id: "export", label: "Export" },
];

const TAB_TITLES: Record<PipelineStep, { title: string; subtitle: string }> = {
  topic: {
    title: "Today\u2019s Viral Topics",
    subtitle:
      "Discovered from 80+ live signals including Reddit, Hacker News, and Google Trends. Pick one to get started.",
  },
  research: {
    title: "Research Brief",
    subtitle: "AI-generated research to inform your script.",
  },
  script: {
    title: "Script Generation",
    subtitle: "Generate and refine your video script.",
  },
  voice: {
    title: "Voice Generation",
    subtitle: "Generate voiceover for your script.",
  },
  scenes: {
    title: "Scene Planning",
    subtitle: "Plan and generate scenes for your video.",
  },
  cost: {
    title: "Cost Breakdown",
    subtitle: "Review the costs for your project.",
  },
  export: {
    title: "Final Render",
    subtitle: "Render and export your final video.",
  },
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<PipelineStep>("topic");
  const [autoNavigated, setAutoNavigated] = useState(false);
  const [error, setError] = useState("");

  const loadProject = useCallback(async () => {
    try {
      const data = await api.projects.get(id);
      setProject(data);
    } catch {
      // API unavailable — use mock project from query params
      const title = searchParams.get("title") ?? "Untitled Project";
      const niche = searchParams.get("niche") ?? "Technology";
      setProject(
        (prev) =>
          prev ?? {
            id,
            title,
            niche,
            status: "draft",
            totalCostUsd: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            topics: [],
          },
      );
    } finally {
      setLoading(false);
    }
  }, [id, searchParams]);

  useEffect(() => {
    if (!project || autoNavigated) return;
    const step = getProjectStep(project.status);
    setActiveStep(step);
    setAutoNavigated(true);
  }, [project, autoNavigated]);

  useEffect(() => {
    void loadProject();
    const interval = setInterval(() => void loadProject(), 8_000);
    return () => clearInterval(interval);
  }, [loadProject]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === activeStep);
  const tabInfo = TAB_TITLES[activeStep];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <p className="text-muted-foreground py-16 text-center">
          Loading project...
        </p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <p className="text-brand-red py-16 text-center">
          {error || "Project not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header totalSpend={project.totalCostUsd ?? 0} />

      <main className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-8">
        {/* Title + Refresh */}
        <div className="flex items-start justify-between gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-foreground leading-9">
              {tabInfo.title}
            </h1>
            <p className="text-xl text-foreground/70 leading-7">
              {tabInfo.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadProject()}
            className="px-4 py-3 bg-brand-surface rounded-full border border-brand-border-light flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-80 transition-opacity shrink-0"
          >
            <ArrowCounterClockwiseIcon size={20} weight="regular" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Step Navigation */}
        <StepNav
          steps={STEPS}
          activeStep={activeStep}
          currentStepIndex={currentStepIndex}
          totalSteps={STEPS.length}
          onStepClick={setActiveStep}
        />

        {/* Tab Content */}
        {activeStep === "topic" && (
          <TopicsTab project={project} onRefresh={loadProject} />
        )}
        {activeStep === "research" && (
          <ResearchTab project={project} onRefresh={loadProject} />
        )}
        {activeStep === "script" && (
          <ScriptsTab project={project} onRefresh={loadProject} />
        )}
        {activeStep === "voice" && (
          <VoiceTab project={project} onRefresh={loadProject} />
        )}
        {activeStep === "scenes" && (
          <ScenesTab project={project} onRefresh={loadProject} />
        )}
        {activeStep === "export" && (
          <RenderTab project={project} onRefresh={loadProject} />
        )}
        {activeStep === "cost" && <CostsTab projectId={id} />}
      </main>

      {/* Sticky Bottom Actions */}
      <div className="sticky bottom-0 bg-background border-t border-brand-border-light px-6 py-4 flex items-center justify-end gap-5">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-4 py-3 bg-brand-surface rounded-full border border-brand-border-light text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
        >
          Back
        </button>
        {activeStep === "topic" && (
          <button
            type="button"
            onClick={() => setActiveStep("research")}
            className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity"
          >
            Start Research
          </button>
        )}
      </div>
    </div>
  );
}
