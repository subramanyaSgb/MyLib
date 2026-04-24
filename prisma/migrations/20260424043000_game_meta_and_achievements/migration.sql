-- AlterTable
ALTER TABLE "Game" ADD COLUMN "dev" TEXT;
ALTER TABLE "Game" ADD COLUMN "genre" TEXT;
ALTER TABLE "Game" ADD COLUMN "tagsJson" TEXT;

-- AlterTable
ALTER TABLE "OwnedCopy" ADD COLUMN "achievementsTotal" INTEGER;
ALTER TABLE "OwnedCopy" ADD COLUMN "achievementsUnlocked" INTEGER;
