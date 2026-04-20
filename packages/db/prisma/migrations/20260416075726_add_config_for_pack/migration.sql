/*
  Warnings:

  - The values [disabled,deleted] on the enum `PackStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PackStatus_new" AS ENUM ('draft', 'published', 'archived');
ALTER TABLE "public"."pack" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "pack" ALTER COLUMN "status" TYPE "PackStatus_new" USING ("status"::text::"PackStatus_new");
ALTER TYPE "PackStatus" RENAME TO "PackStatus_old";
ALTER TYPE "PackStatus_new" RENAME TO "PackStatus";
DROP TYPE "public"."PackStatus_old";
ALTER TABLE "pack" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "pack" ADD COLUMN     "allow_others_host" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_topics_info" BOOLEAN NOT NULL DEFAULT true;
