/*
  Warnings:

  - Made the column `platform` on table `projects` required. This step will fail if there are existing NULL values in that column.

*/
-- Update NULL values to 'youtube' before making column required
UPDATE "projects" SET "platform" = 'youtube' WHERE "platform" IS NULL;

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "platform" SET NOT NULL,
ALTER COLUMN "platform" SET DEFAULT 'youtube';
