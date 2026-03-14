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

  const allNegatives = [
    "text",
    "words",
    "letters",
    "numbers",
    "watermark",
    "caption",
    "subtitle",
    "label",
    "title",
    "writing",
    "typography",
    ...negativePrompts,
  ];

  return `${stylePrimitives}

Scene purpose: ${purpose}
Narration excerpt: "${narrationExcerpt}"
Scene type: ${sceneType}
${visualMetaphor ? `Visual metaphor: ${visualMetaphor}` : ""}
${characterNotes ? `Characters: ${characterNotes}` : ""}
Background density: medium
IMPORTANT: Do NOT include any text, words, letters, numbers, labels, captions, or writing anywhere in the image. The image must be purely visual with zero text.
${bubbleText ? `Speech bubble visual indicator (no actual text): show an empty speech bubble shape` : "Speech bubble: none"}
Palette: ${palette}
Negative prompts: ${allNegatives.join(", ")}

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

/**
 * Build a rich video generation prompt for the configured video provider.
 * Combines scene context, start/end frame descriptions, and motion notes
 * so the model understands what to animate and where the animation should end.
 */
export function buildVideoPrompt(params: {
  purpose: string;
  sceneType: string;
  motionNotes: string;
  startFramePrompt: string;
  endFramePrompt: string;
  durationSec?: number;
  nextSceneStartPrompt?: string;
}): string {
  const {
    purpose,
    sceneType,
    motionNotes,
    startFramePrompt,
    endFramePrompt,
    durationSec = 5,
    nextSceneStartPrompt,
  } = params;

  // Extract the visual description parts from frame prompts (strip meta-instructions)
  const startVisual = extractVisualDescription(startFramePrompt);
  const endVisual = extractVisualDescription(endFramePrompt);

  return `Animate a ${sceneType} scene for an educational explainer video.

IMPORTANT — MOUTH RULE: Characters must NEVER open their mouths, talk, speak, or move their lips. Mouths stay CLOSED at all times. There is no dialogue — narration is a separate voiceover. Eye movement, blinking, and expressions are fine, but mouths must remain shut.

Scene purpose: ${purpose}

STARTING STATE (first frame — provided as image):
${startVisual}

ENDING STATE (the animation MUST reach this state by the final frame):
${endVisual}

Pay close attention to:
- Character positions, poses, and expressions described in the ending state
- Object placements and transformations
- Camera angle and framing
- Color palette and lighting
- Any visual metaphors or symbolic elements
The ending state is not optional — it defines where this scene connects to the next scene.
${nextSceneStartPrompt ? `
NEXT SCENE CONTEXT (where this animation must lead):
The scene immediately after this one begins with: "${extractVisualDescription(nextSceneStartPrompt).slice(0, 300)}"
Ensure the final frames of this animation create a natural visual bridge to this next state.
` : ""}
MOTION AND TRANSITION:
${motionNotes}

The animation must dynamically progress from the starting state to the ending state across ${durationSec} seconds with ENERGETIC, engaging pacing. Keep things moving — no static or lingering moments.

Style: Kurzgesagt-style cinematic illustration, richly detailed with atmospheric depth, dynamic animation with punchy movements, vibrant colorful palette.
The animation should look like a professional Kurzgesagt YouTube video — polished, cinematic, engaging, and visually exciting.
Camera: purposeful and dynamic. Smooth but energetic zooms, pans, and reveals. No shaky cam.
CRITICAL: Absolutely ZERO text, words, letters, numbers, labels, captions, subtitles, titles, watermarks, writing, or typography anywhere in the video. The video must be purely visual.
Reminder: mouths stay CLOSED at all times. No talking, speaking, or lip movement animation.`.trim();
}

/** Extract visual description from a frame prompt, skipping only meta-instructions. */
function extractVisualDescription(framePrompt: string): string {
  const lines = framePrompt.split("\n");
  // Skip meta-instruction lines — keep everything else (visual descriptions, style, characters)
  const skipPrefixes = [
    "Generate START FRAME",
    "Generate END FRAME",
    "IMPORTANT: Do NOT",
    "Negative prompts:",
    "Palette:",
    "Background density:",
    "Speech bubble:",
  ];
  const relevant = lines.filter(
    (l) => l.trim().length > 0 && !skipPrefixes.some((p) => l.trim().startsWith(p)),
  );
  const joined = relevant.join("\n");
  return joined.length > 600 ? joined.slice(0, 600) : joined;
}
