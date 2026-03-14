import { cn } from "@/lib/utils";
import type { StatCardProps } from "@/types/components";

const positionStyles = {
  first: "rounded-l-2xl",
  middle: "",
  last: "rounded-r-2xl",
};

export function StatCard({
  label,
  value,
  icon,
  position = "middle",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex-1 p-5 bg-brand-surface border border-brand-border-light flex items-center justify-between overflow-hidden",
        positionStyles[position],
      )}
    >
      <div className="flex flex-col gap-2.5">
        <span className="text-base text-foreground/70">{label}</span>
        <span className="text-4xl font-semibold text-foreground">{value}</span>
      </div>
      <div className="size-20 p-3.5 bg-secondary rounded-2xl flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}
