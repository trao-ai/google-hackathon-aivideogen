import type { PipelineProgressProps, PipelineStep } from "@/types/components";

const STEP_LABELS: Record<PipelineStep, string> = {
  topic: "Topic",
  cost: "Cost",
  research: "Research",
  script: "Script",
  character: "Character",
  voice: "Voice",
  scenes: "Scenes",
  captions: "Captions",
  export: "Export",
};

export function PipelineProgress({
  currentStep,
  completedSteps,
  totalSteps,
}: PipelineProgressProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Progress</span>
        <span className="text-xs text-foreground/70">
          {completedSteps} of {totalSteps} ({STEP_LABELS[currentStep]})
        </span>
      </div>
      <div className="h-1.5 w-full bg-brand-beige rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-green rounded-full transition-all duration-500"
          style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
