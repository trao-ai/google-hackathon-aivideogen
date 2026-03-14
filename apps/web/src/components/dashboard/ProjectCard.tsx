"use client";

import Link from "next/link";
import Image from "next/image";
import {
  PlayIcon,
  EyeIcon,
  DotsThreeVerticalIcon,
} from "@phosphor-icons/react";
import { formatCost } from "@/lib/utils";
import { PipelineProgress } from "./PipelineProgress";
import type { ProjectCardProps } from "@/types/components";

const statusConfig = {
  in_progress: {
    label: "In Progress",
    className: "bg-[rgba(117,154,200,0.2)] text-brand-blue",
  },
  completed: {
    label: "Completed",
    className: "bg-[rgba(0,161,145,0.2)] text-brand-green",
  },
  draft: {
    label: "Draft",
    className: "bg-[rgba(0,0,0,0.1)] text-foreground/60",
  },
  failed: {
    label: "Failed",
    className: "bg-[rgba(255,82,82,0.2)] text-brand-red",
  },
};

function StatusBadge({ status }: { status: ProjectCardProps["status"] }) {
  const config = statusConfig[status];
  return (
    <span className={`px-3.5 py-1.5 rounded-full text-xs inline-flex items-center justify-center ${config.className}`}>
      {config.label}
    </span>
  );
}

export function ProjectCard({
  id,
  title,
  category,
  status,
  thumbnailUrl,
  cost,
  date,
  currentStep,
  completedSteps,
}: ProjectCardProps) {
  const isCompleted = status === "completed";

  return (
    <div className="p-3 bg-brand-off-white rounded-2xl border border-brand-beige flex flex-col gap-3 overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted rounded-2xl overflow-hidden">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt={title} fill className="object-cover" />
        ) : (
          <div className="size-full bg-gradient-to-br from-brand-beige to-muted" />
        )}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-12 bg-brand-off-white rounded-full flex items-center justify-center">
              <PlayIcon
                size={20}
                weight="regular"
                className="text-foreground ml-0.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Title + Status */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold text-foreground leading-6">
            {title}
          </h3>
          <StatusBadge status={status} />
        </div>
        <p className="text-sm text-foreground/70">{category}</p>
      </div>

      {/* Pipeline Progress */}
      <PipelineProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
        totalSteps={7}
      />

      {/* Cost + Date */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {formatCost(cost)}
        </span>
        <span className="text-sm text-foreground">{date}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href={`/projects/${id}`}
          className="flex-1 px-4 py-2.5 bg-brand-black rounded-full flex items-center justify-center gap-2 text-brand-off-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {isCompleted ? (
            <>
              <EyeIcon size={20} weight="regular" />
              <span>View Video</span>
            </>
          ) : (
            <>
              <PlayIcon size={20} weight="regular" />
              <span>Continue Generation</span>
            </>
          )}
        </Link>
        {isCompleted && (
          <button className="size-11 bg-brand-off-white border border-brand-beige rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <DotsThreeVerticalIcon
              size={20}
              weight="bold"
              className="text-foreground"
            />
          </button>
        )}
      </div>
    </div>
  );
}
