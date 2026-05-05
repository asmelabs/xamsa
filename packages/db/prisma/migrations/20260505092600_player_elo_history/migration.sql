-- AlterTable
ALTER TABLE "player" ADD COLUMN "elo_rating_before" INTEGER;
ALTER TABLE "player" ADD COLUMN "elo_rating_after" INTEGER;
ALTER TABLE "player" ADD COLUMN "elo_delta" INTEGER;
