-- CreateEnum
CREATE TYPE "PackVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "PackStatus" AS ENUM ('draft', 'published', 'disabled', 'archived', 'deleted');

-- CreateEnum
CREATE TYPE "PackLanguage" AS ENUM ('en', 'az', 'ru', 'tr');

-- CreateTable
CREATE TABLE "pack" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "visibility" "PackVisibility" NOT NULL DEFAULT 'public',
    "status" "PackStatus" NOT NULL DEFAULT 'draft',
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "language" "PackLanguage" NOT NULL DEFAULT 'az',
    "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_ratings" INTEGER NOT NULL DEFAULT 0,
    "total_plays" INTEGER NOT NULL DEFAULT 0,
    "author_id" TEXT NOT NULL,

    CONSTRAINT "pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_rating" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "user_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,

    CONSTRAINT "pack_rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pack_id" TEXT NOT NULL,

    CONSTRAINT "topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "answer" TEXT NOT NULL,
    "acceptable_answers" TEXT[],
    "explanation" TEXT,
    "topic_id" TEXT NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pack_slug_key" ON "pack"("slug");

-- CreateIndex
CREATE INDEX "pack_slug_idx" ON "pack"("slug");

-- CreateIndex
CREATE INDEX "pack_author_id_idx" ON "pack"("author_id");

-- CreateIndex
CREATE INDEX "pack_total_plays_idx" ON "pack"("total_plays");

-- CreateIndex
CREATE INDEX "pack_average_rating_idx" ON "pack"("average_rating");

-- CreateIndex
CREATE INDEX "pack_rating_user_id_idx" ON "pack_rating"("user_id");

-- CreateIndex
CREATE INDEX "pack_rating_pack_id_idx" ON "pack_rating"("pack_id");

-- CreateIndex
CREATE INDEX "pack_rating_rating_idx" ON "pack_rating"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "pack_rating_user_id_pack_id_key" ON "pack_rating"("user_id", "pack_id");

-- CreateIndex
CREATE INDEX "topic_pack_id_idx" ON "topic"("pack_id");

-- CreateIndex
CREATE INDEX "topic_slug_idx" ON "topic"("slug");

-- CreateIndex
CREATE INDEX "topic_order_idx" ON "topic"("order");

-- CreateIndex
CREATE UNIQUE INDEX "topic_pack_id_order_key" ON "topic"("pack_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "topic_pack_id_slug_key" ON "topic"("pack_id", "slug");

-- CreateIndex
CREATE INDEX "question_topic_id_idx" ON "question"("topic_id");

-- CreateIndex
CREATE INDEX "question_slug_idx" ON "question"("slug");

-- CreateIndex
CREATE INDEX "question_order_idx" ON "question"("order");

-- CreateIndex
CREATE UNIQUE INDEX "question_topic_id_order_key" ON "question"("topic_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "question_topic_id_slug_key" ON "question"("topic_id", "slug");

-- AddForeignKey
ALTER TABLE "pack" ADD CONSTRAINT "pack_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_rating" ADD CONSTRAINT "pack_rating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_rating" ADD CONSTRAINT "pack_rating_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic" ADD CONSTRAINT "topic_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
