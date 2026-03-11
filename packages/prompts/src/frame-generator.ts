export function buildStartFramePrompt(params: {
  purpose: string;
  narrationExcerpt: string;
  sceneType: string;
  visualMetaphor?: string;
  characterNotes?: string;
  bubbleText?: string;
  palette: string;
  negativePrompts: string[];
  stylePrimitives: string;
}): string {
  const {
    purpose,
    narrationExcerpt,
    sceneType,
    visualMetaphor,
    characterNotes,
    bubbleText,
    palette,
    negativePrompts,
    stylePrimitives,
  } = params;

  return `${stylePrimitives}

Scene purpose: ${purpose}
Narration excerpt: "${narrationExcerpt}"
Scene type: ${sceneType}
${visualMetaphor ? `Visual metaphor: ${visualMetaphor}` : ""}
${characterNotes ? `Characters: ${characterNotes}` : ""}
Background density: medium
Text on screen: minimal
${bubbleText ? `Speech bubble: "${bubbleText}"` : "Speech bubble: none"}
Palette: ${palette}
Negative prompts: ${negativePrompts.join(", ")}

Generate START FRAME only.`.trim();
}

export function buildEndFramePrompt(
  startFramePrompt: string,
  progressionNotes: string,
): string {
  return `${startFramePrompt}

PROGRESSION from start frame: ${progressionNotes}

Generate END FRAME showing the scene's visual conclusion.`;
}
