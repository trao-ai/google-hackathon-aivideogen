"use client";

import { useState } from "react";
import { api, type ProjectDetail, type Topic } from "@/lib/api";
import { TopicCard } from "@/components/project/TopicCard";
import type { ScoreBarProps } from "@/types/components";

type Props = {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
};

function getTopicScores(topic: Topic): ScoreBarProps[] {
  const scores: ScoreBarProps[] = [];
  if (topic.trendScore !== undefined) {
    scores.push({ label: "Viral", value: Math.round(topic.trendScore) });
  }
  if (topic.evergreenScore !== undefined) {
    scores.push({ label: "Edu", value: Math.round(topic.evergreenScore) });
  }
  if (topic.visualStorytellingScore !== undefined) {
    scores.push({
      label: "Visual",
      value: Math.round(topic.visualStorytellingScore),
    });
  }
  return scores;
}

export function TopicsTab({ project, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topics: Topic[] = project.topics ?? [];
  const isDiscovering = ["discovering_topics"].includes(project.status);

  const handleDiscover = async () => {
    setError("");
    setLoading(true);
    try {
      await api.topics.discover(project.id, { count: 10 });
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (topicId: string) => {
    setLoading(true);
    try {
      await api.topics.approve(project.id, topicId);
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-border-light py-16 text-center">
        <p className="mb-3 text-foreground/70">No topics discovered yet.</p>
        <button
          type="button"
          onClick={handleDiscover}
          disabled={loading || isDiscovering}
          className="px-4 py-3 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isDiscovering
            ? "Discovering..."
            : loading
              ? "Working..."
              : "Discover Topics"}
        </button>
        {error && (
          <p className="mt-3 text-sm text-brand-red">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-brand-red">{error}</p>}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            id={topic.id}
            title={topic.title}
            category={project.niche}
            summary={topic.summary}
            thumbnailAngle={topic.thumbnailAngle}
            scores={getTopicScores(topic)}
            isSelected={topic.id === project.selectedTopicId}
            onSelect={handleSelect}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
