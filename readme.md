Product Spec: AI Edutainment Long-Form Video Factory

1. Product name

Project Atlas
AI software that researches, scripts, voices, visualizes, and assembles long-form 2D edutainment YouTube videos in a consistent channel style.

2. Product goal

Build an internal production platform that can generate 10–15 minute YouTube edutainment videos inspired by the structural strengths of channels like The Infographics Show and Kurzgesagt, while maintaining a unique, reusable house style and production pipeline. Both channels currently have massive reach and regularly publish high-performing animated informational content.

The platform should:

discover promising topics

research them deeply

generate a high-retention long-form script

synthesize narration with a consistent female voice

design scene plans

generate a start frame and end frame for each scene

optionally animate scenes through a video model

assemble a full final video

track costs, timings, and output quality

3. Non-goals

The platform will not:

guarantee virality or views

clone another channel’s exact artwork, brand identity, or copyrighted assets

publish automatically without review in v1

fully replace human editorial oversight for factual claims in sensitive topics

4. Product principles

Optimize for virality potential, not certainty

Keep visual style consistent across all videos

Bias toward long-form stories with strong hooks and escalating curiosity

Minimize on-screen text

Use reusable scene grammar

Measure cost per finished minute

Keep humans in the loop for final approval

YouTube itself emphasizes idea generation tools, audience search trends, and retention analysis as critical creator workflows, including the Inspiration tab, Trends surfaces, and key moments for audience retention.

5. User stories
   5.1 Founder / operator

I want to select a niche or content lane.

I want the system to discover topics that are currently hot.

I want it to identify ideas with long-form viral potential.

I want one-click generation of a full video package.

I want to see total production cost and time.

I want every video to look like it belongs to the same channel.

5.2 Content strategist

I want the system to analyze high-performing videos from reference channels.

I want topic clusters, title patterns, hook patterns, pacing patterns, and retention hypotheses.

I want multiple script candidates ranked by likely watchability.

5.3 Motion/creative lead

I want a style bible the models always reference.

I want scene cards with camera notes, art direction, character behavior, and motion intent.

I want start and end frames per scene, plus optional in-between animation generation.

5.4 Editor / QA reviewer

I want factual citation packets for every script section.

I want red flags for unsupported claims.

I want easy regeneration of weak scenes or weak script segments.

6. High-level workflow
   Phase 1: Trend and channel intelligence

Pull candidate topics from:

Google Trends / Google Trends API

YouTube Studio Trends / Inspiration-compatible ideas

news/search APIs

channel performance analysis of reference channels

Crawl/reference target channels:

The Infographics Show

Kurzgesagt

other selected 2D edutainment channels

Extract from top-performing videos:

title formulas

topic families

thumbnail themes

hook types

runtime ranges

pacing and section density

emotional arcs

Build a Topic Opportunity Score

Google Trends now has an official API in alpha, and YouTube Studio offers both Trends and Inspiration features for idea generation.

Phase 2: Research engine

Search the web for the selected topic

Gather primary and secondary sources

Summarize facts into a structured knowledge pack:

background

current developments

surprising facts

controversy

stakes

timeline

possible “what happens next” angle

Score source confidence

Produce a “story fuel” pack

Phase 3: Script generation

Generate 3–5 hooks

Generate 3 long-form outlines

Score each outline on:

novelty

emotional tension

retention potential

clarity

fact support

thumbnail/title alignment

Pick best outline

Generate full script with sections:

cold open

premise escalation

context

key reveals

payoff

future consequence

CTA

Generate narration markup for TTS pacing

Phase 4: Voiceover

Send script to ElevenLabs

Use a selected female narration voice

Generate audio

Get timestamps by paragraph/sentence

Align narration to scenes

ElevenLabs documents lifelike TTS with nuanced intonation and API-based text-to-speech generation.

Phase 5: Style system

Load channel style bible

Convert script into scene plan

Generate scene prompts using style bible

Create:

first frame

final frame

motion notes

speech bubble notes

transition intent

Save all prompts and outputs to scene package

Google’s Gemini image stack, including Nano Banana / Gemini Image surfaces, supports prompt-based image generation and editing; Kling-style APIs support image-to-video generation from visual inputs.

Phase 6: Animation and assembly

Generate in-between motion using image-to-video or scene animation engine

Stitch scenes together to match narration timestamps

Add music bed and SFX

Add light bubble text and captions where needed

Add subscribe CTA end card

Export master video

Phase 7: Analytics and cost tracking

Store model/API usage

Store cost per stage

Store cost per minute

Store generation failures

Store publish metadata

Later ingest YouTube performance back into ranking models

7. Functional requirements
   7.1 Channel intelligence module
   Requirements

