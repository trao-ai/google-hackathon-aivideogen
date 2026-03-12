-- AlterTable
ALTER TABLE "renders" ADD COLUMN     "step" TEXT;

-- AlterTable
ALTER TABLE "scenes" ADD COLUMN     "clipStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "frameStatus" TEXT NOT NULL DEFAULT 'pending';
