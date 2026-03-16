-- CreateTable
CREATE TABLE "caption_settings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "font" TEXT NOT NULL DEFAULT 'Arial',
    "fontSize" INTEGER NOT NULL DEFAULT 7,
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "textOpacity" INTEGER NOT NULL DEFAULT 100,
    "bgColor" TEXT NOT NULL DEFAULT '#000000',
    "bgOpacity" INTEGER NOT NULL DEFAULT 80,
    "position" TEXT NOT NULL DEFAULT 'bottom',
    "template" TEXT NOT NULL DEFAULT 'standard',
    "highlightKeywords" BOOLEAN NOT NULL DEFAULT false,
    "targetLanguage" TEXT NOT NULL DEFAULT 'en',
    "burnInCaptions" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caption_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "caption_settings_projectId_key" ON "caption_settings"("projectId");

-- AddForeignKey
ALTER TABLE "caption_settings" ADD CONSTRAINT "caption_settings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