Allow operator to enter a list of reference channels

Pull:

latest videos

top viewed videos

average runtime

title structures

publish cadence

Analyze channel themes and content categories

Produce reusable “reference DNA” profiles

Notes

For YouTube, exact “sort by popular” UI behavior may require browser automation or scraping fallback, but a practical implementation is to pull channel video metadata and sort by view count in the app.

Output
{
"channel_name": "Kurzgesagt",
"top_patterns": {
"topics": ["health", "space", "civilization risk", "biology"],
"title_patterns": ["question-led", "uncomfortable truth", "what if"],
"runtime_range_minutes": [8, 15],
"visual_traits": ["clean iconography", "bright palette", "symbolic characters"]
}
}
7.2 Trend discovery module
Inputs

Google Trends

YouTube trends/inspiration-derived signals

OpenAI Search or other search APIs

News feeds

operator-defined niche filters

Requirements

Discover daily/weekly rising topics

Filter by edutainment suitability

Reject topics that lack enough factual material for 10–15 minutes

Rank topics by:

search momentum

social discussion

surprise factor

evergreen tail

thumbnail potential

controversy without policy risk

suitability for visual storytelling

Topic score formula
TopicOpportunityScore =
0.25 _ SearchMomentum +
0.20 _ EdutainmentFit +
0.15 _ VisualStorytellingFit +
0.15 _ CuriosityGap +
0.10 _ EvergreenPotential +
0.10 _ FactDensity +
0.05 \* ProductionFeasibility
Output

Top 20 ideas with confidence and why they may perform.

7.3 Research engine
Requirements

Search the web

collect credible sources

de-duplicate facts

extract timelines

identify conflicting claims

generate claim-evidence map

produce citation bundle

Research object
{
"topic": "Why Earth once snowed for millions of years",
"summary": "...",
"key_claims": [
{
"claim": "...",
"sources": ["url1", "url2"],
"confidence": 0.92
}
],
"angles": [
"how did it start",
"why it matters now",
"what people get wrong"
],
"story_assets": [
"timeline",
"analogy",
"counterintuitive fact",
"visual metaphor"
]
}
7.4 Viral script generator
Requirements

Generate long-form scripts optimized for retention

Include hooks every 20–45 seconds

Use structured reveals

Avoid flat exposition

Create strong CTA at end

Support tone presets:

dramatic

curious

urgent

optimistic

dark-edutainment

Script structure

Hook: startling claim/question

Promise: what the viewer will understand by the end

Context

Escalation

Main explanation

Consequences

Big reveal / synthesis

Final takeaway

Subscribe CTA

Constraints

1,600–2,400 words for 10–15 min target

Paragraphs tagged with estimated duration

Scene break markers embedded

Each paragraph linked to facts

Output
{
"title_candidates": ["..."],
"thumbnail_angles": ["..."],
"script": [
{
"section_id": "hook_01",
"text": "...",
"duration_estimate_sec": 24,
"scene_ids": ["scene_001", "scene_002"]
}
]
}
7.5 Voice engine
Requirements

Integrate ElevenLabs TTS API

Maintain one approved house narrator

Support pacing controls, pauses, emphasis markers

Generate:

master voiceover

sentence timestamps

paragraph timestamps

subtitle text

Output
{
"audio_url": "s3://...",
"duration_sec": 812,
"segments": [
{
"text": "...",
"start": 0.0,
"end": 6.3
}
],
"cost_usd": 4.82
}
7.6 Style bible system

This is one of the most important parts.

Goal

Ensure every image and scene looks like it comes from the same channel.

Components

Brand language

visual mission

emotional tone

narrative stance

Art direction

palette

line weights

texture rules

shadow rules

background density

Character system

body shape rules

facial simplification

eye style

gesture style

clothing language

Scene grammar

wide explainer shot

character reaction shot

infographic map shot

comparison frame

timeline frame

metaphor frame

bubble-dialog frame

Text rules

minimal text

bubble text only when clarity improves retention

Motion rules

pan types

zoom style

parallax depth

object morph transitions

Negative rules

no photorealism

no random style drift

no inconsistent character proportions

no typography-heavy scenes

Required files

style_bible.md

prompt_primitives.json

character_sheet.json

palette.json

scene_templates.json

negative_prompts.json

Example style bible snippet
Channel visual language:

- Premium 2D editorial explainer style
- Clean geometric character anatomy
- High contrast focal hierarchy
- Rich but restrained backgrounds
- Friendly but intellectually sharp tone
- Motion designed for explanation, not spectacle overload

Characters:

- Rounded silhouettes
- 3 head-height simplified body ratio
- Eyes: dot or almond, low-detail
- Hands: simplified, gesture readable
- No realistic skin rendering
  7.7 Scene planner
  Requirements

