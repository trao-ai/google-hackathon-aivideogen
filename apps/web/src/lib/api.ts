import type {
  Project,
  ProjectDetail,
  Topic,
  ResearchBrief,
  Script,
  Voiceover,
  SceneFrame,
  Scene,
  Render,
  CostSummary,
  CostAnalytics,
  CostEstimate,
} from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Projects
export const api = {
  projects: {
    list: () => request<Project[]>("/api/projects"),
    create: (data: {
      title: string;
      niche: string;
      targetAudience?: string;
      toneKeywords?: string[];
    }) =>
      request<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<ProjectDetail>(`/api/projects/${id}`),
    update: (
      id: string,
      data: Partial<{ title: string; niche: string; targetAudience: string; videoProvider: string }>,
    ) =>
      request<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/projects/${id}`, { method: "DELETE" }),
  },

  topics: {
    discover: (projectId: string, data: { count?: number }) =>
      request<{ message: string; jobId: string }>(
        `/api/projects/${projectId}/discover-topics`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    list: (projectId: string) =>
      request<Topic[]>(`/api/projects/${projectId}/topics`),
    approve: (projectId: string, topicId: string) =>
      request<{ message: string }>(
        `/api/projects/${projectId}/topics/${topicId}/approve`,
        { method: "POST" },
      ),
    reject: (projectId: string, topicId: string) =>
      request<{ message: string }>(
        `/api/projects/${projectId}/topics/${topicId}/reject`,
        { method: "POST" },
      ),
    analyzeChannel: (
      projectId: string,
      data: { channelUrl: string; channelName: string },
    ) =>
      request<{ message: string; jobId: string }>(
        `/api/projects/${projectId}/channels`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
  },

  research: {
    start: (projectId: string) =>
      request<ResearchBrief>(
        `/api/projects/${projectId}/research`,
        { method: "POST" },
      ),
    get: (projectId: string) =>
      request<ResearchBrief | null>(`/api/projects/${projectId}/research`),
    delete: (projectId: string, briefId: string) =>
      request<void>(`/api/projects/${projectId}/research/${briefId}`, { method: "DELETE" }),
  },

  scripts: {
    generate: (
      projectId: string,
      data: { tone?: string; targetWordCount?: number; variants?: number; duration?: "short" | "long" },
    ) =>
      request<Script>(
        `/api/projects/${projectId}/generate-scripts`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    list: (projectId: string) =>
      request<Script[]>(`/api/projects/${projectId}/scripts`),
    approve: (projectId: string, scriptId: string) =>
      request<{ message: string }>(
        `/api/projects/${projectId}/scripts/${scriptId}/approve`,
        { method: "POST" },
      ),
    delete: (projectId: string, scriptId: string) =>
      request<void>(`/api/projects/${projectId}/scripts/${scriptId}`, { method: "DELETE" }),
    rewriteSection: (
      projectId: string,
      scriptId: string,
      data: { sectionId: string; instructions: string },
    ) =>
      request<{ message: string }>(
        `/api/projects/${projectId}/scripts/${scriptId}/rewrite-section`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
  },

  voice: {
    generate: (projectId: string, voice?: string) =>
      request<Voiceover>(
        `/api/projects/${projectId}/generate-voice`,
        { method: "POST", body: JSON.stringify(voice ? { voice } : {}) },
      ),
    presets: () =>
      request<VoicePreset[]>("/api/projects/voice-presets"),
    get: (projectId: string) =>
      request<Voiceover | null>(`/api/projects/${projectId}/voiceover`),
    delete: (projectId: string, voiceoverId: string) =>
      request<void>(`/api/projects/${projectId}/voiceovers/${voiceoverId}`, { method: "DELETE" }),
  },

  scenes: {
    plan: (projectId: string) =>
      request<{ message: string; jobId: string }>(
        `/api/projects/${projectId}/plan-scenes`,
        { method: "POST" },
      ),
    list: (projectId: string) =>
      request<Scene[]>(`/api/projects/${projectId}/scenes`),
    regenerate: (projectId: string, sceneId: string) =>
      request<{ message: string }>(
        `/api/projects/${projectId}/scenes/${sceneId}/regenerate`,
        { method: "POST" },
      ),
    generateVideo: (projectId: string, sceneId: string) =>
      request<{ message: string; jobId: string }>(
        `/api/projects/${projectId}/scenes/${sceneId}/generate-video`,
        { method: "POST" },
      ),
    generateAllVideos: (projectId: string) =>
      request<{ message: string; jobCount: number }>(
        `/api/projects/${projectId}/generate-videos`,
        { method: "POST" },
      ),
    planTransitions: (projectId: string) =>
      request<{ message: string; jobId: string }>(
        `/api/projects/${projectId}/plan-transitions`,
        { method: "POST" },
      ),
    updateMotion: (
      projectId: string,
      sceneId: string,
      data: { motionNotes: string },
    ) =>
      request<Scene>(
        `/api/projects/${projectId}/scenes/${sceneId}/motion`,
        { method: "PATCH", body: JSON.stringify(data) },
      ),
  },

  frames: {
    generate: (projectId: string) =>
      request<{ message: string; jobCount: number }>(
        `/api/projects/${projectId}/generate-frames`,
        { method: "POST" },
      ),
    list: (projectId: string, sceneId: string) =>
      request<SceneFrame[]>(
        `/api/projects/${projectId}/scenes/${sceneId}/frames`,
      ),
    regenerateOne: (
      projectId: string,
      sceneId: string,
      frameId: string,
      prompt?: string,
    ) =>
      request<{ message: string; jobId: string }>(
        `/api/projects/${projectId}/scenes/${sceneId}/frames/${frameId}/regenerate`,
        {
          method: "POST",
          body: JSON.stringify(prompt ? { prompt } : {}),
        },
      ),
    generateForScene: (projectId: string, sceneId: string) =>
      request<{ message: string; jobCount: number }>(
        `/api/projects/${projectId}/scenes/${sceneId}/generate-frames`,
        { method: "POST" },
      ),
  },

  renders: {
    start: (projectId: string) =>
      request<{ renderId: string; jobId: string; message: string }>(
        `/api/projects/${projectId}/render`,
        { method: "POST" },
      ),
    list: (projectId: string) =>
      request<Render[]>(`/api/projects/${projectId}/renders`),
    get: (projectId: string, renderId: string) =>
      request<Render>(`/api/projects/${projectId}/renders/${renderId}`),
  },

  costs: {
    get: (projectId: string) =>
      request<CostSummary>(`/api/projects/${projectId}/costs`),
    analytics: () =>
      request<CostAnalytics[]>("/api/projects/analytics/cost-summary"),
    estimate: (projectId: string, provider?: "kling" | "veo" | "seedance") =>
      request<CostEstimate>(`/api/projects/${projectId}/estimate-costs`, {
        method: "POST",
        body: JSON.stringify({ provider: provider || "kling" }),
      }),
  },
};

// Re-export all API types from the centralized types directory
export type * from "@/types/api";
