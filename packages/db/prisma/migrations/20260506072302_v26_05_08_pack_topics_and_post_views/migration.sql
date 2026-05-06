-- AlterTable
ALTER TABLE "pack" ADD COLUMN     "total_topics" INTEGER NOT NULL DEFAULT 0;

-- Backfill `total_topics` from existing topic rows so directory filters work
-- without waiting for the next topic edit.
UPDATE "pack"
SET "total_topics" = sub.cnt
FROM (
  SELECT "pack_id" AS pack_id, COUNT(*)::int AS cnt
  FROM "topic"
  GROUP BY "pack_id"
) AS sub
WHERE "pack"."id" = sub.pack_id;

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "total_views" INTEGER NOT NULL DEFAULT 0;