Break script into scenes based on narration timing

For every scene, generate:

scene purpose

narration range

start frame prompt

end frame prompt

camera direction

motion direction

speech bubble text if needed

continuity notes

Scene object
{
"scene_id": "scene_014",
"narration_start_sec": 182.4,
"narration_end_sec": 201.9,
"purpose": "show the scale of the crisis visually",
"scene_type": "comparison_infographic",
"start_frame_prompt": "...",
"end_frame_prompt": "...",
"motion_notes": "camera slowly pushes in while data icons fill the frame",
"bubble_text": null,
"style_refs": ["palette_v3", "character_system_v2"],
"estimated_cost_usd": 0.18
}
7.8 Image generation engine
Requirements

Use Nano Banana / Gemini image model

Generate first frame and end frame for each scene

Enforce consistent style via style bible context

Support reference-image conditioning where possible

Store prompt, seed, revisions, and final selected frames

Output per scene

scene_014_start.png

scene_014_end.png

scene_014_meta.json

Regeneration rules

regenerate if:

style mismatch score > threshold

character inconsistency > threshold

prompt adherence < threshold

readability too low

7.9 Video generation engine
Requirements

Send scene start/end frames and motion notes to a video model

Generate short video segment for each scene

Match scene duration to narration timing

Support fallback animation strategy:

Ken Burns + parallax

object mask motion

bubble pop-in

vector motion overlays

Note

Kling-style APIs are suited to short scene generation, so full 10–15 minute production should be handled as many stitched scenes, not one monolithic generation job.

Output
{
"scene_id": "scene_014",
"video_segment_url": "s3://...",
"duration_sec": 19.5,
"render_cost_usd": 0.92
}
7.10 Timeline compositor
Requirements

Assemble all segments in order

Align with narration timestamps

Add:

subtle background music

transition SFX

bubble pop sounds

occasional text bubbles

final CTA slate

Render:

16:9 master

subtitles file

metadata pack

Final CTA

End with a soft but clear subscribe ask:

“If you want more stories like this, subscribe.”

“Subscribe for more animated deep dives.”

“New explainers every week—subscribe now.”

7.11 Cost tracking engine
Requirements

Track cost by:

search/research

LLM script generation

TTS

image generation

video generation

storage

render time

human review time

Output dashboard

cost per video

cost per finished minute

cost per scene

regeneration waste

cheapest/most expensive topic types

estimated ROI proxy

Example
{
"project_id": "vid_2026_03_10_001",
"total_cost_usd": 18.42,
"breakdown": {
"research": 1.20,
"script": 0.88,
"tts": 4.82,
"images": 3.40,
"scene_video": 7.10,
"render": 1.02
},
"cost_per_finished_minute": 1.53
} 8. Suggested system architecture
Frontend

Next.js dashboard

project list

topic board

script review

scene review

cost dashboard

render queue

output preview

Backend

Node.js or Python orchestration service

queue workers

API adapters

asset storage service

metadata database

Database

Postgres for structured data

object store for audio/image/video assets

Redis for job queue and caching

Workers

channel analysis worker

trend discovery worker

research worker

script worker

TTS worker

scene planning worker

image generation worker

video generation worker

composition worker

analytics worker

APIs / integrations

YouTube Data / scraping layer

Google Trends API or Trends scrape layer

search API

LLM provider

ElevenLabs

Gemini image / Nano Banana

Kling or equivalent image-to-video

ffmpeg render layer

9. Core database schema
   Tables

projects

channels

channel_videos

trend_topics

research_docs

scripts

script_sections

voiceovers

scenes

scene_frames

scene_videos

renders

cost_events

style_bibles

brand_assets

qa_reviews

Important fields
projects

id

title

niche

status

target_runtime_sec

selected_topic

total_cost_usd

created_at

scenes

id

project_id

order_index

start_sec

end_sec

purpose

scene_type

start_prompt

end_prompt

motion_notes

bubble_text

consistency_score

cost_events

id

project_id

stage

vendor

units

unit_cost

total_cost

created_at

10. Quality scoring
    10.1 Script quality score

hook strength

curiosity gap

clarity

emotional pacing

novelty

source confidence

visualizability

10.2 Visual quality score

style consistency

character consistency

prompt adherence

frame readability

scene continuity

10.3 Video quality score

narration sync

pacing smoothness

transition quality

dead-air risk

CTA quality

Regeneration rules

Auto-regenerate if:

script score < 80

visual consistency < 85

narration alignment < 95

cost overrun > configured budget

11. Editorial safety and trust layer
    Requirements

Mark unsupported claims

