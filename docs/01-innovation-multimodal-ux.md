# Innovation & Multimodal User Experience

> How Project Atlas breaks the "text box" paradigm — See, Hear, and Speak.

---

## 1. Project Overview

**Project Atlas** is an AI-native animated edutainment video production platform that transforms a single topic idea into a fully produced, broadcast-quality video — complete with AI-generated narration, character animation, sound design, and cinematic visuals. It orchestrates **7+ AI modalities** in a single coherent pipeline.

**The Problem It Solves:**
Creating educational/explainer videos today requires a team of researchers, scriptwriters, voice actors, illustrators, animators, sound designers, and video editors. A single 10-minute video can take weeks and cost thousands. Project Atlas collapses this entire pipeline into an AI-powered workflow that any individual can operate.

---

## 2. Breaking the "Text Box" Paradigm

### 2.1 Traditional AI Apps vs Project Atlas

| Traditional AI App          | Project Atlas                                         |
| --------------------------- | ----------------------------------------------------- |
| Text prompt → Text response | Topic → Full video with audio, visuals, and narration |
| Single modality (text)      | 7+ modalities orchestrated together                   |
| Turn-based interaction      | Live polling with real-time progress                  |
| Output is text to read      | Output is video to watch and hear                     |
| User writes prompts         | User selects, customizes, and composes                |

### 2.2 Seven Modalities in One Pipeline

```
┌──────────────────────────────────────────────────────────┐
│                    INPUT MODALITIES                       │
├──────────────────────────────────────────────────────────┤
│  1. TEXT       → Topic selection, script editing          │
│  2. VOICE      → AI narration with 20+ voice presets     │
│  3. SEARCH     → Brave Search + YouTube + Academic APIs   │
│  4. CHAT       → Conversational character design          │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                   OUTPUT MODALITIES                       │
├──────────────────────────────────────────────────────────┤
│  5. IMAGE      → AI frame generation (Gemini 3 Pro)      │
│  6. VIDEO      → AI video clips (Veo/Kling/SeDance)      │
│  7. AUDIO      → TTS narration + AI sound effects         │
│  8. MUSIC/SFX  → AI ambient soundscapes + transitions     │
│  9. SUBTITLES  → Auto-generated multilingual captions     │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                   COMPOSED OUTPUT                         │
├──────────────────────────────────────────────────────────┤
│  FINAL VIDEO = Clips + Voiceover + SFX + Captions        │
│  With crossfade transitions, sidechain ducking,          │
│  tempo adjustment, and subtitle burn-in                  │
└──────────────────────────────────────────────────────────┘
```

---

## 3. "See" — Visual Experience

### 3.1 AI Image Generation

- **Provider**: Google Gemini 3 Pro Image Preview
- Generates **start and end frames** for each scene
- Maintains **visual continuity** across scenes (previous scene's end frame becomes style reference for next scene's start frame)
- Anti-hallucination: Explicit "NO TEXT in images" rule enforced at prompt level
- Supports both 16:9 (YouTube) and 9:16 (TikTok/Reels) aspect ratios

### 3.2 AI Video Generation (5 Provider Options)

| Provider        | Platform   | Quality | Cost/sec |
| --------------- | ---------- | ------- | -------- |
| Google Veo 3.1  | Direct API | Highest | $0.40    |
| Kling O3        | fal.ai     | High    | $0.07    |
| SeDance 1.5 Pro | fal.ai     | High    | $0.052   |
| Replicate Veo   | Replicate  | High    | $0.10    |
| SeDance Lite    | Replicate  | Good    | $0.02    |

- Each scene generates a **5-15 second video clip** from start/end frame images
- Motion is directed by AI-enriched **motion notes** (Gemini analyzes scene purpose and writes camera direction)
- **Ken Burns fallback**: If AI video generation fails, automatically creates pan/zoom animation from still frames using FFmpeg — zero cost, guaranteed output

### 3.3 Character Generation

- AI-generated character portraits with customizable:
  - **Gender** (Male/Female)
  - **Age Style** (Young/Adult/Senior)
  - **Emotion** (Friendly/Professional/Energetic)
  - **Appearance** (Realistic/Illustration/3D Avatar/Cartoon)
- Characters appear consistently across all scenes via **canonical description injection**
- Chat-based generation interface (conversational, not form-based)

### 3.4 Visual Timeline Editor

- **Multi-track timeline** with scene clips, transitions, voice, and SFX tracks
- Drag-to-edit segments (reposition, trim, extend)
- Click-to-seek playback with frame-accurate navigation
- **CSS transition effects**: Fade, Cross Dissolve, Wipe, Slide
- Zoom controls (4 levels: 40-160 px/sec)
- RAF-based 60fps playback loop

### 3.5 Scene Flow Graph

- **ReactFlow-powered** node-based editor
- Visual representation of scene sequence
- Frame thumbnails, status badges, and video model selectors per scene
- Drag-and-drop scene reordering

---

## 4. "Hear" — Audio Experience

### 4.1 AI Voice Narration (ElevenLabs v3)

- **20+ AI voice presets** with gender, accent, and personality filters
- **Accent options**: US English, UK English, Indian English, Neutral
- **Tone-specific voice tuning**:
  - Energetic: stability=0.15, style=0.90 + `[excited, upbeat]` tags
  - Calm: stability=0.60, style=0.30 + `[calm, gentle]` tags
  - Motivational: stability=0.20, style=0.85 + `[inspiring, confident]` tags
  - Professional: stability=0.55, style=0.45 + `[measured, authoritative]` tags
