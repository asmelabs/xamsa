-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('accepted');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "total_followers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "total_following" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_follow" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "FollowStatus" NOT NULL DEFAULT 'accepted',
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,

    CONSTRAINT "user_follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_follow_follower_id_following_id_key" ON "user_follow"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "user_follow_follower_id_idx" ON "user_follow"("follower_id");

-- CreateIndex
CREATE INDEX "user_follow_following_id_idx" ON "user_follow"("following_id");

-- AddForeignKey
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
