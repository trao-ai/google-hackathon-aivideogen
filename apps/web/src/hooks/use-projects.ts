import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: () => api.projects.list(),
    refetchInterval: 10_000,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => api.projects.get(id),
    refetchInterval: 8_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.projects.create>[0]) =>
      api.projects.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.projects.update>[1]) =>
      api.projects.update(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
