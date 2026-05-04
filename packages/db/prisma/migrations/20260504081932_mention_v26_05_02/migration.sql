-- CreateTable
CREATE TABLE "mention" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mentioned_user_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "post_id" TEXT,
    "comment_id" TEXT,

    CONSTRAINT "mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mention_email_notification" (
    "id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,

    CONSTRAINT "mention_email_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mention_mentioned_user_id_idx" ON "mention"("mentioned_user_id");

-- CreateIndex
CREATE INDEX "mention_post_id_idx" ON "mention"("post_id");

-- CreateIndex
CREATE INDEX "mention_comment_id_idx" ON "mention"("comment_id");

-- CreateIndex
CREATE INDEX "mention_created_by_user_id_idx" ON "mention"("created_by_user_id");

-- CreateIndex
CREATE INDEX "mention_email_notification_recipient_user_id_post_id_sent_a_idx" ON "mention_email_notification"("recipient_user_id", "post_id", "sent_at");

-- AddForeignKey
ALTER TABLE "mention" ADD CONSTRAINT "mention_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention" ADD CONSTRAINT "mention_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention" ADD CONSTRAINT "mention_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention" ADD CONSTRAINT "mention_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention_email_notification" ADD CONSTRAINT "mention_email_notification_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention_email_notification" ADD CONSTRAINT "mention_email_notification_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
