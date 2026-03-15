import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  voicePresets: ["voice-presets"] as const,
  renders: (projectId: string) => ["renders", projectId] as const,
  costs: (projectId: string) => ["costs", projectId] as const,
};
