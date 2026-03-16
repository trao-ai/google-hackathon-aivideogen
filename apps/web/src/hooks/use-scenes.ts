import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function usePlanScenes(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.scenes.plan(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useGenerateFrames(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.frames.generate(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useGenerateAllVideos(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.scenes.generateAllVideos(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useRegenerateFrame(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { sceneId: string; frameId: string; prompt?: string }) =>
      api.frames.regenerateOne(projectId, params.sceneId, params.frameId, params.prompt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useGenerateVideo(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sceneId: string) =>
      api.scenes.generateVideo(projectId, sceneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useGenerateSceneFrames(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sceneId: string) =>
      api.frames.generateForScene(projectId, sceneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useUpdateMotion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { sceneId: string; motionNotes: string }) =>
      api.scenes.updateMotion(projectId, params.sceneId, {
        motionNotes: params.motionNotes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function usePlanTransitions(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.scenes.planTransitions(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