flag medical/political/financial claims for mandatory review

store citations per section

keep revision history

block export if confidence too low

Reason

If the platform pivots to “latest news” explainers, factual drift becomes the biggest failure point.

12. Prompting strategy
    12.1 Master system prompts

Create versioned prompts for:

topic scout

research synthesizer

viral script architect

scene planner

art director

frame prompt generator

QA reviewer

12.2 Scene prompt template
Use the channel style bible v3.

Create a 2D editorial explainer frame.
Scene purpose: {purpose}
Narration excerpt: {excerpt}
Scene type: {scene_type}
Visual metaphor: {metaphor}
Characters: {character_notes}
Background density: medium
Text on screen: minimal
Speech bubble: {bubble_text}
Palette: {palette}
Negative prompts: photorealistic, 3D, anime, painterly, cluttered, inconsistent anatomy

Generate START FRAME only.

A matching END FRAME template uses the same scene state plus progression notes.

13. MVP scope
    v1 MVP

reference channel analyzer

trend intake

research pack generation

long-form script generation

ElevenLabs narration

scene planner

first frame + end frame generation

manual export of all assets

cost dashboard

v1.5

automatic scene video generation

auto-composition

subtitle generation

thumbnail suggestion engine

v2

feedback loop from published YouTube performance

topic recommender trained on actual channel performance

automated title/thumbnail variants

publish workflow

14. Key success metrics
    Production metrics

average cost per 10-minute video

average generation time

regeneration rate

scene failure rate

Content metrics

average view duration

first 30-second retention

click-through rate

percentage viewed

subscribers gained per 1,000 views

YouTube’s own analytics framework emphasizes retention and key moments as core indicators of what’s working.

15. Recommended implementation notes for Claude Code
    Engineering guidance

Use a job-based architecture from day one

keep every generation step idempotent

make all prompts versioned and editable

treat style bible as a first-class dependency

store every API request/response summary for auditability

render scene assets independently so failures don’t kill the full project

use ffmpeg for deterministic final assembly

expose a “regenerate scene only” button

expose a “rewrite section only” button

Folder structure
/apps/web
/apps/api
/packages/core
/packages/prompts
/packages/style-system
/packages/integrations
/packages/render
/packages/analytics
Integration wrappers
integrations/
youtube/
trends/
search/
llm/
elevenlabs/
gemini_image/
kling/
storage/ 16. What Claude Code should build first

project creation flow

channel scraper/analyzer

trend discovery worker

research pack pipeline

script generator with review UI

TTS generation

scene planner

frame generation

cost ledger

asset export bundle

17. Final product positioning

This should be positioned internally as:

“A scalable AI-native animated edutainment studio OS.”

Not:

“a guaranteed viral machine”

“a clone tool”

“a fully autonomous publisher”

The practical edge is:

faster topic selection

stronger scripting process

consistent visual language

cheaper long-form production

reusable scene system

measurable unit economics

If you want, I can turn this next into a proper PRD + technical architecture doc + Claude Code task breakdown in one clean handoff format.

yeah sure.

Perfect. Here’s a clean handoff package you can give to Claude Code.

Project Atlas
PRD + Technical Architecture + Claude Code Build Plan

1. Executive Summary

Project Atlas is an AI-native content production platform for generating 10–15 minute long-form animated edutainment YouTube videos at scale.

The system identifies high-potential topics, researches them, writes a long-form viral-optimized script, generates narration, creates visually consistent scene directions in a fixed 2D channel style, generates start and end frames for each scene, optionally animates those scenes into clips, assembles the full video, and tracks production costs.

The product is designed to behave like an internal automated animation studio OS for a YouTube content operation.

It should optimize for:

topic selection quality

retention-oriented scripts

stylistic consistency

production repeatability

low cost per finished minute

high human editability

It should not claim to guarantee virality.

2. Product Vision

Create a platform that allows one operator to produce premium long-form animated explainers with the consistency of a professional studio, but with AI-driven speed and scale.

The system should let the user go from:

idea → research → script → voiceover → scene plan → frames → animation → final video

with as little manual work as possible.

3. Product Objectives
   Primary objectives

Generate high-quality long-form edutainment videos

Standardize channel visual identity

Reduce production time dramatically

Support repeatable large-scale publishing

Keep costs measurable at every stage

Secondary objectives

Learn from historical output quality

Create reusable scene/prompt templates

Improve topic selection over time

Improve visual style consistency over time

4. Target User
   Primary user

Founder/operator running one or more faceless educational/infotainment YouTube channels.

Secondary users

script reviewer

creative director

editor

QA/fact checker

motion/animation reviewer

5. User Problems

The user currently faces these bottlenecks:

finding topics with strong view potential

