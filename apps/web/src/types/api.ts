export type Project = {
  id: string;
  title: string;
  niche: string;
  status: string;
  totalCostUsd: number;
  platform?: string;
  videoType?: string;
  videoStyle?: string;
  toneKeywords?: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetail = Project & {
  targetAudience?: string;
  toneKeywords?: string[];
  videoProvider?: string;
  selectedTopicId?: string;
  selectedScriptId?: string;
  selectedVoiceoverId?: string;
  selectedCharacterId?: string;
  topics?: Topic[];
  researchBriefs?: ResearchBrief[];
  scripts?: Script[];
  voiceovers?: Voiceover[];
  scenes?: Scene[];
  renders?: Render[];
  characters?: Character[];
};

export type Topic = {
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
};

export type ResearchBrief = {
  id: string;
  projectId: string;
  summary: string;
  background?: string;
  currentDevelopments?: string;
  controversies?: string;
  stakes?: string;
  keyFacts: string[];
  storyAngles: string[];
  claims: Array<{
    fact?: string;
    text?: string;
    confidence?: string;
    source?: string;
  }>;
  sources: Array<{
    title: string;
    url: string;
    type: string;
    year?: number;
    credibility?: string;
    keyContribution?: string;
  }>;
  confidenceScore: number;
  createdAt: string;
};

export type ScriptSection = {
  id: string;
  orderIndex: number;
  sectionType: string;
  text: string;
  estimatedDurationSec: number;
};

export type Script = {
  id: string;
  titleCandidates: string[];
  outline: string;
  fullText: string;
  estimatedDurationSec: number;
  status: string;
  sections?: ScriptSection[];
  createdAt: string;
};

export type Voiceover = {
  id: string;
  audioUrl: string;
  durationSec: number;
  segments: unknown[];
  createdAt: string;
};

export type SceneFrame = {
  id: string;
  frameType: string;
  imageUrl: string;
  prompt: string;
  width?: number;
  height?: number;
};

export type SceneClip = {
  id: string;
  videoUrl: string;
  durationSec: number;
  costUsd: number;
};

export type TransitionPlan = {
  type: string;
  durationSec: number;
  direction?: string;
  visualNotes: string;
  ffmpegTransition: string;
};

export type Scene = {
  id: string;
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
  transitionPlan?: TransitionPlan | null;
};

export type Render = {
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
};

export type CostSummary = {
  breakdown: Array<{ stage: string; totalCostUsd: number; eventCount: number }>;
  total: number;
  costPerFinishedMinute?: number;
};

export type CostAnalytics = {
  stage: string;
  _sum: { totalCostUsd: number };
  _count: { id: number };
  _avg: { totalCostUsd: number };
};

export type VoicePreset = {
  key: string;
  name: string;
  accent: string;
  voiceId?: string;
  gender?: string | null;
  age?: string | null;
  personality?: string | null;
  useCase?: string | null;
  category?: string;
  description?: string | null;
  previewUrl?: string | null;
};

export type CostEstimate = {
  frames: number;
  videos: number;
  motionEnrichment: number;
  validation: number;
  total: number;
  perScene?: number;
  sceneCount?: number;
  provider?: string;
  message?: string;
};

export type Character = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  prompt: string | null;
  gender: string;
  ageStyle: string;
  emotion: string;
  appearance: string;
  useInScenes: boolean;
  useAsNarrator: boolean;
  animateExpressions: boolean;
  transparentBg: boolean;
  costUsd: number;
  seed: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaptionSettings = {
  id: string;
  projectId: string;
  font: string;
  fontSize: number;
  textColor: string;
  textOpacity: number;
  bgColor: string;
  bgOpacity: number;
  position: "top" | "bottom";
  template: string;
  highlightKeywords: boolean;
  targetLanguage: string;
  burnInCaptions: boolean;
  createdAt: string;
  updatedAt: string;
};
