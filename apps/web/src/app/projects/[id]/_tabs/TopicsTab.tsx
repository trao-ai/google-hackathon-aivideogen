"use client";

import { useState } from "react";
import { api, type ProjectDetail, type Topic } from "@/lib/api";
import { TopicCard } from "@/components/project/TopicCard";
import type { ScoreBarProps } from "@/types/components";

type Props = {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
};

const MOCK_TOPICS: Topic[] = [
  {
    id: "mock-1",
    title: "Why Churros Outperformed Disney+ in the Profit Race",
    summary:
      "Disney's theme park churros are now generating more revenue than its streaming platform, highlighting unexpected shifts in entertainment profits.",
    thumbnailAngle:
      "A giant stack of churros towering over a small Disney+ logo with dollar symbols floating around.",
    status: "discovered",
    trendScore: 85,
    evergreenScore: 88,
    visualStorytellingScore: 80,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    title: "Why Churros Outperformed Disney+ in the Profit Race",
    summary:
      "Disney's theme park churros are now generating more revenue than its streaming platform, highlighting unexpected shifts in entertainment profits.",
    thumbnailAngle:
      "A giant stack of churros towering over a small Disney+ logo with dollar symbols floating around.",
    status: "discovered",
    trendScore: 85,
    evergreenScore: 88,
    visualStorytellingScore: 80,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-3",
    title: "Why Churros Outperformed Disney+ in the Profit Race",
    summary:
      "Disney's theme park churros are now generating more revenue than its streaming platform, highlighting unexpected shifts in entertainment profits.",
    thumbnailAngle:
      "A giant stack of churros towering over a small Disney+ logo with dollar symbols floating around.",
    status: "discovered",
    trendScore: 85,
    evergreenScore: 88,
    visualStorytellingScore: 80,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-4",
    title: "Why Churros Outperformed Disney+ in the Profit Race",
    summary:
      "Disney's theme park churros are now generating more revenue than its streaming platform, highlighting unexpected shifts in entertainment profits.",
    thumbnailAngle:
      "A giant stack of churros towering over a small Disney+ logo with dollar symbols floating around.",
    status: "discovered",
    trendScore: 85,
    evergreenScore: 88,
    visualStorytellingScore: 80,
    createdAt: new Date().toISOString(),
  },
];

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

  const apiTopics: Topic[] = project.topics ?? [];
  const topics = apiTopics.length > 0 ? apiTopics : MOCK_TOPICS;
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

  if (apiTopics.length === 0 && project.status !== "draft") {
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
        {error && <p className="mt-3 text-sm text-brand-red">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-brand-red">{error}</p>}

      <div className="flex items-start gap-5">
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
