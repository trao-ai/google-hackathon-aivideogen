export interface VoiceoverSegment {
  text: string;
  start: number;
  end: number;
}

export interface Voiceover {
  id: string;
  projectId: string;
  scriptId: string;
  vendor: string;
  voiceId: string;
  audioUrl: string;
  durationSec: number;
  segments: VoiceoverSegment[];
  subtitleUrl?: string;
  costUsd: number;
  createdAt: string;
}
