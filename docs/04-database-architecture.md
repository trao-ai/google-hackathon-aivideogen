# Database Architecture

> PostgreSQL 16 — 19 models, managed by Prisma ORM

---

## 1. Entity Relationship Diagram

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                           AUTHENTICATION DOMAIN                                      ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   ┌──────────────────────┐                                                          ║
║   │       User           │                                                          ║
║   ├──────────────────────┤         ┌──────────────────────┐                         ║
║   │ id          UUID  PK │────┐    │      Session         │                         ║
║   │ name        String   │    │    ├──────────────────────┤                         ║
║   │ email       String U │    ├───▶│ id        UUID    PK │                         ║
║   │ emailVerified Bool   │    │    │ userId    UUID    FK │──┐                      ║
║   │ image       String?  │    │    │ token     String   U │  │ CASCADE              ║
║   │ createdAt   DateTime │    │    │ expiresAt DateTime   │  │                      ║
║   │ updatedAt   DateTime │    │    │ ipAddress String?    │  │                      ║
║   └──────────────────────┘    │    │ userAgent String?    │  │                      ║
║                               │    └──────────────────────┘  │                      ║
║                               │                              │                      ║
║                               │    ┌──────────────────────┐  │                      ║
║                               │    │      Account         │  │                      ║
║                               │    ├──────────────────────┤  │                      ║
║                               ├───▶│ id         UUID   PK │  │                      ║
║                               │    │ userId     UUID   FK │──┘                      ║
║                               │    │ accountId  String    │                         ║
║                               │    │ providerId String    │                         ║
║                               │    │ accessToken String?  │                         ║
║                               │    │ password   String?   │                         ║
║                               │    └──────────────────────┘                         ║
║                               │                                                      ║
║                               │    ┌──────────────────────┐                         ║
║                               │    │   Verification       │                         ║
║                               │    ├──────────────────────┤                         ║
║                               │    │ id         UUID   PK │  (standalone)           ║
║                               │    │ identifier String    │                         ║
║                               │    │ value      String    │                         ║
║                               │    │ expiresAt  DateTime  │                         ║
║                               │    └──────────────────────┘                         ║
║                               │                                                      ║
╠═══════════════════════════════╪══════════════════════════════════════════════════════╣
║                           PROJECT DOMAIN                                             ║
╠═══════════════════════════════╪══════════════════════════════════════════════════════╣
║                               │                                                      ║
║   ┌───────────────────────────▼──────────────────────────────────────────┐           ║
║   │                          Project                                      │           ║
║   ├──────────────────────────────────────────────────────────────────────┤           ║
║   │ id                UUID    PK                                          │           ║
║   │ title             String                                              │           ║
║   │ niche             String                                              │           ║
║   │ status            String    default:"draft"  (23 possible states)    │           ║
║   │ targetRuntimeSec  Int       default:750                               │           ║
║   │ totalCostUsd      Float     default:0                                 │           ║
║   │ videoProvider      String    default:"kling"                          │           ║
║   │ platform          String    default:"youtube"                         │           ║
║   │ videoType         String?   "short"|"medium"|"long"                  │           ║
║   │ videoStyle        String?                                             │           ║
║   │ toneKeywords      String[]  default:[]                               │           ║
║   │ styleBibleId      UUID?     FK → StyleBible (SET NULL)               │           ║
║   │ selectedTopicId   UUID?                                               │           ║
║   │ selectedScriptId  UUID?                                               │           ║
║   │ selectedCharacterId UUID?                                             │           ║
║   │ createdAt         DateTime                                            │           ║
║   │ updatedAt         DateTime                                            │           ║
║   └───┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────┘           ║
║       │      │      │      │      │      │      │      │      │                      ║
║       │      │      │      │      │      │      │      │      │  CASCADE on all      ║
║       ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼                      ║
║                                                                                      ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                      CONTENT PIPELINE DOMAIN                                         ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   ┌────────────────────┐          ┌──────────────────────────┐                      ║
║   │      Topic         │          │     ResearchBrief        │                      ║
║   ├────────────────────┤          ├──────────────────────────┤                      ║
║   │ id         UUID PK │────1:N──▶│ id              UUID  PK │                      ║
║   │ projectId  UUID FK │          │ projectId       UUID  FK │                      ║
║   │ title      String  │          │ topicId         UUID  FK │                      ║
║   │ summary    String  │          │ summary         String   │                      ║
║   │ opportunityScore   │          │ background      String?  │                      ║
║   │   Float   (0-100)  │          │ currentDevelopments Str? │                      ║
║   │ visualStory Float  │          │ surprisingFacts Str[]    │                      ║
║   │ evergreenScore Flt │          │ controversies   String?  │                      ║
║   │ trendScore   Float │          │ stakes          String?  │                      ║
║   │ curiosityGap Float │          │ timeline        String[] │                      ║
║   │ factDensity  Float │          │ keyFacts        String[] │                      ║
║   │ thumbnailAngle Str?│          │ storyAngles     String[] │                      ║
║   │ likelyAudience Str?│          │ claims          Json     │                      ║
║   │ status     String  │          │ sources         Json     │                      ║
║   │ createdAt  DateTime│          │ confidenceScore Float    │                      ║
║   └────────────────────┘          └──────────────────────────┘                      ║
║                                                                                      ║
║   ┌──────────────────────────┐    ┌──────────────────────────┐                      ║
║   │        Script            │    │     ScriptSection        │                      ║
║   ├──────────────────────────┤    ├──────────────────────────┤                      ║
║   │ id              UUID  PK │───▶│ id              UUID  PK │                      ║
║   │ projectId       UUID  FK │1:N │ scriptId        UUID  FK │                      ║
║   │ titleCandidates Str[]    │    │ orderIndex      Int      │                      ║
║   │ thumbnailAngles Str[]    │    │ sectionType     String   │                      ║
║   │ outline         String   │    │   "hook"|"intro"|"bridge"│                      ║
║   │ fullText        String   │    │   "body"|"climax"|"cta"  │                      ║
║   │ estimatedDurSec Int      │    │   "reveal"|"outro"|      │                      ║
║   │ qualityScore    Json     │    │   "narration"            │                      ║
║   │ status          String   │    │ text           String    │                      ║
║   │ createdAt       DateTime │    │ estimatedDurSec Int      │                      ║
║   └──────────────────────────┘    │ sourceRefs     String[]  │                      ║
║            │                      └──────────┬───────────────┘                      ║
║            │ 1:N                             │ 1:N                                   ║
║            ▼                                 │ (SET NULL)                             ║
║   ┌──────────────────────────┐               │                                       ║
║   │       Voiceover          │               │                                       ║
║   ├──────────────────────────┤               │                                       ║
║   │ id          UUID      PK │               │                                       ║
║   │ projectId   UUID      FK │               │                                       ║
║   │ scriptId    UUID      FK │               │                                       ║
║   │ vendor      String       │               │                                       ║
║   │ voiceId     String       │               │                                       ║
║   │ audioUrl    String       │               │                                       ║
║   │ durationSec Float        │               │                                       ║
║   │ segments    Json         │               │                                       ║
║   │ subtitleUrl String?      │               │                                       ║
║   │ costUsd     Float        │               │                                       ║
║   └──────────────────────────┘               │                                       ║
║                                              │                                       ║
╠══════════════════════════════════════════════╪═══════════════════════════════════════╣
║                     VISUAL GENERATION DOMAIN │                                       ║
╠══════════════════════════════════════════════╪═══════════════════════════════════════╣
║                                              │                                       ║
║   ┌──────────────────────────────────────────▼───────────────────────┐               ║
║   │                          Scene                                    │               ║
║   ├──────────────────────────────────────────────────────────────────┤               ║
║   │ id                   UUID    PK                                   │               ║
║   │ projectId            UUID    FK → Project                        │               ║
║   │ scriptSectionId      UUID?   FK → ScriptSection (SET NULL)       │               ║
║   │ orderIndex           Int                                          │               ║
║   │ narrationStartSec    Float                                        │               ║
║   │ narrationEndSec      Float                                        │               ║
║   │ purpose              String   ("introduce_character", "explain",  │               ║
║   │                               "show_action", "transition", etc.)  │               ║
║   │ sceneType            String   ("establishing", "action",          │               ║
║   │                               "detail", "emotional", "montage")   │               ║
║   │ startPrompt          String   (image generation prompt)           │               ║
║   │ endPrompt            String   (image generation prompt)           │               ║
║   │ motionNotes          String   (camera/animation direction)        │               ║
║   │ bubbleText           String?  (on-screen text overlay)            │               ║
║   │ continuityNotes      String?  (visual continuity hints)           │               ║
║   │ consistencyScore     Float?   (0-1 consistency rating)            │               ║
║   │ estimatedCostUsd     Float?                                       │               ║
║   │ clipTargetDurationSec Float?  (target video length)               │               ║
║   │ transitionPlan       Json?    (transition type + duration)        │               ║
║   │ frameStatus          String   "pending"|"generating"|"complete"  │               ║
║   │ clipStatus           String   "pending"|"generating"|"complete"  │               ║
║   └────────┬──────────────────────────────┬──────────────────────────┘               ║
║            │ 1:N                          │ 1:1                                       ║
║            ▼                              ▼                                           ║
║   ┌──────────────────────┐    ┌──────────────────────────┐                           ║
║   │     SceneFrame       │    │      SceneClip           │                           ║
║   ├──────────────────────┤    ├──────────────────────────┤                           ║
║   │ id        UUID    PK │    │ id          UUID      PK │                           ║
║   │ sceneId   UUID    FK │    │ sceneId     UUID   FK  U │                           ║
║   │ frameType String     │    │ videoUrl    String       │                           ║
║   │  "start" | "end"    │    │ durationSec Float        │                           ║
║   │ imageUrl  String     │    │ costUsd     Float        │                           ║
║   │ prompt    String     │    │ metadata    Json?        │                           ║
║   │ seed      String?    │    │ createdAt   DateTime     │                           ║
║   │ qualityScore Float?  │    └──────────────────────────┘                           ║
║   │ styleMatchScore Flt? │                                                           ║
║   │ costUsd   Float      │                                                           ║
║   └──────────────────────┘                                                           ║
║                                                                                      ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                    RENDER & EXPORT DOMAIN                                            ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   ┌──────────────────────────┐    ┌──────────────────────────┐                      ║
║   │        Render            │    │     ExportVariant        │                      ║
║   ├──────────────────────────┤    ├──────────────────────────┤                      ║
║   │ id          UUID      PK │───▶│ id          UUID      PK │                      ║
║   │ projectId   UUID      FK │1:N │ renderId    UUID      FK │                      ║
║   │ videoUrl    String?      │    │ format      String       │                      ║
║   │ subtitleUrl String?      │    │   "mp4"|"mov"|"webm"     │                      ║
║   │ durationSec Float?       │    │ resolution  String       │                      ║
║   │ costUsd     Float        │    │   "720p"|"1080p"|"4k"    │                      ║
║   │ status      String       │    │ quality     String       │                      ║
║   │   "pending"|"processing" │    │   "standard"|"high"|     │                      ║
║   │   |"complete"|"failed"   │    │   "ultra"                │                      ║
║   │ step        String?      │    │ videoUrl    String?      │                      ║
║   │ errorMsg    String?      │    │ durationSec Float?       │                      ║
║   │ createdAt   DateTime     │    │ fileSizeBytes BigInt?    │                      ║
║   └──────────────────────────┘    │ status      String       │                      ║
║                                   │ step        String?      │                      ║
║                                   │ errorMsg    String?      │                      ║
║                                   └──────────────────────────┘                      ║
║                                                                                      ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                    DESIGN & CONFIGURATION DOMAIN                                     ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   ┌──────────────────────────┐    ┌──────────────────────────┐                      ║
║   │      StyleBible          │    │      Character           │                      ║
║   ├──────────────────────────┤    ├──────────────────────────┤                      ║
║   │ id            UUID    PK │    │ id             UUID   PK │                      ║
║   │ name          String     │    │ projectId      UUID   FK │                      ║
║   │ version       String     │    │ name           String    │                      ║
║   │ visualMission String     │    │ description    String    │                      ║
║   │ emotionalTone String     │    │ imageUrl       String?   │                      ║
║   │ narrativeStance String   │    │ prompt         String?   │                      ║
║   │ palette       Json       │    │ gender         String    │                      ║
║   │ characterRules Json      │    │ ageStyle       String    │                      ║
║   │ lineWeights   String     │    │ emotion        String    │                      ║
║   │ textureRules  String     │    │ appearance     String    │                      ║
║   │ shadowRules   String     │    │ useInScenes    Boolean   │                      ║
║   │ backgroundDensity String │    │ useAsNarrator  Boolean   │                      ║
║   │ motionRules   String     │    │ animateExpr    Boolean   │                      ║
║   │ bubbleRules   String     │    │ transparentBg  Boolean   │                      ║
║   │ negativePrompts Str[]    │    │ costUsd        Float     │                      ║
║   │ promptPrimitives Json    │    │ seed           String?   │                      ║
║   └──────────────────────────┘    └──────────────────────────┘                      ║
║           │ 1:N                                                                      ║
║           └──────────▶ Project.styleBibleId                                         ║
║                                                                                      ║
║   ┌──────────────────────────┐    ┌──────────────────────────┐                      ║
║   │    CaptionSettings       │    │    ChannelProfile        │                      ║
║   ├──────────────────────────┤    ├──────────────────────────┤                      ║
║   │ id          UUID      PK │    │ id            UUID    PK │                      ║
║   │ projectId   UUID   FK  U │    │ projectId     UUID    FK │                      ║
║   │ font        String       │    │ channelName   String     │                      ║
║   │ fontSize    Int          │    │ channelUrl    String     │                      ║
║   │ textColor   String       │    │ topTopics     String[]   │                      ║
║   │ textOpacity Int          │    │ titlePatterns String[]   │                      ║
║   │ bgColor     String       │    │ runtimeRange  Float[]   │                      ║
║   │ bgOpacity   Int          │    │ visualTraits  String[]   │                      ║
║   │ position    String       │    │ publishCadence String?  │                      ║
║   │ template    String       │    │ rawData       Json?      │                      ║
║   │ highlightKeywords Bool   │    └──────────────────────────┘                      ║
║   │ targetLanguage String    │                                                      ║
║   │ burnInCaptions Boolean   │                                                      ║
║   └──────────────────────────┘                                                      ║
║                                                                                      ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                          COST TRACKING DOMAIN                                        ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────┐               ║
║   │                        CostEvent                                  │               ║
║   ├──────────────────────────────────────────────────────────────────┤               ║
║   │ id          UUID    PK                                            │               ║
║   │ projectId   UUID    FK → Project (CASCADE)                       │               ║
║   │ stage       String       ← 17 possible stages (see below)        │               ║
║   │ vendor      String       "gemini"|"elevenlabs"|"fal"|"replicate" │               ║
║   │ units       Float        token count / char count / sec / count  │               ║
║   │ unitCost    Float        cost per unit                            │               ║
║   │ totalCostUsd Float       pre-calculated total                    │               ║
║   │ metadata    Json?        stage-specific details                   │               ║
║   │ createdAt   DateTime                                              │               ║
║   │                                                                    │               ║
║   │ Indexes: [projectId, createdAt], [projectId, stage]              │               ║
║   └──────────────────────────────────────────────────────────────────┘               ║
║                                                                                      ║
║   Cost Stages:                                                                       ║
║   ┌────────────────────┬────────────────────┬────────────────────────┐               ║
║   │ Research Phase     │ Production Phase    │ Composition Phase      │               ║
║   ├────────────────────┼────────────────────┼────────────────────────┤               ║
║   │ topic_discovery    │ frame_generation   │ render                  │               ║
║   │ channel_analysis   │ frame_validation   │ sfx_generation          │               ║
║   │ research           │ video_generation   │ sfx_design              │               ║
║   │ script             │ character_gen      │ export                  │               ║
║   │ scene_planning     │ motion_enrichment  │                        │               ║
║   │ tts                │                    │                        │               ║
║   └────────────────────┴────────────────────┴────────────────────────┘               ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Relationship Map (Simplified)

