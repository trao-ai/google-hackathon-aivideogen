import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function useCosts(projectId: string) {
  return useQuery({
    queryKey: queryKeys.costs(projectId),
    queryFn: () => api.costs.get(projectId),
  });
}
