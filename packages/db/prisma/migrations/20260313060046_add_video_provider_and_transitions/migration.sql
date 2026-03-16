-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "videoProvider" TEXT NOT NULL DEFAULT 'kling';

-- AlterTable
ALTER TABLE "scenes" ADD COLUMN     "transitionPlan" JSONB;