doing enough research quickly

writing long scripts that hold retention

maintaining style consistency across many videos

creating enough scenes for long-form animation

turning scripts into scene plans

keeping production costs low and visible

scaling output without hiring a full animation team

6. Product Scope
   In scope

reference channel intelligence

trend/topic discovery

research synthesis

long-form script generation

voiceover generation

scene segmentation

style-bible-driven frame generation

optional scene animation

full video assembly

asset management

cost accounting

review and regeneration workflows

Out of scope for MVP

automatic publishing to YouTube

closed-loop performance optimization based on YouTube analytics

full autonomous thumbnail generation/testing

full character rigging engine

exact cloning of any existing channel’s art style

7. Functional Overview
   Pipeline

Analyze reference channels

Identify trending/high-opportunity topics

Research topic deeply

Produce long-form outline

Generate full script

Generate narration audio

Split narration into timed scene blocks

Produce style-consistent start and end frames for each scene

Optionally animate scene clips

Stitch scenes into final video

Export assets and cost report

8. PRD
   8.1 Core Features
   Feature A: Reference Channel Analysis

The app should let the user input a list of YouTube channels to study.

It should:

fetch videos

sort/analyze by views

identify title patterns

identify topic clusters

identify runtime clusters

identify recurring narrative patterns

identify visual storytelling patterns

create a reusable “channel reference profile”

Inputs

YouTube channel URLs

optional niche tags

Outputs

top videos by view count

topic clusters

title formulas

runtime distribution

content pattern notes

Feature B: Topic Discovery Engine

The app should discover topics with strong long-form edutainment potential.

It should combine:

search trends

recent news

emerging internet discussion

evergreen topic potential

visual storytelling potential

controversy/surprise factor

factual density

Requirements

daily refreshable topic pipeline

topic opportunity scoring

duplicate topic detection

user ability to approve/reject topics

Output example

topic title

why it may work

likely audience appeal

likely thumbnail angle

likely runtime viability

Feature C: Research Engine

The app should research a topic deeply enough to support a 10–15 minute script.

It should:

gather sources

summarize the topic

extract timelines

identify interesting facts

find tension/conflict/curiosity hooks

structure knowledge into a reusable story pack

assign confidence to claims

Output

research brief

key facts

story angles

claim-evidence map

important citations

red flags / weak claims

Feature D: Script Generator

The app should generate scripts optimized for long-form viewer retention.

The script must:

start with a powerful hook

create curiosity early

escalate stakes

explain clearly

avoid boring exposition blocks

end with a subscribe CTA

include scene markers

include timing estimates

Script structure

title options

hook options

outline

full voiceover script

CTA

scene segmentation guidance

Requirements

multiple script variants

script scoring

one-click regeneration of weak sections

sentence/paragraph level timing estimation

Feature E: Voiceover Generation

The app should generate human-like narration from the selected script.

Requirements

use ElevenLabs or similar

selected female narrator profile

emotional modulation support

pause and emphasis support

sentence timestamps

subtitle file generation

Outputs

narration audio file

timestamped transcript

subtitles

cost log

Feature F: Style Bible and Art Direction System

The app should have a persistent visual identity layer.

This is a core system, not a side feature.

It should store:

palette

line style

character rules

composition rules

background density rules

bubble/speech text rules

motion style rules

negative prompts

visual references

prompt primitives

All generated scenes must reference this style system.

Feature G: Scene Planning Engine

The app should split the voiceover into scenes and decide how each segment should be visualized.

For each scene it should generate:

scene purpose

narration span

scene type

visual concept

start frame prompt

end frame prompt

motion notes

bubble text if necessary

continuity notes

Scene types

character explanation

map scene

infographic scene

comparison scene

metaphor scene

timeline scene

reaction scene

dramatic reveal scene

Feature H: Image Generation

The app should generate two visual states for every scene:

start frame

end frame

These must:

follow the style bible

match the script content

preserve character consistency where relevant

preserve channel aesthetic consistency

Requirements

prompt versioning

seed storage if available

regeneration support

style consistency scoring

scene review UI

Feature I: Animation Engine

Optional in MVP-lite, required in later phase.

The app should turn scene start and end frames into short animated sequences.

Requirements

accept start and end images

use motion prompt

target duration based on narration segment

output per-scene clip

support fallback non-generative motion

Fallback motion system

If the generative scene animation fails, use:

pan/zoom

parallax

masked movement

bubble pop-in

layered transitions

Feature J: Video Composer

The app should assemble:

scene clips or frame-based motion

narration

SFX

music

transitions

final CTA

Outputs

final 16:9 video

subtitles

project asset bundle

metadata bundle

Feature K: Cost Tracking

