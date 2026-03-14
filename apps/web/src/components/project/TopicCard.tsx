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
      className={`flex-1 p-5 bg-[#FAF9F5] rounded-2xl border flex flex-col gap-2.5 overflow-hidden ${
        isSelected ? "border-brand-green" : "border-brand-border-light"
      }`}
    >
      {/* Title + Category */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex-1 text-base font-medium text-foreground">
          {title}
        </h3>
        <span className="px-2.5 py-1.5 bg-brand-indigo-light rounded-full inline-flex justify-center items-center text-xs font-normal text-brand-indigo shrink-0">
          {category}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm font-extralight text-brand-foreground-70">
        {summary}
      </p>

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
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Thumbnail Idea
          </span>
          <p className="text-sm font-normal text-brand-foreground-70">
            {thumbnailAngle}
          </p>
        </div>
      )}

      {/* Select Button */}
      <button
        type="button"
        onClick={() => onSelect(id)}
        disabled={loading || isSelected}
        className="w-full h-11 px-4 py-2.5 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isSelected ? "Selected" : "Select Topic"}
      </button>
    </div>
  );
}
