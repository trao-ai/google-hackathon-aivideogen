import { apiClient } from "./axios";
import type {
  Project,
  ProjectDetail,
  Topic,
  ResearchBrief,
  Script,
  Voiceover,
  VoicePreset,
  SceneFrame,
  Scene,
  Render,
  CostSummary,
  CostAnalytics,
  CostEstimate,
} from "@/types/api";

export const api = {
  projects: {
    list: () =>
      apiClient.get<Project[]>("/api/projects").then((r) => r.data),
    create: (data: {
      title: string;
      niche: string;
      platform?: string;
      videoType?: string;
      videoStyle?: string;
      toneKeywords?: string[];
    }) =>
      apiClient.post<Project>("/api/projects", data).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<ProjectDetail>(`/api/projects/${id}`).then((r) => r.data),
    update: (
      id: string,
      data: Partial<{
        title: string;
        niche: string;
        videoProvider: string;
        platform: string;
        videoType: string;
        videoStyle: string;
        toneKeywords: string[];
      }>,
    ) =>
      apiClient.patch<Project>(`/api/projects/${id}`, data).then((r) => r.data),
    delete: (id: string) =>
      apiClient.delete<{ message: string }>(`/api/projects/${id}`).then((r) => r.data),
  },

  topics: {
    discover: (projectId: string, data: { count?: number }) =>
      apiClient
        .post<{ message: string; jobId: string }>(`/api/projects/${projectId}/discover-topics`, data)
        .then((r) => r.data),
    list: (projectId: string) =>
      apiClient.get<Topic[]>(`/api/projects/${projectId}/topics`).then((r) => r.data),
    approve: (projectId: string, topicId: string) =>
      apiClient
        .post<{ message: string }>(`/api/projects/${projectId}/topics/${topicId}/approve`)
        .then((r) => r.data),
    reject: (projectId: string, topicId: string) =>
      apiClient
        .post<{ message: string }>(`/api/projects/${projectId}/topics/${topicId}/reject`)
        .then((r) => r.data),
    analyzeChannel: (
      projectId: string,
      data: { channelUrl: string; channelName: string },
    ) =>
      apiClient
        .post<{ message: string; jobId: string }>(`/api/projects/${projectId}/channels`, data)
        .then((r) => r.data),
  },

  research: {
    start: (projectId: string) =>
      apiClient
        .post<ResearchBrief>(`/api/projects/${projectId}/research`)
        .then((r) => r.data),
    get: (projectId: string) =>
      apiClient
        .get<ResearchBrief | null>(`/api/projects/${projectId}/research`)
        .then((r) => r.data),
    delete: (projectId: string, briefId: string) =>
      apiClient
        .delete(`/api/projects/${projectId}/research/${briefId}`)
        .then((r) => r.data),
  },

  scripts: {
    generate: (
      projectId: string,
      data: { tone?: string; targetWordCount?: number; variants?: number; duration?: "short" | "long" },
    ) =>
      apiClient
        .post<Script>(`/api/projects/${projectId}/generate-scripts`, data)
        .then((r) => r.data),
    list: (projectId: string) =>
      apiClient.get<Script[]>(`/api/projects/${projectId}/scripts`).then((r) => r.data),
    approve: (projectId: string, scriptId: string) =>
      apiClient
        .post<{ message: string }>(`/api/projects/${projectId}/scripts/${scriptId}/approve`)
        .then((r) => r.data),
    delete: (projectId: string, scriptId: string) =>
      apiClient
        .delete(`/api/projects/${projectId}/scripts/${scriptId}`)
        .then((r) => r.data),
    rewriteSection: (
      projectId: string,
      scriptId: string,
      data: { sectionId: string; instructions: string },
    ) =>
      apiClient
        .post<{ message: string }>(`/api/projects/${projectId}/scripts/${scriptId}/rewrite-section`, data)
        .then((r) => r.data),
  },

  voice: {
    generate: (projectId: string, voice?: string) =>
      apiClient
        .post<Voiceover>(`/api/projects/${projectId}/generate-voice`, voice ? { voice } : {})
        .then((r) => r.data),
    presets: () =>
      apiClient.get<VoicePreset[]>("/api/projects/voice-presets").then((r) => r.data),
    get: (projectId: string) =>
      apiClient
        .get<Voiceover | null>(`/api/projects/${projectId}/voiceover`)
        .then((r) => r.data),
    delete: (projectId: string, voiceoverId: string) =>
      apiClient
        .delete(`/api/projects/${projectId}/voiceovers/${voiceoverId}`)
        .then((r) => r.data),
  },

  scenes: {
    plan: (projectId: string) =>
      apiClient
        .post<{ message: string; jobId: string }>(`/api/projects/${projectId}/plan-scenes`)
        .then((r) => r.data),
    list: (projectId: string) =>
      apiClient.get<Scene[]>(`/api/projects/${projectId}/scenes`).then((r) => r.data),
    regenerate: (projectId: string, sceneId: string) =>
      apiClient
        .post<{ message: string }>(`/api/projects/${projectId}/scenes/${sceneId}/regenerate`)
        .then((r) => r.data),
    generateVideo: (projectId: string, sceneId: string) =>
      apiClient
        .post<{ message: string; jobId: string }>(`/api/projects/${projectId}/scenes/${sceneId}/generate-video`)
        .then((r) => r.data),
    generateAllVideos: (projectId: string) =>
      apiClient
        .post<{ message: string; jobCount: number }>(`/api/projects/${projectId}/generate-videos`)
        .then((r) => r.data),
    planTransitions: (projectId: string) =>
      apiClient
        .post<{ message: string; jobId: string }>(`/api/projects/${projectId}/plan-transitions`)
        .then((r) => r.data),
    updateMotion: (
      projectId: string,
      sceneId: string,
      data: { motionNotes: string },
    ) =>
      apiClient
        .patch<Scene>(`/api/projects/${projectId}/scenes/${sceneId}/motion`, data)
        .then((r) => r.data),
  },

  frames: {
    generate: (projectId: string) =>
      apiClient
        .post<{ message: string; jobCount: number }>(`/api/projects/${projectId}/generate-frames`)
        .then((r) => r.data),
    list: (projectId: string, sceneId: string) =>
      apiClient
        .get<SceneFrame[]>(`/api/projects/${projectId}/scenes/${sceneId}/frames`)
        .then((r) => r.data),
    regenerateOne: (
      projectId: string,
      sceneId: string,
      frameId: string,
      prompt?: string,
    ) =>
      apiClient
        .post<{ message: string; jobId: string }>(
          `/api/projects/${projectId}/scenes/${sceneId}/frames/${frameId}/regenerate`,
          prompt ? { prompt } : {},
        )
        .then((r) => r.data),
    generateForScene: (projectId: string, sceneId: string) =>
      apiClient
        .post<{ message: string; jobCount: number }>(`/api/projects/${projectId}/scenes/${sceneId}/generate-frames`)
        .then((r) => r.data),
  },

  renders: {
    start: (projectId: string) =>
      apiClient
        .post<{ renderId: string; jobId: string; message: string }>(`/api/projects/${projectId}/render`)
        .then((r) => r.data),
    list: (projectId: string) =>
      apiClient.get<Render[]>(`/api/projects/${projectId}/renders`).then((r) => r.data),
    get: (projectId: string, renderId: string) =>
      apiClient
        .get<Render>(`/api/projects/${projectId}/renders/${renderId}`)
        .then((r) => r.data),
  },

  preview: {
    generate: (projectId: string) =>
      apiClient
        .post<{ videoUrl: string; subtitleUrl?: string; message: string }>(`/api/projects/${projectId}/preview`)
        .then((r) => r.data),
  },

  costs: {
    get: (projectId: string) =>
      apiClient.get<CostSummary>(`/api/projects/${projectId}/costs`).then((r) => r.data),
    analytics: () =>
      apiClient.get<CostAnalytics[]>("/api/projects/analytics/cost-summary").then((r) => r.data),
    estimate: (projectId: string, provider?: "kling" | "veo" | "seedance") =>
      apiClient
        .post<CostEstimate>(`/api/projects/${projectId}/estimate-costs`, {
          provider: provider || "kling",
        })
        .then((r) => r.data),
  },

  captions: {
    get: (projectId: string) =>
      apiClient
        .get<CaptionSettings>(`/api/projects/${projectId}/captions`)
        .then((r) => r.data),
    update: (projectId: string, settings: Partial<CaptionSettings>) =>
      apiClient
        .put<CaptionSettings>(`/api/projects/${projectId}/captions`, settings)
        .then((r) => r.data),
    regenerate: (projectId: string) =>
      apiClient
        .post<{ jobId: string; message: string }>(`/api/projects/${projectId}/captions/regenerate`)
        .then((r) => r.data),
    translate: (projectId: string, targetLanguage: string) =>
      apiClient
        .post<{ jobId: string; message: string }>(`/api/projects/${projectId}/captions/translate`, {
          targetLanguage,
        })
        .then((r) => r.data),
    apply: (projectId: string) =>
      apiClient
        .post<{ renderId: string; jobId: string; message: string }>(`/api/projects/${projectId}/captions/apply`)
        .then((r) => r.data),
  },

  discover: {
    start: () =>
      apiClient.post<{ topics: DiscoveredTopic[]; signalCount: number }>("/api/discover").then((r) => r.data),
    select: (topic: DiscoveredTopic) =>
      apiClient.post<{ projectId: string }>("/api/discover/select", topic).then((r) => r.data),
  },
};

export type DiscoveredTopic = {
  title: string;
  hook: string;
  category: string;
  viralityScore: number;
  educationalScore: number;
  visualScore: number;
  thumbnailAngle: string;
};

export type * from "@/types/api";