The system must track cost at every stage.

Cost dimensions

search/research

LLM usage

TTS usage

image generation

video generation

rendering

storage

regeneration waste

Dashboard

total cost per project

cost per minute

cost per scene

vendor-level breakdown

generation history

9. Success Metrics
   Product metrics

average project completion time

average human edits per video

frame regeneration rate

script rewrite rate

cost per finished minute

scene generation success rate

Content quality proxies

script quality score

visual consistency score

factual confidence score

pacing score

review approval score

Later business metrics

view velocity

CTR

retention

subscriber conversion

RPM/ROI

10. Non-Functional Requirements
    Performance

project creation should feel responsive

background jobs should be queue-based

large projects should resume safely after failures

Scalability

must handle many concurrent projects

scene generation must be parallelizable

storage must support many heavy media files

Reliability

all steps must be resumable

every external call should be logged

job retries should be supported

Security

store API keys securely

role-based access for operators/reviewers

signed URLs for media access

audit trail for generation history

Observability

logs for every pipeline stage

metrics for success/failure per vendor

cost telemetry

duration telemetry

11. UX Requirements
    Main dashboard

projects list

create new project

status board

recent renders

total costs

Project workspace

Tabs:

topic

research

script

voice

scenes

frames

animation

final render

costs

Required controls

approve/reject topic

regenerate research

rewrite section

regenerate scene

lock style

lock narrator

export project

12. System Architecture
    12.1 Recommended stack
    Frontend

Next.js

TypeScript

Tailwind

React Query

shadcn/ui

Backend

Node.js with TypeScript
or

Python for orchestration-heavy backend

Recommended:

Next.js frontend

Node.js/TypeScript API

Python worker services only where needed

Storage

Postgres

Redis

S3-compatible blob storage

Queue system

BullMQ or Temporal

Media tooling

ffmpeg

image processing tools

waveform/timestamp utilities

12.2 Services
API service

Handles:

auth

project CRUD

review flows

metadata storage

orchestration triggers

Orchestrator

Handles:

pipeline state

job sequencing

retries

dependency resolution

Workers

channel analysis worker

topic discovery worker

research worker

script worker

TTS worker

scene planner worker

image generation worker

animation worker

composer worker

analytics/cost worker

13. Data Model
    Main entities
    Project
    type Project = {
    id: string
    title: string
    niche: string
    status: 'draft' | 'researching' | 'scripting' | 'voicing' | 'scene_planning' | 'rendering' | 'complete' | 'failed'
    selectedTopicId?: string
    selectedScriptId?: string
    styleBibleId: string
    targetRuntimeSec: number
    totalCostUsd: number
    createdAt: string
    updatedAt: string
    }
    Topic
    type Topic = {
    id: string
    projectId: string
    title: string
    summary: string
    opportunityScore: number
    visualStorytellingScore: number
    evergreenScore: number
    trendScore: number
    status: 'candidate' | 'approved' | 'rejected'
    }
    ResearchBrief
    type ResearchBrief = {
    id: string
    projectId: string
    topicId: string
    summary: string
    keyFacts: string[]
    storyAngles: string[]
    claims: Claim[]
    sources: SourceRef[]
    confidenceScore: number
    }
    Script
    type Script = {
    id: string
    projectId: string
    outline: string
    fullText: string
    estimatedDurationSec: number
    qualityScore: number
    status: 'draft' | 'approved' | 'rejected'
    }
    ScriptSection
    type ScriptSection = {
    id: string
    scriptId: string
    orderIndex: number
    sectionType: string
    text: string
    estimatedDurationSec: number
    sourceRefs: string[]
    }
    Voiceover
    type Voiceover = {
    id: string
    projectId: string
    scriptId: string
    vendor: string
    voiceId: string
    audioUrl: string
    durationSec: number
    subtitleUrl?: string
    costUsd: number
    }
    Scene
    type Scene = {
    id: string
    projectId: string
    scriptSectionId?: string
    orderIndex: number
    narrationStartSec: number
    narrationEndSec: number
    purpose: string
    sceneType: string
    startPrompt: string
    endPrompt: string
    motionNotes: string
    bubbleText?: string
    continuityNotes?: string
    consistencyScore?: number
    }
    SceneFrame
    type SceneFrame = {
    id: string
    sceneId: string
    frameType: 'start' | 'end'
    imageUrl: string
    prompt: string
    seed?: string
    qualityScore?: number
    costUsd: number
    }
    SceneClip
    type SceneClip = {
    id: string
    sceneId: string
    videoUrl: string
    durationSec: number
    costUsd: number
    }
    CostEvent
    type CostEvent = {
    id: string
    projectId: string
    stage: string
    vendor: string
    units: number
    totalCostUsd: number
    metadata?: Record<string, any>
    createdAt: string
    }
