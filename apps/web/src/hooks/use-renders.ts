import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function useRenders(projectId: string) {
  return useQuery({
    queryKey: queryKeys.renders(projectId),
    queryFn: () => api.renders.list(projectId),
    refetchInterval: 5_000,
  });
}

export function useStartRender(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.renders.start(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.renders(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
