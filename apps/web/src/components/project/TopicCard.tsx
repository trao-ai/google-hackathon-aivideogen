import { CheckIcon } from "@phosphor-icons/react";
import { ScoreBar } from "./ScoreBar";
import type { TopicCardProps } from "@/types/components";

export function TopicCard({
  id,
  title,
  category,
  summary,
  thumbnailAngle,
  scores,
  isSelected,
  onSelect,
  loading,
}: TopicCardProps) {
  return (
    <div
      className={`h-full p-5 rounded-2xl border-2 flex flex-col gap-3 transition-colors ${
        isSelected
          ? "border-brand-green bg-brand-green-light"
          : "border-transparent bg-[#FAF9F5]"
      }`}
    >
      {/* Category badge */}
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-1 bg-brand-indigo-light rounded-full text-xs font-medium text-brand-indigo">
          {category}
        </span>
        <span
          className={`size-6 rounded-full flex items-center justify-center transition-colors ${
            isSelected ? "bg-brand-green" : "bg-transparent"
          }`}
        >
          {isSelected && (
            <CheckIcon size={14} weight="bold" className="text-white" />
          )}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground leading-snug">
        {title}
      </h3>

      {/* Summary */}
      <p className="text-sm text-brand-foreground-70 leading-relaxed line-clamp-3">
        {summary}
      </p>

      {/* Score Bars */}
      {scores.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          {scores.map((score) => (
            <ScoreBar
              key={score.label}
              label={score.label}
              value={score.value}
              max={score.max}
            />
          ))}
        </div>
      )}

      {/* Thumbnail Idea */}
      {thumbnailAngle && (
        <div className="flex flex-col gap-1 pt-1">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Thumbnail Idea
          </span>
          <p className="text-sm text-brand-foreground-70 line-clamp-2">
            {thumbnailAngle}
          </p>
        </div>
      )}

      {/* Spacer to push button down */}
      <div className="mt-auto" />

      {/* Select Button */}
      <button
        type="button"
        onClick={() => onSelect(id)}
        disabled={loading || isSelected}
        className={`w-full h-11 rounded-full text-sm font-medium transition-all ${
          isSelected
            ? "bg-brand-green text-white cursor-default"
            : "bg-brand-black text-brand-off-white hover:opacity-90 disabled:opacity-50"
        }`}
      >
        {isSelected ? "Selected" : "Select Topic"}
      </button>
    </div>
  );
}