- **Word-level timestamps** for precise subtitle synchronization
- **Audio preview** with waveform visualization, seek bar, play/pause controls

### 4.2 AI Sound Design

- **Ambient sounds**: 1 per scene, generated by ElevenLabs SFX from AI-designed descriptions
- **Transition effects**: Generated at scene boundaries (1 second each)
- **Audio mixing**:
  - Sidechain ducking: Background audio automatically lowers when narrator speaks
  - Voiceover + ducked bed + ambient + transitions = final mix
  - AAC 192kbps encoding

### 4.3 Script-Level Prosody Control

The script architect embeds **ElevenLabs v3 audio tags** directly into narration text:

```
"[excited] And here's where it gets REALLY interesting..."
"[calm, gentle] But first... let's take a step back—"
```

Combined with strategic use of:

- `—` (em dash) for dramatic pauses
- `CAPS` for emphasis
- `...` for trailing suspense

---

## 5. "Speak" — Conversational Interaction

### 5.1 Chat-Based Character Design

- Left panel: Natural language chat for describing characters
- Center panel: Live image preview (polls every 2 seconds)
- Right panel: Saved characters gallery
- Chat history persists in localStorage across sessions

### 5.2 AI Research Assistant

- Automated **multi-source research** pipeline:
  - OpenAlex (academic papers)
  - Semantic Scholar (scientific literature)
  - Wikipedia (general knowledge)
  - CrossRef (scholarly citations)
  - Brave Search (web results)
  - Reddit + HackerNews (community signals)
  - Google Trends (trending topics)
  - YouTube Data API (channel analysis)
- Results synthesized by Gemini with **confidence scores** and **source attribution**

### 5.3 Topic Discovery Agent

- AI-powered topic scout that analyzes internet signals
- Scores topics on 7 dimensions:
  - Search Momentum (25%), Edutainment Fit (20%), Visual Storytelling (15%)
  - Curiosity Gap (15%), Evergreen Potential (10%), Fact Density (10%), Production Feasibility (5%)
- Returns 10 candidates with explanations of "why it may work"

---

## 6. Live & Context-Aware Experience

### 6.1 Real-Time Progress Tracking

- **8-second polling** on project detail (React Query)
- **10-second polling** on project list
- Live progress bars for:
  - Frame generation (X/Y scenes completed)
  - Video generation (X/Y clips rendered)
  - Render composition (step labels)
  - Character image generation (2-second poll intervals)

### 6.2 Contextual Pipeline Navigation

- **23 project states** tracked (from `draft` to `complete`)
- Auto-navigation: UI automatically jumps to the current active step
- Step-based wizard: Topic → Research → Character → Script → Voice → Scenes → Captions → Cost → Export
- Context-aware footer buttons change based on current step and project state

### 6.3 Platform-Aware Generation

- Adapts entire pipeline based on target platform:
  - **YouTube**: 16:9, 3-12 minute, professional/broad tone
  - **TikTok/Reels**: 9:16, 30-60 second, fast-paced/energetic
  - **Instagram**: 9:16, short-form with visual emphasis
- Aspect ratio propagates through frames, videos, and final render

---

## 7. Distinct Persona & Voice

### 7.1 Kurzgesagt-Inspired Visual Identity

The system has a **strong visual persona** inspired by educational animation:

- Rich cinematic illustration with vibrant color palettes
- Sophisticated simplified characters with **expressive round eyes, no mouths**
- Expression through eyes + body language only (mouth movement explicitly forbidden)
- Glowing highlights, particle effects, layered parallax depth
- Smooth rounded shapes with subtle gradients

### 7.2 Narrative Persona

Scripts follow a distinctive voice pattern:

- **Hook in 20 seconds**: Every video opens with a startling claim or question
- **Curiosity gaps**: Promises to reveal something compelling
- **Escalating tension**: Stakes deepen progressively
- **No fluff**: "Write for voice, not reading" — conversational, not academic
- 5 tone options: dramatic, curious, urgent, optimistic, dark_edutainment

### 7.3 Video Types

- Explainer, Deep Dive, Documentary, Educational, News Analysis, Comparison, Tutorial, Listicle, Theory, Behind the Scenes

---

## 8. What Makes This Innovative

1. **End-to-End Multimodal Pipeline**: No other tool orchestrates research → script → voice → image → video → SFX → composition in a single workflow
2. **AI Sound Design**: The system designs ambient soundscapes and transition effects using natural language descriptions, then generates them with AI
3. **Character Consistency System**: Canonical character descriptions are injected into every scene prompt, ensuring visual consistency across an entire video
4. **Motion Enrichment**: Before generating video, Gemini analyzes each scene's purpose and writes detailed camera direction (zoom patterns, reveal timing, movement arcs)
5. **Graceful Degradation**: Ken Burns fallback ensures video output even when AI video generation fails — the system always produces a result
6. **Sidechain Ducking**: Professional audio mixing technique (background audio automatically lowers during narration) applied automatically
7. **Cross-Scene Visual Continuity**: Each scene's end frame is used as a style reference for the next scene's start frame, creating visual flow
8. **Word-Level Subtitle Sync**: TTS timestamps enable frame-accurate subtitle positioning, not approximated
