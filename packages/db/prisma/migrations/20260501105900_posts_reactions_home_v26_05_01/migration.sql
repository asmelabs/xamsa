-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('heart', 'dislike', 'laugh', 'sad', 'angry', 'wow');

-- CreateEnum
CREATE TYPE "PostAttachmentResource" AS ENUM ('game', 'pack', 'topic');

-- AlterTable
ALTER TABLE "comment" ADD COLUMN     "post_id" TEXT,
ADD COLUMN     "total_reactions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "total_posts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_reactions" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "post" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "body" TEXT,
    "image" TEXT,
    "image_public_id" TEXT,
    "user_id" TEXT NOT NULL,
    "total_comments" INTEGER NOT NULL DEFAULT 0,
    "total_reactions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_attachment" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resource" "PostAttachmentResource" NOT NULL,
    "post_id" TEXT NOT NULL,
    "game_id" TEXT,
    "pack_id" TEXT,
    "topic_id" TEXT,

    CONSTRAINT "post_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "type" "ReactionType" NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT,
    "comment_id" TEXT,

    CONSTRAINT "reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_user_id_idx" ON "post"("user_id");

-- CreateIndex
CREATE INDEX "post_created_at_id_idx" ON "post"("created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "post_attachment_post_id_key" ON "post_attachment"("post_id");

-- CreateIndex
CREATE INDEX "post_attachment_game_id_idx" ON "post_attachment"("game_id");

-- CreateIndex
CREATE INDEX "post_attachment_pack_id_idx" ON "post_attachment"("pack_id");

-- CreateIndex
CREATE INDEX "post_attachment_topic_id_idx" ON "post_attachment"("topic_id");

-- CreateIndex
CREATE INDEX "reaction_user_id_idx" ON "reaction"("user_id");

-- CreateIndex
CREATE INDEX "reaction_post_id_idx" ON "reaction"("post_id");

-- CreateIndex
CREATE INDEX "reaction_comment_id_idx" ON "reaction"("comment_id");

-- CreateIndex
CREATE INDEX "comment_post_id_created_at_idx" ON "comment"("post_id", "created_at");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reaction"
    ADD CONSTRAINT "reaction_exactly_one_target_ck"
    CHECK (
      ("post_id" IS NOT NULL AND "comment_id" IS NULL)
      OR ("post_id" IS NULL AND "comment_id" IS NOT NULL)
    );

CREATE UNIQUE INDEX "reaction_user_post_uidx"
  ON "reaction"("user_id", "post_id")
  WHERE ("post_id" IS NOT NULL);

CREATE UNIQUE INDEX "reaction_user_comment_uidx"
  ON "reaction"("user_id", "comment_id")
  WHERE ("comment_id" IS NOT NULL);

ALTER TABLE "post"
  ADD CONSTRAINT "post_body_or_image_ck"
  CHECK (
    COALESCE(TRIM("body"), '') <> ''
    OR "image" IS NOT NULL
  );
