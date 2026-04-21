/*
  Warnings:

  - The values [spectating,kicked] on the enum `PlayerStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "LeaveReason" AS ENUM ('voluntary', 'kicked');

-- AlterEnum
BEGIN;
CREATE TYPE "PlayerStatus_new" AS ENUM ('playing', 'left');
ALTER TABLE "public"."player" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "player" ALTER COLUMN "status" TYPE "PlayerStatus_new" USING ("status"::text::"PlayerStatus_new");
ALTER TYPE "PlayerStatus" RENAME TO "PlayerStatus_old";
ALTER TYPE "PlayerStatus_new" RENAME TO "PlayerStatus";
DROP TYPE "public"."PlayerStatus_old";
ALTER TABLE "player" ALTER COLUMN "status" SET DEFAULT 'playing';
COMMIT;

-- AlterTable
ALTER TABLE "player" ADD COLUMN     "leave_reason" "LeaveReason",
ALTER COLUMN "status" SET DEFAULT 'playing';