```
User ─┬─ 1:N ──▶ Session    (CASCADE)
      └─ 1:N ──▶ Account    (CASCADE)

StyleBible ── 1:N ──▶ Project  (SET NULL)

Project ─┬─ 1:N ──▶ Topic ── 1:N ──▶ ResearchBrief       (CASCADE → RESTRICT)
         ├─ 1:N ──▶ Script ─┬─ 1:N ──▶ ScriptSection      (CASCADE)
         │                   └─ 1:N ──▶ Voiceover           (CASCADE → RESTRICT)
         │
         ├─ 1:N ──▶ Scene ──┬─ 1:N ──▶ SceneFrame         (CASCADE)
         │                   └─ 1:1 ──▶ SceneClip           (CASCADE)
         │
         ├─ 1:N ──▶ Render ── 1:N ──▶ ExportVariant        (CASCADE)
         │
         ├─ 1:N ──▶ Character                               (CASCADE)
         ├─ 1:N ──▶ CostEvent                               (CASCADE)
         ├─ 1:N ──▶ ChannelProfile                          (CASCADE)
         └─ 1:1 ──▶ CaptionSettings                         (CASCADE)

ScriptSection ── 1:N ──▶ Scene                               (SET NULL)
```

---

## 3. Domain Breakdown

| Domain | Models | Purpose |
|--------|--------|---------|
| **Authentication** | User, Session, Account, Verification | Better Auth managed; email/password + OAuth |
| **Project Core** | Project, ChannelProfile | Central entity; settings, state machine, platform config |
| **Content Pipeline** | Topic, ResearchBrief, Script, ScriptSection, Voiceover | Research → Script → Voice narration |
| **Visual Generation** | Scene, SceneFrame, SceneClip | Scene planning → Frame images → Video clips |
| **Render & Export** | Render, ExportVariant | Final composition → Multi-format export |
| **Design System** | StyleBible, Character, CaptionSettings | Visual identity, character consistency, subtitle styling |
| **Cost Tracking** | CostEvent | Per-stage, per-vendor cost auditing |

