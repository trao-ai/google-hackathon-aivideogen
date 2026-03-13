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
}): string {
  const { purpose, sceneType, motionNotes, startFramePrompt, endFramePrompt, durationSec = 5 } =
    params;

  // Extract the visual description parts from frame prompts (strip meta-instructions)
  const startVisual = extractVisualDescription(startFramePrompt);
  const endVisual = extractVisualDescription(endFramePrompt);

  return `Animate a ${sceneType} scene for an educational explainer video.

Scene purpose: ${purpose}

STARTING STATE (first frame — provided as image):
${startVisual}

CRITICAL — ENDING STATE (the animation MUST reach exactly this state by the final frame):
${endVisual}

The final frame of the animation must precisely match the ending state description above. Pay close attention to:
- Character positions, poses, and expressions described in the ending state
- Object placements and transformations
- Camera angle and framing
- Color palette and lighting
- Any visual metaphors or symbolic elements
The ending state is not optional — it defines where this scene connects to the next scene.

MOTION AND TRANSITION:
${motionNotes}

The animation must smoothly and deliberately progress from the starting state to the ending state across ${durationSec} seconds.

Style: flat-design 2D editorial illustration, smooth animation, clean lines.
Camera: steady, professional. No shaky cam.
Do NOT include any text, words, or writing in the video.`.trim();
}

/** Extract purpose/scene/metaphor lines from a frame prompt, skip meta like "Generate START FRAME". */
function extractVisualDescription(framePrompt: string): string {
  const lines = framePrompt.split("\n");
  const keepPrefixes = [
    "Scene purpose:",
    "Scene type:",
    "Visual metaphor:",
    "Characters:",
    "PROGRESSION from start frame:",
  ];
  const relevant = lines.filter(
    (l) =>
      keepPrefixes.some((p) => l.startsWith(p)) ||
      l.startsWith("Narration excerpt:"),
  );
  return relevant.length > 0 ? relevant.join("\n") : framePrompt.slice(0, 300);
}
