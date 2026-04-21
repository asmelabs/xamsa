-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('waiting', 'active', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('spectating', 'playing', 'kicked', 'left');

-- CreateEnum
CREATE TYPE "ClickStatus" AS ENUM ('pending', 'correct', 'wrong', 'expired');

-- CreateEnum
CREATE TYPE "GameQuestionStatus" AS ENUM ('pending', 'active', 'answered', 'revealed', 'skipped');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "elo" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lowest_elo" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "peak_elo" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "total_correct_answers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_expired_answers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_first_clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_games_hosted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_games_played" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_games_spectated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_incorrect_answers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_last_places" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_packs_published" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_podiums" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_points_earned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_questions_played" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_time_spent_hosting" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_time_spent_playing" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_time_spent_spectating" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_topics_played" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_wins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "game" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "code" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'waiting',
    "host_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "current_round_order" INTEGER,
    "current_topic_order" INTEGER,
    "current_question_order" INTEGER,
    "is_question_revealed" BOOLEAN NOT NULL DEFAULT false,
    "total_active_players" INTEGER NOT NULL DEFAULT 0,
    "total_spectators" INTEGER NOT NULL DEFAULT 0,
    "total_topics" INTEGER NOT NULL DEFAULT 0,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "total_skipped_questions" INTEGER NOT NULL DEFAULT 0,
    "total_answers" INTEGER NOT NULL DEFAULT 0,
    "total_correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "total_expired_answers" INTEGER NOT NULL DEFAULT 0,
    "total_points_awarded" INTEGER NOT NULL DEFAULT 0,
    "total_points_deducted" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER,
    "winner_id" TEXT,

    CONSTRAINT "game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_settings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "game_id" TEXT NOT NULL,
    "allow_later_joins" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "game_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "status" "PlayerStatus" NOT NULL DEFAULT 'spectating',
    "nickname" TEXT,
    "game_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "peak_score" INTEGER NOT NULL DEFAULT 0,
    "lowest_score" INTEGER NOT NULL DEFAULT 0,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "expired_clicks" INTEGER NOT NULL DEFAULT 0,
    "first_clicks" INTEGER NOT NULL DEFAULT 0,
    "last_clicks" INTEGER NOT NULL DEFAULT 0,
    "fastest_click_ms" INTEGER,
    "average_click_ms" DOUBLE PRECISION,
    "current_correct_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_correct_streak" INTEGER NOT NULL DEFAULT 0,
    "current_wrong_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_wrong_streak" INTEGER NOT NULL DEFAULT 0,
    "topics_played" INTEGER NOT NULL DEFAULT 0,
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL,
    "answered_at" TIMESTAMP(3),
    "status" "ClickStatus" NOT NULL DEFAULT 'pending',
    "player_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "reaction_ms" INTEGER,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_topic" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "game_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "total_questions_answered" INTEGER NOT NULL DEFAULT 0,
    "total_questions_skipped" INTEGER NOT NULL DEFAULT 0,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "total_correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "total_expired_clicks" INTEGER NOT NULL DEFAULT 0,
    "total_points_awarded" INTEGER NOT NULL DEFAULT 0,
    "total_points_deducted" INTEGER NOT NULL DEFAULT 0,
    "top_scorer_id" TEXT,
    "top_scorer_points" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER,

    CONSTRAINT "game_topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_question" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "game_topic_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "status" "GameQuestionStatus" NOT NULL DEFAULT 'pending',
    "was_revealed" BOOLEAN NOT NULL DEFAULT false,
    "was_skipped" BOOLEAN NOT NULL DEFAULT false,
    "winner_id" TEXT,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "total_correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "total_expired_clicks" INTEGER NOT NULL DEFAULT 0,
    "first_buzz_ms" INTEGER,
    "duration_seconds" INTEGER,

    CONSTRAINT "game_question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_code_key" ON "game"("code");

-- CreateIndex
CREATE UNIQUE INDEX "game_winner_id_key" ON "game"("winner_id");

-- CreateIndex
CREATE INDEX "game_code_idx" ON "game"("code");

-- CreateIndex
CREATE INDEX "game_status_idx" ON "game"("status");

-- CreateIndex
CREATE INDEX "game_host_id_idx" ON "game"("host_id");

-- CreateIndex
CREATE INDEX "game_pack_id_idx" ON "game"("pack_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_settings_game_id_key" ON "game_settings"("game_id");

-- CreateIndex
CREATE INDEX "player_game_id_idx" ON "player"("game_id");

-- CreateIndex
CREATE INDEX "player_game_id_score_idx" ON "player"("game_id", "score");

-- CreateIndex
CREATE INDEX "player_user_id_idx" ON "player"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_user_id_game_id_key" ON "player"("user_id", "game_id");

-- CreateIndex
CREATE INDEX "click_game_id_question_id_position_idx" ON "click"("game_id", "question_id", "position");

-- CreateIndex
CREATE INDEX "click_game_id_status_idx" ON "click"("game_id", "status");

-- CreateIndex
CREATE INDEX "click_player_id_idx" ON "click"("player_id");

-- CreateIndex
CREATE INDEX "click_question_id_idx" ON "click"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "click_player_id_game_id_question_id_key" ON "click"("player_id", "game_id", "question_id");

-- CreateIndex
CREATE INDEX "game_topic_game_id_idx" ON "game_topic"("game_id");

-- CreateIndex
CREATE INDEX "game_topic_topic_id_idx" ON "game_topic"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_topic_game_id_topic_id_key" ON "game_topic"("game_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_topic_game_id_order_key" ON "game_topic"("game_id", "order");

-- CreateIndex
CREATE INDEX "game_question_game_topic_id_idx" ON "game_question"("game_topic_id");

-- CreateIndex
CREATE INDEX "game_question_question_id_idx" ON "game_question"("question_id");

-- CreateIndex
CREATE INDEX "game_question_winner_id_idx" ON "game_question"("winner_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_question_game_topic_id_question_id_key" ON "game_question"("game_topic_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_question_game_topic_id_order_key" ON "game_question"("game_topic_id", "order");

-- AddForeignKey
ALTER TABLE "game" ADD CONSTRAINT "game_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game" ADD CONSTRAINT "game_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game" ADD CONSTRAINT "game_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_settings" ADD CONSTRAINT "game_settings_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player" ADD CONSTRAINT "player_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player" ADD CONSTRAINT "player_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click" ADD CONSTRAINT "click_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click" ADD CONSTRAINT "click_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click" ADD CONSTRAINT "click_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click" ADD CONSTRAINT "click_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_topic" ADD CONSTRAINT "game_topic_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_topic" ADD CONSTRAINT "game_topic_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_question" ADD CONSTRAINT "game_question_game_topic_id_fkey" FOREIGN KEY ("game_topic_id") REFERENCES "game_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_question" ADD CONSTRAINT "game_question_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_question" ADD CONSTRAINT "game_question_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
