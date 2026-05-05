-- CreateTable
CREATE TABLE "reaction_email_notification" (
    "id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,

    CONSTRAINT "reaction_email_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_email_notification" (
    "id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,

    CONSTRAINT "comment_email_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_email_notification" (
    "id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_user_id" TEXT NOT NULL,
    "parent_comment_id" TEXT NOT NULL,

    CONSTRAINT "reply_email_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reaction_email_notification_recipient_user_id_post_id_sent__idx" ON "reaction_email_notification"("recipient_user_id", "post_id", "sent_at");

-- CreateIndex
CREATE INDEX "comment_email_notification_recipient_user_id_post_id_sent_a_idx" ON "comment_email_notification"("recipient_user_id", "post_id", "sent_at");

-- CreateIndex
CREATE INDEX "reply_email_notification_recipient_user_id_parent_comment_i_idx" ON "reply_email_notification"("recipient_user_id", "parent_comment_id", "sent_at");

-- AddForeignKey
ALTER TABLE "reaction_email_notification" ADD CONSTRAINT "reaction_email_notification_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_email_notification" ADD CONSTRAINT "reaction_email_notification_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_email_notification" ADD CONSTRAINT "comment_email_notification_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_email_notification" ADD CONSTRAINT "comment_email_notification_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_email_notification" ADD CONSTRAINT "reply_email_notification_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_email_notification" ADD CONSTRAINT "reply_email_notification_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
