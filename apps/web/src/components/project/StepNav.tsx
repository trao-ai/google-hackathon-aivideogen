import type { StepNavProps } from "@/types/components";

export function StepNav({
  steps,
  activeStep,
  onStepClick,
}: StepNavProps) {
  const activeIdx = steps.findIndex((s) => s.id === activeStep);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-5">
        {steps.map((step, idx) => {
          const isActive = step.id === activeStep;
          const isCompleted = idx < activeIdx;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick?.(step.id)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-black text-brand-off-white"
                  : isCompleted
                    ? "bg-brand-green text-brand-off-white"
                    : "bg-brand-surface border border-brand-border-light text-foreground"
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
