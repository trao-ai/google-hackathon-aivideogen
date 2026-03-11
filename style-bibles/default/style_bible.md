# Default Style Bible — Project Atlas

## Visual Identity

**Style**: Flat-design vector illustration. Clean, minimal, and educational.
No photorealism. No gradients unless explicitly in `palette.json`.
Bold 2px outlines. Bright, accessible colors.

## Palette

See `palette.json`. Summary:

- Background: `#F8F9FC` (light), `#0F172A` (dark)
- Primary: `#3B6EF8` (blue)
- Secondary: `#F97316` (orange)
- Accent: `#10B981` (green)
- Text: `#1A1A2E`

## Characters

See `character_rules.json`. Flat-vector style, expressive dot eyes, arc mouths.
Proportions slightly exaggerated (large head, round body). Friendly, approachable.

## Typography (in-frame)

- Font style: clean sans-serif (Nunito or similar)
- Keep text in frames to ≤ 12 words
- Bold important terms
- Left-aligned body text; centered for titles/callouts

## Scene Templates

Nine scene types (see `scene_templates.json`): hook, title_card, narration,
data_visualization, comparison, timeline, callout, bridge, cta.

Each has a layout, animation style, and suggested duration range.

## Motion Rules

See `motion_rules.json`.

- Easing: ease-in-out-cubic
- Transitions: cross-fade (0.5s)
- Camera: slow zoom or pan; never shaky
- Charts animate on-screen (draw-on, grow, step-reveal)

## Image Generation (Prompt Guidelines)

See `prompt_primitives.json` and `negative_prompts.json`.
Always start image prompts with the `stylePrefix` in `prompt_primitives.json`.
Always append negative prompts from `negative_prompts.json`.

## Speech Bubbles

See `speech_bubble_rules.json`.
Rounded rectangles, curved tails, 2px outline, white/light-blue backgrounds.

## Tone

Educational, curious, friendly. Avoid alarmist or clickbait visual framing.
The visuals should _illuminate_ the topic, not just decorate it.
Every frame should make the viewer understand something new.