14. Pipeline State Machine
    Project lifecycle
    draft
    → topic_discovery
    → topic_selected
    → researching
    → research_ready
    → scripting
    → script_selected
    → voicing
    → voice_ready
    → scene_planning
    → frame_generation
    → animation_generation
    → composition
    → review
    → complete
    Failure states

topic_failed

research_failed

script_failed

tts_failed

frame_failed

animation_failed

composition_failed

Each stage must support:

retry

partial resume

manual override

15. API Design
    Project APIs

POST /projects

GET /projects

GET /projects/:id

PATCH /projects/:id

DELETE /projects/:id

Topic APIs

POST /projects/:id/discover-topics

GET /projects/:id/topics

POST /topics/:id/approve

POST /topics/:id/reject

Research APIs

POST /projects/:id/research

GET /projects/:id/research

Script APIs

POST /projects/:id/generate-scripts

GET /projects/:id/scripts

POST /scripts/:id/approve

POST /scripts/:id/rewrite-section

Voice APIs

POST /projects/:id/generate-voice

GET /projects/:id/voiceover

Scene APIs

POST /projects/:id/plan-scenes

GET /projects/:id/scenes

POST /scenes/:id/regenerate

Frame APIs

POST /projects/:id/generate-frames

GET /scenes/:id/frames

Animation APIs

POST /projects/:id/generate-scene-clips

GET /scenes/:id/clip

Composition APIs

POST /projects/:id/render

GET /projects/:id/render

Cost APIs

GET /projects/:id/costs

GET /analytics/cost-summary

16. Internal Modules
    youtube-intelligence

Responsibilities:

ingest channels

fetch channel videos

rank top videos

cluster topics

extract title formulas

topic-engine

Responsibilities:

gather trend signals

rank topics

generate opportunity score

research-engine

Responsibilities:

perform search

collect sources

summarize facts

generate claim maps

script-engine

Responsibilities:

generate hooks

generate outlines

generate scripts

score scripts

voice-engine

Responsibilities:

call TTS

manage voice profiles

align timestamps

style-engine

Responsibilities:

load style bible

inject style constraints into scene prompts

check style consistency

scene-engine

Responsibilities:

split script/audio into scenes

generate scene prompts

create motion notes

image-engine

Responsibilities:

generate start/end frames

store prompts/results

score quality

animation-engine

Responsibilities:

generate motion clips

fallback to deterministic motion

normalize durations

render-engine

Responsibilities:

combine audio/video/text/SFX

export final video

cost-engine

Responsibilities:

capture every vendor call

compute project cost and unit economics

17. Style Bible Spec

Claude Code should build the style system as a structured asset.

Files
/style-bibles/default/
style_bible.md
palette.json
character_rules.json
scene_templates.json
motion_rules.json
prompt_primitives.json
negative_prompts.json
speech_bubble_rules.json
Example palette.json
{
"primary": ["#2E5BFF", "#0F172A", "#F8FAFC"],
"accent": ["#FFB703", "#FB7185", "#34D399"],
"backgroundModes": {
"clean_light": ["#F8FAFC", "#E2E8F0"],
"dramatic_dark": ["#0F172A", "#1E293B"]
}
}
Example character_rules.json
{
"silhouette": "rounded_geometric",
"proportions": "simplified_3_head_ratio",
"eyes": "minimal",
"hands": "gesture_readable_simplified",
"expressionStyle": "clear_not_hyper_detailed",
"forbidden": ["photorealism", "anime_style", "realistic_skin_texture"]
} 18. Scene Generation Logic
Scene segmentation rule

A new scene should be created when any of these happens:

a new core idea begins

a visual metaphor changes

emotional tone shifts

narration crosses target duration threshold

explanation requires a new composition type

Target scene duration

average: 6 to 14 seconds

longer only when content is visually rich or dramatic

avoid static scene lengths

Scene creation algorithm

For each script section:

estimate duration

identify major visual beats

split into scene-worthy units

label scene type

generate start/end state prompts

attach motion and continuity notes

19. Quality Scoring Design
    Script quality score

Components:

hook strength

clarity

novelty

escalation

fact support

visualizability

CTA quality

Visual score

Components:

style match

prompt adherence

scene readability

continuity with prior scene

character consistency

Timeline quality score

Components:

sync accuracy

pacing

silence gaps

transition smoothness

viewer fatigue risk

20. Error Handling
    Principles

fail gracefully

preserve partial work

never discard previous good output automatically

Example failures

search API timeout

source conflict

script too short

TTS generation failure

image generation style drift

animation API failure

render composition failure

Required behavior

