# Technical Implementation & Agent Architecture

> Google GenAI SDK/ADK usage, cloud hosting, agent logic, error handling, and grounding.

---

## 1. Google GenAI SDK & ADK Usage

### 1.1 Google ADK (Agent Development Kit) — Core Agent Framework

**Package**: `@google/adk` v0.4.0 (in `@atlas/integrations`)

Project Atlas uses Google ADK as its **primary agent execution framework**. All LLM-powered stages run through ADK's `LlmAgent` + `InMemoryRunner`:

```typescript
// packages/integrations/src/llm/adk-runner.ts
import { LlmAgent, InMemoryRunner } from "@google/adk";

async function runAgent({
  agentName: string,
  instruction: string,      // System prompt (grounding rules)
  userMessage: string,       // User input (research data, script, etc.)
  model?: string,            // "gemini-2.5-flash" or "gemini-3.1-pro-preview"
  tools?: FunctionTool[],    // Optional tool use
  generationConfig?: { maxOutputTokens?, temperature? }
}): Promise<ADKRunResult>
```

**ADK Agent Stages** (8 distinct agents):

| Agent | Model | Purpose | Input | Output |
|-------|-------|---------|-------|--------|
| **Topic Scout** | gemini-2.5-flash | Generate 10 topic candidates | Niche + platform + video type | Scored topics JSON |
| **Research Synthesizer** | gemini-2.5-flash | Synthesize research brief | Search results + topic | Structured brief with claims |
| **Script Architect** | gemini-3.1-pro-preview | Write video script | Research brief + style rules | 9-part script with sections |
| **Script Rewriter** | gemini-2.5-flash | Rewrite single section | Original section + feedback | Updated section |
| **Scene Planner** | gemini-3.1-pro-preview | Plan visual scenes | Script + voiceover timestamps | Scene array with prompts |
| **Motion Director** | gemini-2.5-flash | Enrich motion notes | Scene context + basic notes | Detailed camera direction |
| **Audio Designer** | gemini-2.5-flash | Design soundscapes | Scene descriptions | Ambient + transition SFX specs |
| **Character Describer** | gemini-2.5-flash | Create canonical descriptions | Character attributes | Descriptive paragraph |

**Token Tracking**: ADK captures `promptTokenCount` + `candidatesTokenCount` from all events. Fallback estimation (length/4) when metadata unavailable.

### 1.2 Google GenAI SDK — Direct API Usage

**Package**: `@google/genai` v1.45.0

Used for tasks requiring direct API control beyond ADK:

#### A. Video Generation (Veo 3.1)
```typescript
// packages/integrations/src/video/veo.ts
// Direct HTTP to generativelanguage.googleapis.com/v1beta
// Endpoint: models/veo-3.1-generate-preview:predictLongRunning
// Features:
//   - Start frame + optional end frame (base64)
//   - Aspect ratio control (16:9, 9:16)
//   - 720p resolution
//   - 10-second polling, 60 attempts max (10-min timeout)
//   - Fallback: start+end → start-only if rejected
```

#### B. Image Generation (Gemini 3 Pro Image)
```typescript
// packages/integrations/src/image/gemini.ts
// Direct HTTP to generativelanguage.googleapis.com/v1beta
// Model: gemini-3-pro-image-preview
// Features:
//   - responseModalities: ["IMAGE"], imageSize: "1K"
//   - Style reference image injection
//   - Seed-based reproducibility
//   - Rate limit handling (429 → exponential backoff, max 5 retries)
//   - Safety filter handling (blocked content detection)
```

#### C. Frame Validation (Gemini Vision)
```typescript
// Gemini evaluates generated frames for:
//   - Quality score (composition, detail, consistency)
//   - Style match score (compared to reference)
//   - ~500 input + 200 output tokens per validation
```

---

## 2. Agent Architecture — Multi-Stage Pipeline

### 2.1 Pipeline Overview

