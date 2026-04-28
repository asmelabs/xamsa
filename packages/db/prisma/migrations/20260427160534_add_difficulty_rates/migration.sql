-- AlterTable
ALTER TABLE "pack" ADD COLUMN     "pdr" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
ADD COLUMN     "pdr_updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "player" ADD COLUMN     "elo_at_game_start" INTEGER;

-- AlterTable
ALTER TABLE "question" ADD COLUMN     "qdr" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
ADD COLUMN     "qdr_elo_equiv" DOUBLE PRECISION NOT NULL DEFAULT 1000,
ADD COLUMN     "qdr_scored_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qdr_updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "topic" ADD COLUMN     "tdr" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
ADD COLUMN     "tdr_updated_at" TIMESTAMP(3);
