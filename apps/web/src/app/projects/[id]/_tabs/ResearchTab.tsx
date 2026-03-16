"use client";

import { useState } from "react";
import {
  BookOpenIcon,
  ChartBarIcon,
  LightbulbIcon,
  ClockIcon,
  WarningCircleIcon,
  InfoIcon,
  LinkIcon,
  SparkleIcon,
  ArrowClockwiseIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { ProjectDetail, ResearchBrief } from "@/lib/api";
import { useStartResearch, useDeleteResearch } from "@/hooks/use-research";

type Props = {
  project: ProjectDetail;
};

export function ResearchTab({ project }: Props) {
  const [error, setError] = useState("");
  const startResearch = useStartResearch(project.id);
  const deleteResearch = useDeleteResearch(project.id);

  const briefs: ResearchBrief[] = project.researchBriefs ?? [];
  const brief = briefs[0];
  const isResearching = project.status === "researching";
  const loading = startResearch.isPending || deleteResearch.isPending;

  const handleStartResearch = () => {
    setError("");
    startResearch.mutate(undefined, {
      onError: (err) => setError(err.message),
    });
  };

  const handleDelete = (briefId: string) => {
    setError("");
    deleteResearch.mutate(briefId, {
      onError: (err) => setError(err.message),
    });
  };

  // No research brief yet — show generate button
  if (!brief) {
    return (
      <div className="flex flex-col gap-5">
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <div className="rounded-2xl border border-dashed border-brand-border-light py-16 text-center">
          <p className="mb-3 text-foreground/70">
            {isResearching
              ? "Researching your topic..."
              : "No research generated yet."}
          </p>
          <button
            type="button"
            onClick={handleStartResearch}
            disabled={loading || isResearching}
            className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isResearching ? "Researching..." : "Start Research"}
          </button>
        </div>
      </div>
    );
  }

  const sourceCount = brief.sources?.length ?? 0;
  const confidencePercent = Math.round((brief.confidenceScore ?? 0) * 100);

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-brand-red">{error}</p>}

      {/* Overview */}
      <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BookOpenIcon
            size={20}
            weight="duotone"
            className="text-brand-green"
          />
          <h3 className="text-base font-medium text-foreground">Overview</h3>
        </div>
        <p className="text-sm font-extralight text-brand-foreground-70">
          {brief.summary}
        </p>
      </section>

      {/* Key Facts + Stats Row */}
      <div className="grid grid-cols-2 gap-5">
        {/* Key Facts */}
        {brief.keyFacts?.length > 0 && (
          <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <LightbulbIcon
                size={20}
                weight="duotone"
                className="text-brand-yellow"
              />
              <h3 className="text-base font-medium text-foreground">
                Key Facts
              </h3>
            </div>
            <ul className="flex flex-col gap-3">
              {brief.keyFacts.map((fact, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm font-normal text-brand-foreground-70"
                >
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-foreground-50" />
                  {fact}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Statistics */}
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ChartBarIcon
              size={20}
              weight="duotone"
              className="text-brand-orange"
            />
            <h3 className="text-base font-medium text-foreground">
              Statistics
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#F0EEE7]/50 rounded-xl border border-brand-border-light p-3 flex flex-col gap-0.5">
              <p className="text-sm font-normal text-foreground">
                Sources:{" "}
                <span className="font-medium">{sourceCount}</span>
              </p>
              <p className="text-xs font-normal text-brand-green">
                Academic & web sources
              </p>
            </div>
            <div className="bg-[#F0EEE7]/50 rounded-xl border border-brand-border-light p-3 flex flex-col gap-0.5">
              <p className="text-sm font-normal text-foreground">
                Confidence:{" "}
                <span className="font-medium">{confidencePercent}%</span>
              </p>
              <p className="text-xs font-normal text-brand-green">
                Based on verified sources
              </p>
            </div>
            <div className="bg-[#F0EEE7]/50 rounded-xl border border-brand-border-light p-3 flex flex-col gap-0.5">
              <p className="text-sm font-normal text-foreground">
                Key Facts:{" "}
                <span className="font-medium">{brief.keyFacts?.length ?? 0}</span>
              </p>
            </div>
            <div className="bg-[#F0EEE7]/50 rounded-xl border border-brand-border-light p-3 flex flex-col gap-0.5">
              <p className="text-sm font-normal text-foreground">
                Story Angles:{" "}
                <span className="font-medium">{brief.storyAngles?.length ?? 0}</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Background + Current Developments */}
      {(brief.background || brief.currentDevelopments) && (
        <div className="grid grid-cols-2 gap-5">
          {brief.background && (
            <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ClockIcon
                  size={20}
                  weight="duotone"
                  className="text-brand-orange"
                />
                <h3 className="text-base font-medium text-foreground">
                  Background
                </h3>
              </div>
              <p className="text-sm font-extralight text-brand-foreground-70">
                {brief.background}
              </p>
            </section>
          )}

          {brief.currentDevelopments && (
            <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <SparkleIcon
                  size={20}
                  weight="duotone"
                  className="text-brand-green"
                />
                <h3 className="text-base font-medium text-foreground">
                  Latest Developments
                </h3>
              </div>
              <p className="text-sm font-extralight text-brand-foreground-70">
                {brief.currentDevelopments}
              </p>
            </section>
          )}
        </div>
      )}

      {/* Story Angles */}
      {brief.storyAngles?.length > 0 && (
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <LightbulbIcon
              size={20}
              weight="duotone"
              className="text-brand-indigo"
            />
            <h3 className="text-base font-medium text-foreground">
              Story Angles
            </h3>
          </div>
          <div className="flex flex-col gap-3">
            {brief.storyAngles.map((angle, i) => (
              <div
                key={i}
                className="border-l-2 border-l-brand-indigo pl-3"
              >
                <p className="text-sm font-normal text-brand-foreground-70">
                  {angle}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Controversies + Why It Matters */}
      {(brief.controversies || brief.stakes) && (
        <div className="grid grid-cols-2 gap-5">
          {brief.controversies && (
            <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <WarningCircleIcon
                  size={20}
                  weight="duotone"
                  className="text-brand-red"
                />
                <h3 className="text-base font-medium text-foreground">
                  Controversies
                </h3>
              </div>
              <p className="text-sm font-extralight text-brand-foreground-70">
                {brief.controversies}
              </p>
            </section>
          )}

          {brief.stakes && (
            <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <InfoIcon
                  size={20}
                  weight="duotone"
                  className="text-brand-indigo"
                />
                <h3 className="text-base font-medium text-foreground">
                  Why It Matters
                </h3>
              </div>
              <p className="text-sm font-extralight text-brand-foreground-70">
                {brief.stakes}
              </p>
            </section>
          )}
        </div>
      )}

      {/* Sources */}
      {brief.sources?.length > 0 && (
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <LinkIcon size={20} weight="duotone" className="text-brand-green" />
            <h3 className="text-base font-medium text-foreground">Sources</h3>
          </div>
          <div className="flex flex-col divide-y divide-brand-border-light">
            {brief.sources.map((src, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col gap-0.5">
                  {src.url ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-normal text-brand-green hover:underline"
                    >
                      {src.title}
                    </a>
                  ) : (
                    <span className="text-sm font-normal text-brand-green">
                      {src.title}
                    </span>
                  )}
                  {src.keyContribution && (
                    <span className="text-xs font-normal text-brand-foreground-50">
                      {src.keyContribution}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {src.credibility && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      src.credibility === "high"
                        ? "bg-brand-green-light text-brand-green"
                        : src.credibility === "medium"
                          ? "bg-brand-yellow-light text-brand-yellow"
                          : "bg-brand-red-light text-brand-red"
                    }`}>
                      {src.credibility}
                    </span>
                  )}
                  {src.year && (
                    <span className="text-sm font-normal text-brand-foreground-50">
                      {src.year}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleStartResearch}
          disabled={loading || isResearching}
          className="px-4 py-2.5 bg-[#FBFBF7] rounded-full border border-brand-border-light flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <ArrowClockwiseIcon size={16} weight="regular" />
          {isResearching ? "Researching..." : "Re-Research"}
        </button>
        <button
          type="button"
          onClick={() => handleDelete(brief.id)}
          disabled={loading}
          className="px-4 py-2.5 bg-[#FBFBF7] rounded-full border border-brand-red flex items-center gap-2 text-sm font-medium text-brand-red hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <TrashIcon size={16} weight="regular" />
          Delete
        </button>
      </div>
    </div>
  );
}
