-- AlterTable
ALTER TABLE "game" ADD COLUMN "total_host_skipped_questions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "click" ADD COLUMN "qdr_elo_equiv_delta" DOUBLE PRECISION;
