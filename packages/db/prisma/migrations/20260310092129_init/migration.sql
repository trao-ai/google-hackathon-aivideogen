-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "targetRuntimeSec" INTEGER NOT NULL DEFAULT 750,
    "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "styleBibleId" TEXT,
    "selectedTopicId" TEXT,
    "selectedScriptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_profiles" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "channelUrl" TEXT NOT NULL,
    "topTopics" TEXT[],
    "titlePatterns" TEXT[],
    "runtimeRangeMinutes" DOUBLE PRECISION[],
    "visualTraits" TEXT[],
    "publishCadence" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "opportunityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "visualStorytellingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evergreenScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "curiosityGapScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "factDensityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thumbnailAngle" TEXT,
    "likelyAudienceAppeal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_briefs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "background" TEXT,
    "currentDevelopments" TEXT,
    "surprisingFacts" TEXT[],
    "controversies" TEXT,
    "stakes" TEXT,
    "timeline" TEXT[],
    "keyFacts" TEXT[],
    "storyAngles" TEXT[],
    "claims" JSONB NOT NULL DEFAULT '[]',
    "sources" JSONB NOT NULL DEFAULT '[]',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "titleCandidates" TEXT[],
    "thumbnailAngles" TEXT[],
    "outline" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "estimatedDurationSec" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_sections" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "sectionType" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "estimatedDurationSec" INTEGER NOT NULL DEFAULT 0,
    "sourceRefs" TEXT[],

    CONSTRAINT "script_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voiceovers" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "segments" JSONB NOT NULL DEFAULT '[]',
    "subtitleUrl" TEXT,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voiceovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scriptSectionId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "narrationStartSec" DOUBLE PRECISION NOT NULL,
    "narrationEndSec" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "sceneType" TEXT NOT NULL,
    "startPrompt" TEXT NOT NULL,
    "endPrompt" TEXT NOT NULL,
    "motionNotes" TEXT NOT NULL,
    "bubbleText" TEXT,
    "continuityNotes" TEXT,
    "consistencyScore" DOUBLE PRECISION,
    "estimatedCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_frames" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "frameType" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "seed" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "styleMatchScore" DOUBLE PRECISION,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_frames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_clips" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renders" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "videoUrl" TEXT,
    "subtitleUrl" TEXT,
    "durationSec" DOUBLE PRECISION,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_events" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "units" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "style_bibles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "visualMission" TEXT NOT NULL,
    "emotionalTone" TEXT NOT NULL,
    "narrativeStance" TEXT NOT NULL,
    "palette" JSONB NOT NULL,
    "characterRules" JSONB NOT NULL,
    "lineWeights" TEXT NOT NULL,
    "textureRules" TEXT NOT NULL,
    "shadowRules" TEXT NOT NULL,
    "backgroundDensity" TEXT NOT NULL,
    "motionRules" TEXT NOT NULL,
    "bubbleRules" TEXT NOT NULL,
    "negativePrompts" TEXT[],
    "promptPrimitives" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "style_bibles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scene_clips_sceneId_key" ON "scene_clips"("sceneId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_styleBibleId_fkey" FOREIGN KEY ("styleBibleId") REFERENCES "style_bibles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_profiles" ADD CONSTRAINT "channel_profiles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_briefs" ADD CONSTRAINT "research_briefs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_briefs" ADD CONSTRAINT "research_briefs_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_sections" ADD CONSTRAINT "script_sections_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voiceovers" ADD CONSTRAINT "voiceovers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voiceovers" ADD CONSTRAINT "voiceovers_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "scripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_scriptSectionId_fkey" FOREIGN KEY ("scriptSectionId") REFERENCES "script_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_frames" ADD CONSTRAINT "scene_frames_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_clips" ADD CONSTRAINT "scene_clips_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renders" ADD CONSTRAINT "renders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_events" ADD CONSTRAINT "cost_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
