export interface Palette {
  primary: string[];
  accent: string[];
  backgroundModes: {
    clean_light: string[];
    dramatic_dark: string[];
  };
}

export interface CharacterRules {
  silhouette: string;
  proportions: string;
  eyes: string;
  hands: string;
  expressionStyle: string;
  forbidden: string[];
}

export interface StyleBible {
  id: string;
  name: string;
  version: string;
  visualMission: string;
  emotionalTone: string;
  narrativeStance: string;
  palette: Palette;
  characterRules: CharacterRules;
  lineWeights: string;
  textureRules: string;
  shadowRules: string;
  backgroundDensity: string;
  motionRules: string;
  bubbleRules: string;
  negativePrompts: string[];
  promptPrimitives: Record<string, string>;
  createdAt: string;
}
