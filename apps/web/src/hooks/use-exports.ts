import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function useExports(projectId: string, renderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.exports(renderId ?? ""),
    queryFn: () => api.exports.list(projectId, renderId!),
    enabled: !!renderId,
    refetchInterval: 5_000,
  });
}

export function useStartExport(projectId: string, renderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: {
      format: string;
      resolution: string;
      quality: string;
    }) => api.exports.start(projectId, renderId!, options),
    onSuccess: () => {
      if (renderId) {
        qc.invalidateQueries({ queryKey: queryKeys.exports(renderId) });
      }
    },
  });
}
