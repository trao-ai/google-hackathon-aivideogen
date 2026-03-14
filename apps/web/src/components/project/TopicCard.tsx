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
      className={`flex-1 p-5 bg-brand-off-white rounded-2xl border flex flex-col gap-2.5 overflow-hidden ${
        isSelected ? "border-brand-green" : "border-brand-border-light"
      }`}
    >
      {/* Title + Category */}
      <div className="flex items-start justify-between gap-5">
        <h3 className="flex-1 text-base font-semibold text-foreground leading-6">
          {title}
        </h3>
        <span className="px-3.5 py-1 bg-brand-blue/20 rounded-full text-xs text-brand-blue shrink-0">
          {category}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground/70 leading-6">{summary}</p>

      {/* Score Bars */}
      {scores.length > 0 && (
        <div className="flex flex-col gap-1">
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
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground leading-6">
            Thumbnail Idea
          </span>
          <p className="text-sm text-foreground/70 leading-6">
            {thumbnailAngle}
          </p>
        </div>
      )}

      {/* Select Button */}
      <button
        type="button"
        onClick={() => onSelect(id)}
        disabled={loading || isSelected}
        className="w-full px-4 py-2.5 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isSelected ? "Selected" : "Select Topic"}
      </button>
    </div>
  );
}