```
                    ┌─────────────────────────────────────┐
                    │       USER INPUT                     │
                    │  Topic idea + Platform + Video Type  │
                    └─────────────┬───────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────┐
                    │  STAGE 1: TOPIC DISCOVERY            │
                    │  Agent: Topic Scout (ADK)            │
                    │  Model: gemini-2.5-flash             │
                    │  Input: Niche + internet signals     │
                    │  Output: 10 scored topic candidates  │
                    │  Grounding: 7-dimension scoring      │
                    └─────────────┬───────────────────────┘
                                  │ User selects 1 topic
                    ┌─────────────▼───────────────────────┐
                    │  STAGE 2: DEEP RESEARCH              │
                    │  Agent: Research Synthesizer (ADK)    │
                    │  Model: gemini-2.5-flash             │
                    │  Sources: OpenAlex, Semantic Scholar, │
                    │    Wikipedia, CrossRef, Brave Search, │
                    │    Reddit, HackerNews, Google Trends  │
                    │  Output: Brief with confidence scores │
                    │  Grounding: Source attribution + flags │
                    └─────────────┬───────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────┐
                    │  STAGE 3: SCRIPT GENERATION          │
                    │  Agent: Script Architect (ADK)        │
                    │  Model: gemini-3.1-pro-preview       │
                    │  Input: Research brief + style rules  │
                    │  Output: 9-part script with sections  │
                    │  Grounding: Duration targets, source  │
                    │    refs, quality scoring (8 dims)     │
                    └─────────────┬───────────────────────┘
                                  │ User approves/edits
                    ┌─────────────▼───────────────────────┐
                    │  STAGE 4: VOICE GENERATION           │
                    │  Provider: ElevenLabs v3             │
                    │  Input: Script + voice + tone         │
                    │  Output: MP3 + word-level timestamps  │
                    │  Features: Audio tags, prosody marks  │
                    └─────────────┬───────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────┐
                    │  STAGE 5: SCENE PLANNING             │
                    │  Agent: Scene Planner (ADK)           │
                    │  Model: gemini-3.1-pro-preview       │
                    │  Input: Script + voiceover timeline   │
                    │  Output: Scenes with frame prompts    │
                    │  Grounding: 5-14s constraint, char    │
                    │    consistency, visual continuity     │
                    └─────────────┬───────────────────────┘
                                  │
              ┌───────────────────┼───────────────────────┐
              │                   │                       │
   ┌──────────▼──────────┐  ┌────▼────────────┐  ┌──────▼──────────┐
   │  STAGE 6A: FRAMES   │  │  CHARACTER GEN  │  │  MOTION ENRICH  │
   │  Gemini 3 Pro Image │  │  Gemini Image   │  │  gemini-2.5-flash│
   │  Start + End frames │  │  Portrait gen   │  │  Camera direction│
   │  Style references   │  │  Canon. desc    │  │  8s animation    │
   └──────────┬──────────┘  └─────────────────┘  └──────┬──────────┘
              │                                          │
              └────────────────┬─────────────────────────┘
                               │
                    ┌──────────▼──────────────────────────┐
                    │  STAGE 7: VIDEO GENERATION           │
                    │  Provider: Veo/Kling/SeDance/Replic. │
                    │  Input: Frames + enriched motion      │
                    │  Output: 5-15s video clips per scene  │
                    │  Fallback: Ken Burns (FFmpeg)          │
                    └──────────┬──────────────────────────┘
                               │
                    ┌──────────▼──────────────────────────┐
                    │  STAGE 8: COMPOSITION (RENDER)       │
                    │  Tool: FFmpeg                         │
                    │  Sub-agents:                          │
                    │    - Audio Designer (ADK) → SFX specs │
                    │    - ElevenLabs SFX → sound gen       │
                    │  Pipeline:                            │
                    │    1. Speed-adjust clips to narration │
                    │    2. Crossfade transitions (xfade)   │
                    │    3. Generate ambient + transition SFX│
                    │    4. Sidechain ducking (voice > bed) │
                    │    5. Mix all audio tracks            │
                    │    6. Burn in ASS subtitles           │
                    │    7. H.264 MP4, CRF 18, 24fps       │
                    └──────────┬──────────────────────────┘
                               │
                    ┌──────────▼──────────────────────────┐
                    │  STAGE 9: EXPORT                     │
                    │  Formats: MP4, MOV, WebM             │
                    │  Resolutions: 720p, 1080p, 4K        │
                    │  Quality: Standard, High, Ultra      │
                    └─────────────────────────────────────┘
```

