import type { StepNavProps } from "@/types/components";

export function StepNav({
  steps,
  activeStep,
  currentStepIndex,
  totalSteps,
  onStepClick,
}: StepNavProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-5">
        {steps.map((step) => {
          const isActive = step.id === activeStep;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick?.(step.id)}
              className={`px-4 py-2.5 rounded-full bg-[#FAF9F580] text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-black text-brand-off-white"
                  : "bg-brand-surface border border-brand-border-light text-foreground"
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </div>
      <span className="px-3.5 py-1.5 bg-brand-green-light rounded-full text-xs font-medium text-brand-green">
        Step {currentStepIndex + 1} of {totalSteps}
      </span>
    </div>
  );
}
