"use client";

import { useState } from "react";
import { api, type ProjectDetail, type Topic } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
}

export function TopicsTab({ project, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleApprove = async (topicId: string) => {
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

  const handleReject = async (topicId: string) => {
    setLoading(true);
    try {
      await api.topics.reject(project.id, topicId);
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const topics: Topic[] = project.topics ?? [];

  const isDiscovering = ["discovering_topics"].includes(project.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Topic Discovery</h2>
        <Button onClick={handleDiscover} disabled={loading || isDiscovering}>
          {isDiscovering
            ? "Discovering…"
            : loading
              ? "Working…"
              : "Discover Topics"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {topics.length === 0 && (
        <p className="text-sm text-gray-500">
          No topics yet. Click &ldquo;Discover Topics&rdquo; to start.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic) => (
          <Card
            key={topic.id}
            className={
              topic.id === project.selectedTopicId ? "ring-2 ring-blue-500" : ""
            }
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium leading-tight">{topic.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {topic.summary}
                  </p>
                  {topic.opportunityScore !== undefined && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {[
                        ["Opp", topic.opportunityScore],
                        ["Visual", topic.visualStorytellingScore],
                        ["Trend", topic.trendScore],
                        ["Evergreen", topic.evergreenScore],
                      ]
                        .filter(([, v]) => v !== undefined)
                        .map(([label, value]) => (
                          <span
                            key={label as string}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                          >
                            {label}: {Number(value).toFixed(1)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={topic.status} />
                  {topic.id === project.selectedTopicId && (
                    <span className="text-xs text-blue-600 font-medium">
                      Selected
                    </span>
                  )}
                </div>
              </div>
              {topic.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(topic.id)}
                    disabled={loading}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(topic.id)}
                    disabled={loading}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
