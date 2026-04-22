-- AlterTable
ALTER TABLE "user" ADD COLUMN     "ai_use_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ai_use_window_date" TIMESTAMP(3),
ADD COLUMN     "last_ai_used_at" TIMESTAMP(3);
