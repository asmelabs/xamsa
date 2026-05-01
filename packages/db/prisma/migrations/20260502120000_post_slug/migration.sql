-- AlterTable
ALTER TABLE "post" ADD COLUMN "slug" TEXT;

-- Backfill (globally unique; legacy images keep old public_id on row)
UPDATE "post" SET "slug" = 'legacy-' || REPLACE(id::text, '-', '') WHERE "slug" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "post_slug_key" ON "post"("slug");

-- AlterTable
ALTER TABLE "post" ALTER COLUMN "slug" SET NOT NULL;
