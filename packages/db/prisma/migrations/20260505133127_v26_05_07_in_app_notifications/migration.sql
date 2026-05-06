-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('mention_post', 'mention_comment', 'reaction_post', 'reaction_comment', 'comment_on_post', 'reply_to_comment', 'follow', 'pack_published', 'game_started', 'game_finished', 'system');

-- CreateEnum
CREATE TYPE "NotificationDeliveryLevel" AS ENUM ('all', 'followers', 'none');

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "NotificationType" NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "group_key" TEXT NOT NULL,
    "post_id" TEXT,
    "comment_id" TEXT,
    "pack_id" TEXT,
    "topic_id" TEXT,
    "game_id" TEXT,
    "seen_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preference" (
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "mention_in_app" "NotificationDeliveryLevel" NOT NULL DEFAULT 'all',
    "mention_email" "NotificationDeliveryLevel" NOT NULL DEFAULT 'all',
    "reaction_on_post_in_app" "NotificationDeliveryLevel" NOT NULL DEFAULT 'all',
    "reaction_on_post_email" "NotificationDeliveryLevel" NOT NULL DEFAULT 'all',
    "reaction_on_comment_in_app" "NotificationDeliveryLevel" NOT NULL DEFAULT 'all',
    "reaction_on_comment_email" "NotificationDeliveryLevel" NOT NULL DEFAULT 'none',
    "comment_on_post_in_app" "NotificationDeliveryLevel" NOT NULL DEFAULT 'all',
    "comment_on_post_email" "NotificationDeliveryLevel" NOT NULL DEFAULT 'all',
    "reply_to_comment_in_app" "NotificationDeliveryLevel" NOT NULL DEFAULT 'all',
    "reply_to_comment_email" "NotificationDeliveryLevel" NOT NULL DEFAULT 'all',
    "follow_in_app" BOOLEAN NOT NULL DEFAULT true,
    "follow_email" BOOLEAN NOT NULL DEFAULT true,
    "pack_published_in_app" BOOLEAN NOT NULL DEFAULT true,
    "pack_published_email" BOOLEAN NOT NULL DEFAULT false,
    "game_started_in_app" BOOLEAN NOT NULL DEFAULT true,
    "game_started_email" BOOLEAN NOT NULL DEFAULT false,
    "game_finished_in_app" BOOLEAN NOT NULL DEFAULT true,
    "game_finished_email" BOOLEAN NOT NULL DEFAULT false,
    "mute_all_except_security" BOOLEAN NOT NULL DEFAULT false,
    "email_quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_quiet_hours_start_min" INTEGER NOT NULL DEFAULT 1320,
    "email_quiet_hours_end_min" INTEGER NOT NULL DEFAULT 420,
    "email_quiet_hours_timezone" TEXT NOT NULL DEFAULT 'UTC',

    CONSTRAINT "user_notification_preference_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "notification_recipient_user_id_created_at_idx" ON "notification"("recipient_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notification_recipient_user_id_seen_at_created_at_idx" ON "notification"("recipient_user_id", "seen_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notification_recipient_user_id_group_key_seen_at_created_at_idx" ON "notification"("recipient_user_id", "group_key", "seen_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notification_actor_user_id_idx" ON "notification"("actor_user_id");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preference" ADD CONSTRAINT "user_notification_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
