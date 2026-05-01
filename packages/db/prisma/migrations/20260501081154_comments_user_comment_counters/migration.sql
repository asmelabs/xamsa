-- AlterTable
ALTER TABLE "user" ADD COLUMN     "total_comments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_replies" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "body" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "root_id" TEXT NOT NULL,
    "pack_id" TEXT,
    "topic_id" TEXT,
    "question_id" TEXT,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_pack_id_created_at_idx" ON "comment"("pack_id", "created_at");

-- CreateIndex
CREATE INDEX "comment_topic_id_created_at_idx" ON "comment"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "comment_question_id_created_at_idx" ON "comment"("question_id", "created_at");

-- CreateIndex
CREATE INDEX "comment_root_id_created_at_idx" ON "comment"("root_id", "created_at");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_root_id_fkey" FOREIGN KEY ("root_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