### 2.2 Worker Concurrency Design

| Worker | Concurrency | Reason |
|--------|-------------|--------|
| Frame Generation | **1** | Sequential dependency — Scene N's end frame is style reference for Scene N+1's start frame |
| Video Generation | **2** | Independent per-scene, but limited by API rate limits |
| Render/Compose | **1** | CPU-intensive FFmpeg operation |
| Character Generation | **1** | Single image per request |
| All others | Default | Standard BullMQ concurrency |

### 2.3 Job Queue Architecture (BullMQ + Redis)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Express API │────▶│    Redis      │◀────│  BullMQ Workers  │
│  (Producer)  │     │  (Job Queue)  │     │  (Consumers)     │
└──────────────┘     └──────────────┘     └──────────────────┘

Queues:
├── topic-discovery      → TopicDiscoveryWorker
├── channel-analysis     → ChannelAnalysisWorker
├── scene-planning       → ScenePlannerWorker
├── frame-generation     → FrameGenerationWorker
├── video-generation     → VideoGenerationWorker
├── caption              → CaptionWorker
├── character-generation → CharacterGenerationWorker
├── render               → RenderWorker
├── export               → ExportWorker
└── transition-planning  → TransitionPlanningWorker
```

---

## 3. Backend Architecture — Google Cloud Hosted

### 3.1 Infrastructure Stack

```
┌─────────────────────────────────────────────────────┐
│                    NGINX (SSL)                       │
│              video.trao.ai (HTTPS)                   │
│         Let's Encrypt certificates                   │
│    ┌────────────────┬────────────────────┐           │
│    │  /api/*        │  /*                │           │
│    │  → Express API │  → Next.js (SSR)   │           │
│    │  Port 3001     │  Port 3000         │           │
│    └───────┬────────┴────────┬───────────┘           │
└────────────┼────────────────┼────────────────────────┘
             │                │
┌────────────▼────────┐ ┌────▼────────────────────────┐
│   Express API       │ │   Next.js Frontend           │
│   @atlas/api        │ │   @atlas/web                 │
│   ┌───────────────┐ │ │   App Router (SSR/CSR)       │
│   │ Auth (better) │ │ │   React Query (8s polling)   │
│   │ Routes (14)   │ │ │   Zustand state              │
│   │ Rate Limit    │ │ │   Tailwind CSS               │
│   │ Helmet        │ │ └──────────────────────────────┘
│   │ Zod Validate  │ │
│   └───────┬───────┘ │
└───────────┼─────────┘
            │
    ┌───────▼───────────────────────────────────────┐
    │              BullMQ Workers                    │
    │              @atlas/workers                    │
    │   12 workers processing AI generation jobs    │
    │   FFmpeg for video composition                │
    └───────┬──────────────────┬────────────────────┘
            │                  │
   ┌────────▼──────┐  ┌───────▼──────┐
   │  PostgreSQL   │  │    Redis     │
   │  (Prisma ORM) │  │  (BullMQ)   │
   │  16+ tables   │  │  Job Queue  │
   └───────────────┘  └──────────────┘
```

### 3.2 Docker Production Deployment

**Multi-stage Dockerfile** with 5 build targets:
1. `base` — Install all monorepo dependencies
2. `build` — Compile all TypeScript packages
3. `api` — Express API runtime (Node.js 20 Alpine)
4. `workers` — BullMQ workers runtime (includes FFmpeg)
5. `web` — Next.js standalone output

**Docker Compose Production** (`docker-compose.prod.yml`):
- 7 services: postgres, redis, api, workers, web, nginx, migrate
- Automatic Prisma migrations on startup
- SSL termination via Nginx + Let's Encrypt
- Domain: `video.trao.ai`

### 3.3 Nginx Configuration
- HTTP → HTTPS redirect (301)
- SSL with Let's Encrypt certificates at `/etc/letsencrypt/`
- Proxy timeouts: 300s send/read (accommodates long video generation)
- Client max body: 50MB (for media uploads)
- WebSocket support for Next.js HMR (`/_next/webpack-hmr`)

---

## 4. Error Handling & Graceful Degradation

### 4.1 API-Level Error Handling

```typescript
// Custom ApiError class with HTTP status codes
class ApiError extends Error {
  constructor(public statusCode: number, message: string) { ... }
}

// Global error handler middleware
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) → { status: err.statusCode, message: err.message }
  else → { status: 500, message: "Internal server error" } + console.error(err)
}

// Request validation with Zod
const schema = z.object({ ... });
const parsed = schema.safeParse(req.body);
if (!parsed.success) throw new ApiError(400, "Invalid request");
```

### 4.2 State Validation Guards

```typescript
// Every stage validates prerequisites before proceeding
if (!project.selectedTopicId) throw new ApiError(400, "No approved topic");
if (!project.selectedScriptId) throw new ApiError(400, "No script selected");
if (!voiceover?.audioUrl) throw new ApiError(400, "No voiceover found");
if (scenes.length === 0) throw new ApiError(400, "No scenes planned");
```

### 4.3 AI Provider Fallbacks

| Failure Point | Fallback Strategy |
|---|---|
| Video generation fails | Ken Burns effect (pan/zoom on still frames via FFmpeg) — $0 cost |
| Veo rejects end frame | Retry with start-frame-only mode |
| Frame generation fails | Continue without quality scores (non-blocking) |
| SFX generation fails | Use generic fallback: "gentle soft whoosh" |
| Both SFX attempts fail | Skip SFX (clean cut, no transition sound) |
| Font download fails | Try GitHub variable font → fallback to Arial system font |
| LLM returns invalid JSON | Fallback to plain text parsing or one-scene-per-section default |
| Scene gaps in timeline | Auto-extend previous scene to close gap |
| Scene doesn't start at 0 | Force reset to 0s |
| ElevenLabs voices API down | Return hardcoded voice presets (Adam, Daniel, George, etc.) |
| GEMINI_API_KEY not set | Skip motion enrichment, return original notes |
| Rate limit (429) | Exponential backoff, max 5 retries (image generation) |

### 4.4 Worker-Level Error Handling

```typescript
// All workers follow this pattern:
worker.on("failed", async (job, err) => {
  // Update database status to failed
  await prisma.project.update({
    where: { id: job.data.projectId },
    data: { status: "frame_failed" | "animation_failed" | ... }
  });
  console.error(`[WorkerName] Job ${job.id} failed:`, err.message);
});
```

### 4.5 Duration Validation

```typescript
// Video clips validated against expected duration
// ±10% variance allowed
const expectedDuration = clipTargetDurationSec;
const actualDuration = await ffprobeDuration(videoPath);
if (Math.abs(actualDuration - expectedDuration) / expectedDuration > 0.1) {
  console.warn("Duration variance exceeds 10%");
}
```

---

## 5. Anti-Hallucination & Grounding Techniques

### 5.1 Research Grounding (Stage 2)

| Technique | Implementation |
|---|---|
| **Source Attribution** | Every claim linked to source URL + title + publish date |
| **Confidence Scoring** | 0-1 confidence per claim (model self-evaluates) |
| **Claim Flagging** | Risky or unsupported claims automatically flagged |
| **Multi-Source Validation** | 8 data sources cross-referenced (academic + web + community) |
| **Multiple Story Angles** | 3-5 narrative framings prevent single-narrative bias |
| **Timeline Grounding** | Chronological event reconstruction prevents anachronisms |

### 5.2 Script Grounding (Stage 3)

| Technique | Implementation |
|---|---|
| **Source References** | Script sections include `sourceRefs` linking to research |
| **Duration Constraints** | ~150 words = 60 seconds (enforced per section) |
| **Quality Scoring** | 8-dimension score: hookStrength, clarity, novelty, escalation, factSupport, visualizability, ctaQuality, overall |
| **Structured Output** | Enforced 9-part narrative structure prevents wandering |
| **Tone Enforcement** | Explicit tone (dramatic/curious/urgent) prevents inconsistency |

### 5.3 Visual Grounding (Stages 5-7)

| Technique | Implementation |
|---|---|
| **Character Consistency** | Exact canonical description repeated in EVERY scene prompt |
| **Visual Continuity** | Scene N endPrompt must bridge to Scene N+1 startPrompt |
| **Anti-Text Rule** | "NEVER include text, words, labels, writing" in all image/video prompts |
| **No-Mouth Rule** | "Characters must NEVER open mouths, talk, speak, or move lips" |
| **Duration Constraints** | Hard 5-14 second per scene (prevents pacing drift) |
| **Negative Prompts** | Explicit list of forbidden elements per frame |
| **Style References** | Previous scene's end frame used as style reference for next scene |
| **Seed Reproducibility** | Deterministic seeds from prompt hash for consistent regeneration |
| **Continuity Anti-Patterns** | Explicit "NOT" rules (no random color changes, no unmotivated camera shifts) |
| **Timeline Alignment** | Scenes must correspond to script at their timestamp |

### 5.4 Audio Grounding

| Technique | Implementation |
|---|---|
| **Word-Level Timestamps** | ElevenLabs returns character-level alignment, converted to word-level |
| **Narration-Scene Sync** | Subtitle timing derived from actual TTS timestamps, not estimated |
| **Prosody Markers** | ElevenLabs v3 audio tags embedded in script for emotional accuracy |

---

## 6. Cost Tracking & Financial Grounding

### 6.1 Comprehensive Cost Tracking

Every AI API call is tracked with:
```typescript
CostEvent {
  projectId,
  stage,           // 17 possible stages
  vendor,          // gemini, elevenlabs, fal-ai, replicate, google
  model,           // specific model ID
  units,           // tokens, characters, seconds, or count
  unitCost,        // calculated from pricing table
  totalCostUsd,    // units × unitCost
  metadata,        // stage-specific details
  createdAt
}
```

### 6.2 Centralized Pricing (Single Source of Truth)

All pricing defined in `packages/shared/src/pricing.ts`:
- **LLM**: Per 1K tokens (input/output separately)
- **TTS**: Per character
- **Image**: Per image
- **Video**: Per second (7 provider-specific rates)
- **SFX**: Per generation

### 6.3 Cost Estimation Engine

Pre-generation cost estimates available via `CostEstimator`:
```typescript
estimateScenes(scenes, provider) → {
  frames,            // 2 per scene × $0.04
  videos,            // duration × per-second rate
  motionEnrichment,  // LLM tokens
  validation,        // Gemini vision tokens
  tts,               // estimated characters
  sfx,               // 1 ambient + 0.3 transitions per scene
  total,
  perScene           // average cost per scene
}
```

---

## 7. Database Architecture (Prisma + PostgreSQL)

### 7.1 Core Data Model

```
User ──┬── Project ──┬── Topic (1:many)
       │             ├── ResearchBrief (1:many)
       │             ├── Script ──── ScriptSection (1:many)
       │             ├── Voiceover (1:many)
       │             ├── Scene ──┬── SceneFrame (1:many: start, end)
       │             │           └── SceneClip (1:1)
       │             ├── Character (1:many)
       │             ├── CaptionSettings (1:1)
       │             ├── Render ──── ExportVariant (1:many)
       │             ├── CostEvent (1:many)
       │             └── ChannelProfile (1:many)
       │
       ├── Session
       ├── Account
       └── Verification
```

### 7.2 Key Design Decisions
- **Atomic cost tracking**: `CostEvent` creation + `Project.totalCostUsd` increment in single transaction
- **Status fields on resources**: Enables progress tracking without polling workers
- **UUID primary keys**: All entities use UUIDs for distributed safety
- **16+ migrations**: Progressive schema evolution tracked in version control
- **Prisma adapter for auth**: Better Auth integrated directly with Prisma/PostgreSQL

---

## 8. External Service Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                    PROJECT ATLAS                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GOOGLE CLOUD                                                │
│  ├── Gemini 2.5 Flash (LLM - fast tasks)                   │
│  ├── Gemini 3.1 Pro Preview (LLM - complex tasks)          │
│  ├── Gemini 3 Pro Image Preview (image generation)         │
│  ├── Veo 3.1 (video generation - direct API)               │
│  └── Google ADK (agent framework)                           │
│                                                              │
│  ELEVENLABS                                                  │
│  ├── v3 TTS (voice narration)                               │
│  ├── Voice API (voice preset discovery)                     │
│  └── SFX Generation (ambient sounds, transitions)          │
│                                                              │
│  FAL.AI                                                      │
│  ├── Kling O3 (video generation)                            │
│  └── SeDance 1.5 Pro (video generation)                     │
│                                                              │
│  REPLICATE                                                   │
│  ├── google/veo-3.1                                         │
│  ├── kwaivgi/kling-v2.1                                     │
│  ├── bytedance/seedance-1.5-pro                             │
│  └── bytedance/seedance-1-lite                              │
│                                                              │
│  RESEARCH / SEARCH                                           │
│  ├── Brave Search API (web search)                          │
│  ├── OpenAlex API (academic papers)                         │
│  ├── Semantic Scholar API (scientific literature)           │
│  ├── Wikipedia API (general knowledge)                      │
│  ├── CrossRef API (scholarly citations)                     │
│  ├── Reddit API (community signals)                         │
│  ├── HackerNews API (tech community)                        │
│  ├── Google Trends (RSS feed parsing)                       │
│  └── YouTube Data API v3 (channel analysis)                 │
│                                                              │
│  STORAGE                                                     │
│  └── AWS S3 / DigitalOcean Spaces (media storage)           │
│                                                              │
│  INFRASTRUCTURE                                              │
│  ├── PostgreSQL 16 (database)                               │
│  ├── Redis 7 (job queue + cache)                            │
│  ├── Docker (containerization)                              │
│  ├── Nginx (reverse proxy + SSL)                            │
│  └── Let's Encrypt (SSL certificates)                       │
│                                                              │
│  BUILD & TOOLING                                             │
│  ├── Turborepo (monorepo orchestration)                     │
│  ├── TypeScript (type safety)                               │
│  ├── Prisma (ORM + migrations)                              │
│  ├── FFmpeg (video/audio composition)                       │
│  └── Better Auth (authentication)                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Security Implementation

| Layer | Implementation |
|-------|---------------|
| **Authentication** | Better Auth with Prisma adapter (email/password + OAuth) |
| **Session Management** | Database-backed sessions (PostgreSQL) |
| **Route Protection** | `requireAuth` middleware on all `/api/projects/*` routes |
| **Rate Limiting** | 200 requests per 15 minutes (`express-rate-limit`) |
| **Security Headers** | Helmet (X-Frame-Options, CSP, HSTS, etc.) |
| **CORS** | Configurable origin via `CORS_ORIGIN` env var |
| **Input Validation** | Zod schemas on all request bodies |
| **SSL/TLS** | Let's Encrypt certificates via Nginx |
| **Body Size Limit** | 10MB JSON limit on Express |
| **File Upload Limit** | 50MB via Nginx `client_max_body_size` |

---

## 10. Testing Infrastructure

- **Framework**: Jest 30 + ts-jest
- **API Testing**: Supertest for HTTP endpoint testing
- **Test Structure**: `__tests__/` directories in apps/api and apps/workers
- **Type Checking**: `tsc --noEmit` as separate CI step
- **Linting**: ESLint via Turbo task
- **Build Verification**: Turbo-orchestrated build with dependency resolution
