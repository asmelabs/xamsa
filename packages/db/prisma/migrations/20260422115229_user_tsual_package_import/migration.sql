-- CreateTable
CREATE TABLE "user_tsual_package_import" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "tsual_package_id" INTEGER NOT NULL,
    "pack_id" TEXT NOT NULL,

    CONSTRAINT "user_tsual_package_import_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_tsual_package_import_tsual_package_id_idx" ON "user_tsual_package_import"("tsual_package_id");

-- CreateIndex
CREATE INDEX "user_tsual_package_import_pack_id_idx" ON "user_tsual_package_import"("pack_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_tsual_package_import_user_id_tsual_package_id_key" ON "user_tsual_package_import"("user_id", "tsual_package_id");

-- AddForeignKey
ALTER TABLE "user_tsual_package_import" ADD CONSTRAINT "user_tsual_package_import_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tsual_package_import" ADD CONSTRAINT "user_tsual_package_import_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
