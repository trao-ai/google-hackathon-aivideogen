import type { StyleBible } from "@atlas/shared";
export type { StyleBible };

/**
 * Converts a StyleBible record into a compact summary string
 * that can be injected into LLM prompts.
 */
export function styleBibleToPromptSummary(bible: StyleBible): string {
  return `Channel visual language:
- ${bible.visualMission}
- Emotional tone: ${bible.emotionalTone}
- Narrative stance: ${bible.narrativeStance}

Art direction:
- Palette primary: ${bible.palette.primary.join(", ")}
- Palette accent: ${bible.palette.accent.join(", ")}
- Line weights: ${bible.lineWeights}
- Background density: ${bible.backgroundDensity}
- Shadow rules: ${bible.shadowRules}

Characters:
- Silhouette: ${bible.characterRules.silhouette}
- Proportions: ${bible.characterRules.proportions}
- Eyes: ${bible.characterRules.eyes}
- Hands: ${bible.characterRules.hands}
- Expression: ${bible.characterRules.expressionStyle}

Motion rules: ${bible.motionRules}
Text/bubble rules: ${bible.bubbleRules}

Negative prompts: ${bible.negativePrompts.join(", ")}`;
}

/**
 * Returns prompt primitives as a string prefix for image generation.
 */
export function getStylePrefix(bible: StyleBible): string {
  const prims = bible.promptPrimitives as Record<string, string>;
  return [
    prims["style_prefix"],
    prims["character_prefix"],
    prims["scene_suffix"],
  ]
    .filter(Boolean)
    .join(" ");
}

export function getPaletteString(
  bible: StyleBible,
  mode: "clean_light" | "dramatic_dark" = "clean_light",
): string {
  return (
    bible.palette.backgroundModes[mode].join(", ") +
    ", accents: " +
    bible.palette.accent.join(", ")
  );
}
