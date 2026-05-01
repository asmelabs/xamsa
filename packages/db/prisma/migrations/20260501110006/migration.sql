/*
  Warnings:

  - Added the required column `resource` to the `reaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReactionResource" AS ENUM ('post', 'comment');

-- AlterTable
ALTER TABLE "reaction" ADD COLUMN     "resource" "ReactionResource" NOT NULL;
