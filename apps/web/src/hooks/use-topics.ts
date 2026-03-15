import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type DiscoveredTopic } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function useDiscoverTopics(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { count?: number }) =>
      api.topics.discover(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useApproveTopic(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) => api.topics.approve(projectId, topicId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useDiscoverViralTopics() {
  return useMutation({
    mutationFn: () => api.discover.start(),
  });
}

export function useSelectDiscoveredTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topic: DiscoveredTopic) => api.discover.select(topic),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
