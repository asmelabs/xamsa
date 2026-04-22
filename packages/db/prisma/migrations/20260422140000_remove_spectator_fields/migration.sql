-- AlterTable
ALTER TABLE "user" DROP COLUMN IF EXISTS "total_games_spectated";
ALTER TABLE "user" DROP COLUMN IF EXISTS "total_time_spent_spectating";

-- AlterTable
ALTER TABLE "game" DROP COLUMN IF EXISTS "total_spectators";
