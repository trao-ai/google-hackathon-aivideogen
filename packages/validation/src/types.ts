export interface FrameValidationResult {
  qualityScore: number; // 0-100
  styleMatchScore: number; // 0-100
  issues: string[];
  recommendations: string[];
}

export interface CharacterProfile {
  id: string;
  description: string;
  keyFeatures: string[];
  sceneIds: string[];
}

export interface CharacterConsistencyResult {
  consistent: boolean;
  consistencyScore: number; // 0-100
  issues: string[];
}
