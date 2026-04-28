-- CreateEnum
CREATE TYPE "DuplicateQuestionPolicy" AS ENUM ('none', 'block_individuals', 'block_room');

-- AlterTable
ALTER TABLE "game_settings" ADD COLUMN "duplicate_question_policy" "DuplicateQuestionPolicy" NOT NULL DEFAULT 'none';
