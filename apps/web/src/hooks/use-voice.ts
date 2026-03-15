import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function useVoicePresets() {
  return useQuery({
    queryKey: queryKeys.voicePresets,
    queryFn: () => api.voice.presets(),
  });
}

export function useGenerateVoice(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (voice?: string) => api.voice.generate(projectId, voice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useDeleteVoice(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (voiceoverId: string) =>
      api.voice.delete(projectId, voiceoverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
