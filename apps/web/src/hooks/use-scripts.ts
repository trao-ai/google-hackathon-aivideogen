import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function useGenerateScript(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { duration?: "short" | "long" }) =>
      api.scripts.generate(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useApproveScript(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scriptId: string) =>
      api.scripts.approve(projectId, scriptId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useDeleteScript(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scriptId: string) =>
      api.scripts.delete(projectId, scriptId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useRewriteSection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      scriptId: string;
      sectionId: string;
      instructions: string;
    }) =>
      api.scripts.rewriteSection(projectId, data.scriptId, {
        sectionId: data.sectionId,
        instructions: data.instructions,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
