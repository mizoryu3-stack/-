-- AlterTable
ALTER TABLE "SearchRun" ADD COLUMN "scheduledFor" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SearchRun_scheduledFor_key" ON "SearchRun"("scheduledFor");
