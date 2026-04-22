-- CreateEnum
CREATE TYPE "TopicBulkJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "topic_bulk_job" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "pack_slug" TEXT NOT NULL,
    "status" "TopicBulkJobStatus" NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "total_topics" INTEGER NOT NULL,
    "error_message" TEXT,
    "result" JSONB,

    CONSTRAINT "topic_bulk_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topic_bulk_job_user_id_idx" ON "topic_bulk_job"("user_id");

-- CreateIndex
CREATE INDEX "topic_bulk_job_status_idx" ON "topic_bulk_job"("status");

-- AddForeignKey
ALTER TABLE "topic_bulk_job" ADD CONSTRAINT "topic_bulk_job_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
