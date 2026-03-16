# Default Style Bible — Project Atlas

## Visual Identity

**Style**: Kurzgesagt-inspired flat vector illustration with Duolingo-style characters.
No photorealism. No outlines (shapes defined by color differences). No gradients.
Bold, vibrant colors on rich dark backgrounds. Layered compositions with depth.

## Palette

See `palette.json`. Summary:

- Dark backgrounds: `#1A1A2E`, `#16213E`, `#0F3460`
- Red accent: `#E94560`
- Yellow accent: `#FFB703`
- Green accent: `#53D769`
- Blue accent: `#00BBF9`
- Pink accent: `#F15BB5`
- Light backgrounds (when needed): `#F0F4FF`, `#E8ECFB`

## Characters

See `character_rules.json`. Duolingo-style friendly characters:
- Rounded, blob-like body shapes
- Large expressive dot eyes
- Simple mitten hands
- Large head, small body (2-head-height ratio)
- Flat solid colors, no outlines
- Warm, friendly expressions

## Typography (in-frame)

- **No text in generated images.** All text is added in post-production.
- Never include words, letters, numbers, labels, or writing in any scene.

## Scene Templates

Nine scene types (see `scene_templates.json`): hook, title_card, narration,
data_visualization, comparison, timeline, callout, bridge, cta.

Each has a layout, animation style, and suggested duration range.

## Motion Rules

See `motion_rules.json`.

- Easing: ease-in-out-cubic
- Transitions: cross-fade (0.5s)
- Camera: slow zoom or pan; never shaky
- Elements: smooth parallax, organic morphing, gentle floats
- Style: Kurzgesagt-like smooth, satisfying movements

## Image Generation (Prompt Guidelines)

See `prompt_primitives.json` and `negative_prompts.json`.
Always start image prompts with the Kurzgesagt-style prefix.
Always append negative prompts to enforce the flat vector style.

## Speech Bubbles

See `speech_bubble_rules.json`.
Rounded shapes with no text inside — visual indicator only.

## Tone

Educational, curious, warm, playful. Like Kurzgesagt meets Duolingo.
The visuals should _illuminate_ the topic with vibrant, engaging illustrations.
Every frame should make the viewer understand something new.
