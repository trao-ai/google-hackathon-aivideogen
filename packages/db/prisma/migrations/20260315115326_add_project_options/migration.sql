-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "platform" TEXT,
ADD COLUMN     "toneKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "videoStyle" TEXT,
ADD COLUMN     "videoType" TEXT;