log the failure

expose a readable error

allow retry at stage level

allow manual fallback

21. Claude Code Task Breakdown

Here is the actual build order Claude Code should follow.

Phase 1: Foundation
Task 1

Initialize monorepo with:

web app

api app

worker app

shared package

Task 2

Set up:

Postgres schema

Prisma or Drizzle

Redis

storage adapter

env management

logging

Task 3

Create auth and basic dashboard shell

Phase 2: Project and Topic Flow
Task 4

Build project CRUD

Task 5

Build topic discovery data model and UI

Task 6

Build reference channel ingestion module

Task 7

Build topic scoring engine

Task 8

Add topic approval workflow

Phase 3: Research and Script
Task 9

Build research pipeline abstraction

Task 10

Build research brief UI

Task 11

Build script generation module

Task 12

Build script comparison and approval UI

Task 13

Build section rewrite action

Phase 4: Voice and Scene Planning
Task 14

Integrate ElevenLabs

Task 15

Store transcript timestamps

Task 16

Build scene planning engine

Task 17

Build scenes review UI

Phase 5: Style System and Frames
Task 18

Implement style bible storage and loader

Task 19

Implement prompt templating system

Task 20

Build frame generation adapter

Task 21

Build frame review/regeneration UI

Phase 6: Animation and Rendering
Task 22

Implement scene clip generation adapter

Task 23

Build fallback animation generator

Task 24

Build ffmpeg composition pipeline

Task 25

Build final render page

Phase 7: Costs and Analytics
Task 26

Track cost events across all modules

Task 27

Build cost dashboard

Task 28

Build project export bundle

22. Claude Code Prompt You Can Paste Directly

Use this as the actual prompt for Claude Code:

Build a production-grade MVP for an internal tool called Project Atlas.

Project Atlas is an AI-native pipeline for generating long-form animated edutainment YouTube videos.

Tech requirements:

- Next.js + TypeScript frontend
- Node.js/TypeScript backend
- Postgres database
- Redis queue
- S3-compatible file storage
- clean modular architecture
- full environment variable support
- strong typing across shared packages

Core workflow:

1. user creates a project
2. app analyzes reference YouTube channels and stores top-video patterns
3. app discovers candidate topics and scores them
4. user approves a topic
5. app researches the topic and stores a research brief
6. app generates multiple long-form scripts and scores them
7. user approves one script
8. app generates narration audio through a TTS provider and stores timestamps
9. app splits script/audio into scenes
10. app generates a start frame and end frame for each scene using a style-bible-driven prompt system
11. app stores scenes, prompts, generated assets, and costs
12. app optionally creates scene clips later
13. app renders a final composed video later

Build the MVP first with these features:

- project CRUD
- topic discovery workflow
- research brief workflow
- script generation and approval
- TTS generation
- scene planning
- frame generation
- cost tracking
- clean dashboard UI

Architecture requirements:

- use a monorepo structure
- create packages for shared types, DB, integrations, prompts, and style systems
- create worker-driven background jobs for long-running stages
- make every stage resumable and retryable
- add logs and structured error handling
- store every generated artifact in the database or object storage with references

Data model requirements:
Include entities for Project, Topic, ResearchBrief, Script, ScriptSection, Voiceover, Scene, SceneFrame, SceneClip, Render, CostEvent, StyleBible.

UI requirements:

- dashboard page
- project details page
- tabs for topic, research, script, voice, scenes, frames, costs
- status badges and generation buttons
- approval actions
- regeneration actions

Code quality requirements:

- clean folder structure
- comments only where useful
- no fake implementations hidden as complete
- use interfaces/adapters for third-party services
- provide mock providers for local development
- generate seed data and example style bible files

Deliverables:

- full codebase
- setup instructions
- env.example
- README
- migration files
- sample seed script
- sample project flow

23. Recommended Repo Structure
    project-atlas/
    apps/
    web/
    api/
    workers/
    packages/
    db/
    shared/
    ui/
    prompts/
    style-system/
    integrations/
    media/
    analytics/
    infra/
    docker/
    scripts/
    style-bibles/
    default/
    docs/
    prd.md
    architecture.md
    api-spec.md
    worker-flows.md
24. MVP Milestone Definition

The MVP is complete when a user can:

create a project

add reference channels

generate and approve a topic

generate and approve a research brief

generate and approve a script

generate narration

generate a scene plan

generate start and end frames for scenes

see costs

export the full asset bundle

That is the first meaningful usable version.

25. Recommended v2 Additions

After MVP:

thumbnail ideation engine

title testing engine

full animation engine

publish-to-YouTube integration

analytics feedback loop

multi-channel style profiles

historical learning on topics/scripts/scenes
