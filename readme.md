# Project Atlas

**AI-native animated edutainment video production platform**

Transform a single topic idea into a fully produced, broadcast-quality video — complete with AI-generated research, scripting, narration, character animation, sound design, and cinematic visuals.

**Live Demo:** [https://video.trao.ai](https://video.trao.ai)

---

## What It Does

Project Atlas orchestrates **7+ AI modalities** in a single pipeline to produce educational videos end-to-end:

```
Topic Idea → Research → Script → Voiceover → Frames → Video Clips → Sound Design → Final Video
```

| Modality | Provider | What It Does |
|---|---|---|
| **LLM Agents** | Google Gemini (via ADK) | 8 specialized agents for research, scripting, scene planning, motion direction |
| **Image Generation** | Gemini 3 Pro Image | Start/end frames per scene with cross-scene visual continuity |
| **Video Generation** | Veo 3.1 / Kling / SeDance | 5-15s AI video clips from frame pairs with motion direction |
| **Voice Narration** | ElevenLabs v3 | 20+ voice presets with tone-specific emotional tuning |
| **Sound Effects** | ElevenLabs SFX | AI-generated ambient soundscapes + transition effects |
| **Research** | Brave Search + 8 APIs | Multi-source research with confidence scoring |
| **Composition** | FFmpeg | Crossfade transitions, sidechain ducking, subtitle burn-in |

---

## Architecture Overview

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Next.js   │────▶│  Express   │────▶│  BullMQ    │
│  Frontend  │     │  API       │     │  Workers   │
│  (React)   │     │  (53 eps)  │     │  (12 jobs) │
└────────────┘     └─────┬──────┘     └─────┬──────┘
                         │                   │
                   ┌─────▼──────┐     ┌─────▼──────┐
                   │ PostgreSQL │     │   Redis    │
                   │  (Prisma)  │     │  (Queue)   │
                   └────────────┘     └────────────┘
                                            │
                   ┌────────────────────────▼────────────────────────┐
                   │            External AI Services                 │
                   │  Google Gemini (ADK + GenAI) · ElevenLabs ·    │
                   │  fal.ai · Replicate · Brave Search · S3       │
                   └────────────────────────────────────────────────┘
```

**Google Cloud Services Used:**
- **Google ADK** (`@google/adk`) — 8 LLM agent types (Topic Scout, Research Synthesizer, Script Architect, Scene Planner, Motion Director, Audio Designer, Character Describer, Frame Validator)
- **Google GenAI SDK** (`@google/genai`) — Direct API for Veo 3.1 video generation, Gemini 3 Pro image generation, and frame quality validation
- **Gemini Models** — `gemini-2.5-flash` (fast tasks), `gemini-3.1-pro-preview` (complex reasoning), `gemini-3-pro-image-preview` (image generation), `veo-3.1-generate-preview` (video generation)

---

## Reproducible Testing Instructions

### Option A: Test on Live Deployment (Recommended for Judges)

The app is deployed and fully functional at:

> **https://video.trao.ai**

**Test Flow (5-10 minutes):**

1. **Sign Up** — Create an account at the login page
2. **Create Project** — Click "New Project", enter a niche (e.g., "science"), select platform (YouTube/TikTok)
3. **Discover Topics** — Click "Discover Topics" to generate 10 AI-scored topic candidates
4. **Select a Topic** — Review scores (visual storytelling, trend momentum, curiosity gap) and select one
5. **Research** — Click "Research" to trigger multi-source research synthesis (Brave Search + academic APIs)
6. **Generate Script** — AI generates a multi-section script with hook, intro, body, climax, CTA
7. **Generate Voice** — Select a voice preset and generate ElevenLabs v3 narration with word-level timestamps
8. **Plan Scenes** — AI splits the voiceover timeline into 5-14 second visual scenes with motion notes
9. **Generate Frames** — AI generates start/end frame images for each scene (Gemini 3 Pro)
10. **Generate Videos** — AI creates video clips from frames (Veo/Kling/SeDance)
11. **Render** — Final composition: clips + voiceover + AI SFX + subtitles → MP4
12. **Export & Download** — Download the final video

**What to observe:**
- Real-time progress polling (watch status badges update live)
- Cost tracking dashboard (see per-stage cost breakdown)
- Visual continuity across scenes (each scene's end frame references the next scene's start)
- Audio quality (tone-specific voice tuning, sidechain ducking in final mix)

---

### Option B: Run Locally with Docker

**Prerequisites:**
- Docker & Docker Compose
- API keys (see below)

```bash
# 1. Clone the repo
git clone <repo-url>
cd infographic-video-generator

# 2. Copy environment file
cp .env.example .env

# 3. Add your API keys to .env (minimum required):
#    GEMINI_API_KEY=...          (Google AI Studio — free tier available)
#    ELEVENLABS_API_KEY=...      (ElevenLabs — free tier available)
#    BRAVE_SEARCH_API_KEY=...    (Brave Search — free tier available)
#
#    For video generation, add ONE of:
#    FAL_KEY=...                 (fal.ai — for Kling/SeDance)
#    REPLICATE_API_TOKEN=...     (Replicate — for any model)
#
#    Set these to false in .env:
#    USE_MOCK_LLM=false
#    USE_MOCK_TTS=false
#    USE_MOCK_IMAGE=false

# 4. Start all services (Postgres, Redis, API, Workers, Web, Nginx)
cd infra/docker
docker compose -f docker-compose.prod.yml up --build -d

# 5. Wait for migrations to complete (~30 seconds)
docker logs atlas_migrate -f

# 6. Open the app
open http://localhost
```

**Docker services started:**
| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL 16 database |
| redis | 6379 | Redis 7 (BullMQ queue) |
| api | 3001 | Express API server |
| workers | - | 12 BullMQ background workers + FFmpeg |
| web | 3000 | Next.js frontend |
| nginx | 80/443 | Reverse proxy |
| migrate | - | Runs Prisma migrations on startup |

---

### Option C: Run Locally for Development

**Prerequisites:**
- Node.js 18+
- PostgreSQL 16
- Redis 7
- FFmpeg (for render worker)

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd infographic-video-generator
npm install

# 2. Start Postgres + Redis via Docker
cd infra/docker
docker compose up -d
cd ../..

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys (see Option B step 3)
# For local dev without API keys, leave USE_MOCK_*=true

# 4. Generate Prisma client + run migrations
npm run db:generate
npm run db:migrate

# 5. Build packages in dependency order
npx tsc -p packages/shared/tsconfig.json
npx tsc -p packages/db/tsconfig.json
npx tsc -p packages/integrations/tsconfig.json
npx tsc -p packages/prompts/tsconfig.json
npx tsc -p packages/cost-estimation/tsconfig.json
npx tsc -p packages/motion-fallback/tsconfig.json

# 6. Start all services (in separate terminals)
cd apps/api && npx ts-node src/index.ts        # Terminal 1: API on :3001
cd apps/workers && npx ts-node src/index.ts    # Terminal 2: Workers
cd apps/web && npm run dev                      # Terminal 3: Web on :3000

# 7. Open the app
open http://localhost:3000
```

**Mock Mode (no API keys needed):**

Set all `USE_MOCK_*=true` in `.env` to run the full pipeline with mock providers. This generates placeholder content but demonstrates the complete UI flow, navigation, and state machine without incurring any API costs.

---

## API Keys & Free Tiers

| Service | Required | Free Tier | Get Key |
|---------|----------|-----------|---------|
| **Google Gemini** | Yes (LLM + Images) | 60 RPM free | [Google AI Studio](https://aistudio.google.com/apikey) |
| **ElevenLabs** | Yes (Voice + SFX) | 10k chars/month | [ElevenLabs](https://elevenlabs.io) |
| **Brave Search** | Yes (Research) | 2k queries/month | [Brave Search API](https://brave.com/search/api/) |
| **fal.ai** | For Kling/SeDance video | Pay-per-use | [fal.ai](https://fal.ai) |
| **Replicate** | For Replicate video models | Pay-per-use | [Replicate](https://replicate.com) |
| **S3/Spaces** | For media storage | Optional (local fallback) | AWS/DigitalOcean |

---

## Project Structure (Monorepo)

```
project-atlas/
├── apps/
│   ├── api/          Express backend (53 API endpoints)
│   ├── workers/      12 BullMQ workers + FFmpeg pipeline
│   └── web/          Next.js 14 frontend
├── packages/
│   ├── shared/       Types, pricing, constants
│   ├── db/           Prisma schema + migrations (19 models)
│   ├── integrations/ AI provider adapters (Gemini, ElevenLabs, fal.ai, Replicate)
│   ├── prompts/      Versioned LLM prompt templates
│   ├── cost-estimation/ Per-model cost calculators
│   ├── motion-fallback/ Ken Burns FFmpeg fallback
│   ├── style-system/ Visual identity + design tokens
│   └── validation/   Zod schemas
├── infra/
│   ├── docker/       Docker Compose (dev + prod)
│   └── nginx/        Reverse proxy config
├── docs/             Architecture docs, PRD, diagrams
├── Dockerfile        Multi-stage build (api, workers, web targets)
└── .env.example      All environment variables
```

---

## Key Technical Highlights

### Google ADK Agent Architecture
8 specialized `LlmAgent` instances via `@google/adk`, each with domain-specific system prompts, structured JSON output, and token-level cost tracking.

### Multi-Provider Video Generation
Factory pattern supporting 7 video model variants across 4 platforms, with automatic fallback to Ken Burns animation on failure.

### Anti-Hallucination & Grounding
- Source attribution with confidence scores on research claims
- Character consistency enforcement via canonical description injection
- "No text in images" rule enforced at prompt level
- Timeline alignment validation (no gaps, no overruns)
- Frame quality + style validation via Gemini

### Professional Audio Pipeline
- Tone-specific ElevenLabs v3 tuning (stability, similarity, style per section type)
- AI-designed ambient soundscapes + transition SFX
- Sidechain ducking (background audio automatically ducks under narration)
- Word-level subtitle synchronization

### Graceful Degradation (12+ Fallbacks)
- Video gen fails → Ken Burns pan/zoom ($0 cost)
- SFX gen fails → generic "gentle whoosh" fallback
- Font download fails → system font fallback
- Veo start+end frame rejected → start-frame-only mode
- No Gemini key → skip motion enrichment
- And 7 more fallback strategies

---

## Documentation

| Document | Description |
|----------|-------------|
| [Innovation & Multimodal UX](docs/01-innovation-multimodal-ux.md) | How the project breaks the "text box" paradigm |
| [Technical Implementation](docs/02-technical-implementation.md) | Agent architecture, SDK usage, error handling |
| [Architecture & Deployment](docs/03-architecture-and-deployment.md) | System diagrams, cloud deployment, tech stack |
| [Database Architecture](docs/04-database-architecture.md) | ERD, 19-model schema, relationship map |
| [Product Requirements](docs/PRD.md) | Full PRD + technical specification |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, React Query, ReactFlow, Radix UI |
| **Backend** | Express, TypeScript, Prisma ORM, BullMQ, Zod, Helmet, better-auth |
| **AI** | Google ADK, Google GenAI SDK, ElevenLabs, fal.ai, Replicate |
| **Infrastructure** | Docker, Nginx, PostgreSQL 16, Redis 7, S3, Let's Encrypt |
| **Media** | FFmpeg (video/audio processing), Sharp (images), ffprobe (duration validation) |
