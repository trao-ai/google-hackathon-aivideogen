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
      data: Partial<{ title: string; niche: string; targetAudience: string }>,
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
      data: { tone?: string; targetWordCount?: number; variants?: number },
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
    generate: (projectId: string) =>
      request<Voiceover>(
        `/api/projects/${projectId}/generate-voice`,
        { method: "POST" },
      ),
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
  },
};

// Lightweight type aliases for API responses (not importing from @atlas/shared to keep types lean)
export interface Project {
  id: string;
  title: string;
  niche: string;
  status: string;
  totalCostUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  targetAudience?: string;
  toneKeywords?: string[];
  selectedTopicId?: string;
  selectedScriptId?: string;
  selectedVoiceoverId?: string;
  topics?: Topic[];
  researchBriefs?: ResearchBrief[];
  scripts?: Script[];
  voiceovers?: Voiceover[];
  scenes?: Scene[];
  renders?: Render[];
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  thumbnailAngle?: string;
  status: string;
  opportunityScore?: number;
  visualStorytellingScore?: number;
  evergreenScore?: number;
  trendScore?: number;
  curiosityGapScore?: number;
  factDensityScore?: number;
  createdAt: string;
}

export interface ResearchBrief {
  id: string;
  projectId: string;
  summary: string;
  background?: string;
  currentDevelopments?: string;
  controversies?: string;
  stakes?: string;
  keyFacts: string[];
  storyAngles: string[];
  claims: Array<{ fact?: string; text?: string; confidence?: string; source?: string }>;
  sources: Array<{ title: string; url: string; type: string; year?: number; credibility?: string; keyContribution?: string }>;
  confidenceScore: number;
  createdAt: string;
}

export interface ScriptSection {
  id: string;
  orderIndex: number;
  sectionType: string;
  text: string;
  estimatedDurationSec: number;
}

export interface Script {
  id: string;
  titleCandidates: string[];
  outline: string;
  fullText: string;
  estimatedDurationSec: number;
  status: string;
  sections?: ScriptSection[];
  createdAt: string;
}

export interface Voiceover {
  id: string;
  audioUrl: string;
  durationSec: number;
  segments: unknown[];
  createdAt: string;
}

export interface SceneFrame {
  id: string;
  frameType: string;
  imageUrl: string;
  prompt: string;
  width?: number;
  height?: number;
}

export interface SceneClip {
  id: string;
  videoUrl: string;
  durationSec: number;
  costUsd: number;
}

export interface Scene {
  id: string;
  // Prisma field names
  orderIndex: number;
  sceneType: string;
  narrationStartSec: number;
  narrationEndSec: number;
  purpose: string;
  motionNotes: string;
  startPrompt: string;
  endPrompt: string;
  bubbleText?: string | null;
  continuityNotes?: string | null;
  frameStatus?: string;
  clipStatus?: string;
  // Aliases used by old UI (kept for compat)
  order: number;
  type: string;
  title: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  visualDescription: string;
  animationNotes?: string;
  frames?: SceneFrame[];
  clip?: SceneClip | null;
}

export interface Render {
  id: string;
  projectId: string;
  videoUrl: string | null;
  subtitleUrl: string | null;
  durationSec: number | null;
  costUsd: number;
  status: "pending" | "processing" | "complete" | "failed";
  step?: string | null;
  errorMsg: string | null;
  createdAt: string;
}

export interface CostSummary {
  breakdown: Array<{ stage: string; totalCostUsd: number; eventCount: number }>;
  total: number;
  costPerFinishedMinute?: number;
}

export interface CostAnalytics {
  stage: string;
  _sum: { totalCostUsd: number };
  _count: { id: number };
  _avg: { totalCostUsd: number };
}
