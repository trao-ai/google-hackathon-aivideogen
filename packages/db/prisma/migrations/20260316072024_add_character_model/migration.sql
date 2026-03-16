-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "selectedCharacterId" TEXT;

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "prompt" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'Female',
    "ageStyle" TEXT NOT NULL DEFAULT 'Adult',
    "emotion" TEXT NOT NULL DEFAULT 'Friendly',
    "appearance" TEXT NOT NULL DEFAULT 'Illustration',
    "useInScenes" BOOLEAN NOT NULL DEFAULT true,
    "useAsNarrator" BOOLEAN NOT NULL DEFAULT false,
    "animateExpressions" BOOLEAN NOT NULL DEFAULT true,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
