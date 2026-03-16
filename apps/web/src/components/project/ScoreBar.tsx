import type { ScoreBarProps } from "@/types/components";

export function ScoreBar({ label, value, max = 100 }: ScoreBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="flex items-center gap-4">
      <span className="w-9 text-xs text-foreground shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-brand-border-light rounded-full overflow-hidden">
        <div
          className="h-1.5 bg-brand-green rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground/70 w-6 text-right">
        {value}
      </span>
    </div>
  );
}
