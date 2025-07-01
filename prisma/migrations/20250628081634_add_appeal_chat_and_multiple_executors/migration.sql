/*
  Warnings:

  - A unique constraint covering the columns `[chat_id]` on the table `appeals` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppealStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "AppealStatus" ADD VALUE 'IN_CONFIRMATION';
ALTER TYPE "AppealStatus" ADD VALUE 'ARCHIVED';

-- DropForeignKey
ALTER TABLE "appeals" DROP CONSTRAINT "appeals_executor_id_fkey";

-- AlterTable
ALTER TABLE "appeals" ADD COLUMN     "chat_id" TEXT,
ADD COLUMN     "last_notified_at" TIMESTAMP(3),
ADD COLUMN     "number" SERIAL NOT NULL,
ALTER COLUMN "executor_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "appeal_messages" (
    "id" TEXT NOT NULL,
    "appeal_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT,
    "file_url" TEXT,
    "file_size" INTEGER,
    "file_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appeal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AppealExecutors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_AppealExecutors_AB_unique" ON "_AppealExecutors"("A", "B");

-- CreateIndex
CREATE INDEX "_AppealExecutors_B_index" ON "_AppealExecutors"("B");

-- CreateIndex
CREATE UNIQUE INDEX "appeals_chat_id_key" ON "appeals"("chat_id");

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeal_messages" ADD CONSTRAINT "appeal_messages_appeal_id_fkey" FOREIGN KEY ("appeal_id") REFERENCES "appeals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeal_messages" ADD CONSTRAINT "appeal_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AppealExecutors" ADD CONSTRAINT "_AppealExecutors_A_fkey" FOREIGN KEY ("A") REFERENCES "appeals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AppealExecutors" ADD CONSTRAINT "_AppealExecutors_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
