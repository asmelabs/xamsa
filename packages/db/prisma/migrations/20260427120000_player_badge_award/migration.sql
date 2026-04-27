-- CreateTable
CREATE TABLE "player_badge_award" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "player_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "game_topic_id" TEXT,
    "game_question_id" TEXT,

    CONSTRAINT "player_badge_award_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_badge_award_player_id_idx" ON "player_badge_award"("player_id");

-- CreateIndex
CREATE INDEX "player_badge_award_badge_id_earned_at_idx" ON "player_badge_award"("badge_id", "earned_at");

-- CreateIndex
CREATE INDEX "player_badge_award_player_id_badge_id_idx" ON "player_badge_award"("player_id", "badge_id");

-- AddForeignKey
ALTER TABLE "player_badge_award" ADD CONSTRAINT "player_badge_award_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "player_badge_award" ADD CONSTRAINT "player_badge_award_game_topic_id_fkey" FOREIGN KEY ("game_topic_id") REFERENCES "game_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "player_badge_award" ADD CONSTRAINT "player_badge_award_game_question_id_fkey" FOREIGN KEY ("game_question_id") REFERENCES "game_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "player" DROP COLUMN "achievements";
