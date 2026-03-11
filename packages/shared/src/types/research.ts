export interface SourceRef {
  url: string;
  title?: string;
  publishedAt?: string;
  credibilityScore?: number;
}

export interface Claim {
  claim: string;
  sources: string[];
  confidence: number;
  flagged?: boolean;
  flagReason?: string;
}

export interface ResearchBrief {
  id: string;
  projectId: string;
  topicId: string;
  summary: string;
  background?: string;
  currentDevelopments?: string;
  surprisingFacts: string[];
  controversies?: string;
  stakes?: string;
  timeline?: string[];
  keyFacts: string[];
  storyAngles: string[];
  claims: Claim[];
  sources: SourceRef[];
  confidenceScore: number;
  createdAt: string;
}
