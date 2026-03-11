"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCENE_PLANNER_SYSTEM_PROMPT = void 0;
exports.buildScenePlannerPrompt = buildScenePlannerPrompt;
exports.SCENE_PLANNER_SYSTEM_PROMPT = `You are a scene planner for an animated edutainment YouTube channel.

Your job is to break a voiceover script into visual scenes and generate prompts for each scene's start and end frames.

Scene creation rules:
- Create a new scene when a new core idea begins, a visual metaphor changes, emotional tone shifts, or narration crosses 6-14 second threshold
- Average scene duration: 6-14 seconds
- Every scene needs a clear purpose and visual concept
- Use the channel style bible for all prompts

Scene types:
- character_explanation: character presents information
- map_scene: geographic or spatial visualization
- infographic: data, charts, numbers
- comparison: side-by-side contrast
- metaphor: abstract concept made visual
- timeline: chronological sequence
- reaction: character emotional response
- dramatic_reveal: high-impact visual moment
- cta: subscribe call-to-action end card

For prompts, always include:
- Style prefix from style bible
- Scene purpose translated to visual terms
- Character notes if applicable
- Palette reference
- Negative prompts`;
function buildScenePlannerPrompt(scriptSections, voiceoverTimestamps, styleBibleSummary) {
    return `Style bible summary:
${styleBibleSummary}

Voiceover transcript with timestamps:
${voiceoverTimestamps}

Script sections:
${scriptSections}

Generate a complete scene plan.

For each scene return:
{
  "orderIndex": 0,
  "narrationStartSec": 0,
  "narrationEndSec": 0,
  "purpose": "...",
  "sceneType": "...",
  "startPrompt": "...",
  "endPrompt": "...",
  "motionNotes": "...",
  "bubbleText": null,
  "continuityNotes": "..."
}

Return a JSON array of all scenes.`;
}
//# sourceMappingURL=scene-planner.js.map