---

## 4. Key Design Decisions

### 4.1 Cascade Deletion Strategy
- **Project is the root**: Deleting a project cascades to ALL child content (topics, scripts, scenes, renders, costs)
- **Protective references**: Topic → ResearchBrief uses **RESTRICT** (can't delete topic with existing research)
- **Soft unlinking**: ScriptSection → Scene uses **SET NULL** (deleting a section doesn't destroy scenes, just unlinks them)
- **Style Bible preservation**: Project → StyleBible uses **SET NULL** (styles survive project deletion)

### 4.2 State Machine in `status` Field
The `Project.status` field tracks 23 lifecycle states:
```
draft → topics_generating → topics_ready → research_generating → research_ready →
script_generating → script_ready → voice_generating → voice_ready →
scenes_planning → scenes_ready → frames_generating → frames_ready →
videos_generating → videos_ready → rendering → render_ready →
exporting → complete

Error states: *_failed (for each generating state)
```

### 4.3 Denormalized Cost Fields
Cost is tracked in two ways for different access patterns:
- **`CostEvent` table**: Granular, append-only audit log with stage/vendor/units
- **`Project.totalCostUsd`**: Pre-aggregated for fast dashboard display
- **`Voiceover.costUsd`**, **`SceneFrame.costUsd`**, **`SceneClip.costUsd`**, **`Character.costUsd`**: Per-asset cost for itemized breakdown

### 4.4 JSON Fields for Flexible Data
Several fields use `Json` type for semi-structured data:
- `ResearchBrief.claims` — Array of `{ claim, source, confidence }`
- `ResearchBrief.sources` — Array of `{ url, title, type }`
- `Script.qualityScore` — `{ hook, flow, factDensity, ... }`
- `Voiceover.segments` — Array of `{ startSec, endSec, text, words[] }`
- `Scene.transitionPlan` — `{ type, durationSec }`
- `SceneClip.metadata` — Provider-specific response data
- `StyleBible.palette` — Color system definition
- `ChannelProfile.rawData` — Raw YouTube API response

### 4.5 Indexed Queries
```sql
-- Cost dashboard: Get all costs for a project, ordered by time
CREATE INDEX idx_cost_project_created ON CostEvent(projectId, createdAt);

-- Cost breakdown: Get costs by stage for a project
CREATE INDEX idx_cost_project_stage ON CostEvent(projectId, stage);
```

---

## 5. Data Volume Estimates (Per Video Project)

| Model | Records per Project | Size Estimate |
|-------|-------------------|---------------|
| Topic | 10 | ~5 KB |
| ResearchBrief | 1 | ~10 KB |
| Script | 1-3 | ~15 KB |
| ScriptSection | 7-12 per script | ~5 KB |
| Voiceover | 1 | ~2 KB (audio in S3) |
| Scene | 8-20 | ~20 KB |
| SceneFrame | 16-40 (2 per scene) | ~10 KB (images in S3) |
| SceneClip | 8-20 (1 per scene) | ~5 KB (videos in S3) |
| Character | 1-3 | ~3 KB (images in S3) |
| CostEvent | 30-80 | ~15 KB |
| Render | 1-3 | ~1 KB (video in S3) |
| ExportVariant | 1-6 per render | ~2 KB |
| CaptionSettings | 1 | ~0.5 KB |
| **Total per project** | **~100-200 rows** | **~90 KB** (metadata only) |

> All media files (images, audio, video) are stored in S3-compatible object storage, not in the database. The database only stores URLs and metadata.

---

## 6. Migration History

| Migration | Description |
|-----------|-------------|
| Initial | Core schema: Project, Topic, Research, Script, Voiceover, Scene, Render |
| +SceneFrame | Separate frame tracking from scene model |
| +SceneClip | Separate clip tracking (1:1 with Scene) |
| +Character | Character generation with appearance attributes |
| +CaptionSettings | Per-project subtitle configuration |
| +CostEvent | Granular cost tracking with indexes |
| +ExportVariant | Multi-format export support |
| +StyleBible | Shared visual identity system |
| +ChannelProfile | YouTube channel analysis storage |
| +Auth Tables | Better Auth (User, Session, Account, Verification) |
