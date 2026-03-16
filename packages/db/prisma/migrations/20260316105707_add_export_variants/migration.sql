-- CreateTable
CREATE TABLE "export_variants" (
    "id" TEXT NOT NULL,
    "renderId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "videoUrl" TEXT,
    "durationSec" DOUBLE PRECISION,
    "fileSizeBytes" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "step" TEXT,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_variants_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "export_variants" ADD CONSTRAINT "export_variants_renderId_fkey" FOREIGN KEY ("renderId") REFERENCES "renders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
