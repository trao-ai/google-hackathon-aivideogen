import { cn } from "@/lib/utils";
import type {
  PipelineProgressProps,
  PipelineStep,
  StepStatus,
} from "@/types/components";

const STEPS: PipelineStep[] = [
  "topic",
  "cost",
  "research",
  "script",
  "voice",
  "scenes",
  "export",
];

const STEP_LABELS: Record<PipelineStep, string> = {
  topic: "Topic",
  cost: "Cost",
  research: "Research",
  script: "Script",
  voice: "Voice",
  scenes: "Scenes",
  export: "Export",
};

function getStepStatus(
  step: PipelineStep,
  currentStep: PipelineStep,
): StepStatus {
  const currentIdx = STEPS.indexOf(currentStep);
  const stepIdx = STEPS.indexOf(step);

  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

const barStyles: Record<StepStatus, string> = {
  completed: "bg-brand-green",
  active: "bg-gradient-to-r from-brand-blue to-[#6455D9]",
  pending: "bg-brand-beige",
};

const labelStyles: Record<StepStatus, string> = {
  completed: "text-foreground/70",
  active: "text-foreground font-medium",
  pending: "text-foreground/50",
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
      <div className="flex items-start gap-1">
        {STEPS.map((step) => {
          const status = getStepStatus(step, currentStep);
          return (
            <div key={step} className="flex-1 flex flex-col gap-1.5">
              <div className={cn("h-1.5 rounded-full", barStyles[status])} />
              <span className={cn("text-xs leading-4", labelStyles[status])}>
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
