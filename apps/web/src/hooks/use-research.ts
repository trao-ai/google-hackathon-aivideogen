import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function useStartResearch(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.research.start(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useDeleteResearch(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (briefId: string) =>
      api.research.delete(projectId, briefId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
