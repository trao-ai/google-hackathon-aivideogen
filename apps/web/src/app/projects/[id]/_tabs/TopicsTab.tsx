"use client";

import { useState } from "react";
import type { ProjectDetail, Topic } from "@/lib/api";
import { useDiscoverTopics, useApproveTopic } from "@/hooks/use-topics";
import { useUpdateProject } from "@/hooks/use-projects";
import { TopicCard } from "@/components/project/TopicCard";
import type { ScoreBarProps } from "@/types/components";

type Props = {
  project: ProjectDetail;
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

export function TopicsTab({ project }: Props) {
  const [error, setError] = useState("");
  const discoverTopics = useDiscoverTopics(project.id);
  const approveTopic = useApproveTopic(project.id);
  const updateProject = useUpdateProject(project.id);

  const apiTopics: Topic[] = project.topics ?? [];
  const topics = apiTopics.length > 0 ? apiTopics : MOCK_TOPICS;
  const isDiscovering = ["discovering_topics", "topic_discovery"].includes(project.status);
  const loading = discoverTopics.isPending || approveTopic.isPending;

  const handleDiscover = () => {
    setError("");
    discoverTopics.mutate(
      { count: 10 },
      { onError: (err) => setError(err.message) },
    );
  };

  const handleSelect = (topicId: string) => {
    // Find the topic to auto-set the project title
    const selectedTopic = topics.find((t) => t.id === topicId);

    approveTopic.mutate(topicId, {
      onSuccess: () => {
        // Auto-update project title from the selected topic
        if (selectedTopic) {
          updateProject.mutate({ title: selectedTopic.title });
        }
      },
      onError: (err) => setError(err.message),
    });
  };

  if (apiTopics.length === 0) {
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
