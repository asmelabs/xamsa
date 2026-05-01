/*
  Warnings:

  - You are about to drop the column `resource` on the `reaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "reaction" DROP COLUMN "resource";

-- DropEnum
DROP TYPE "ReactionResource";
