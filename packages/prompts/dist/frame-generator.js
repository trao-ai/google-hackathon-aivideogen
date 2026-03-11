"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStartFramePrompt = buildStartFramePrompt;
exports.buildEndFramePrompt = buildEndFramePrompt;
function buildStartFramePrompt(params) {
    const { purpose, narrationExcerpt, sceneType, visualMetaphor, characterNotes, bubbleText, palette, negativePrompts, stylePrimitives, } = params;
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
function buildEndFramePrompt(startFramePrompt, progressionNotes) {
    return `${startFramePrompt}

PROGRESSION from start frame: ${progressionNotes}

Generate END FRAME showing the scene's visual conclusion.`;
}
//# sourceMappingURL=frame-generator.js.map