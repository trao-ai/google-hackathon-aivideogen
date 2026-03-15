import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type DiscoveredTopic } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import type { ProjectDetail } from "@/types/api";

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
    onMutate: async (topicId) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });

      const previous = qc.getQueryData<ProjectDetail>(
        queryKeys.projects.detail(projectId),
      );

      if (previous) {
        qc.setQueryData(queryKeys.projects.detail(projectId), {
          ...previous,
          selectedTopicId: topicId,
        });
      }

      return { previous };
    },
    onError: (_err, _topicId, context) => {
      if (context?.previous) {
        qc.setQueryData(
          queryKeys.projects.detail(projectId),
          context.previous,
        );
      }
    },
    onSettled: () => {
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
