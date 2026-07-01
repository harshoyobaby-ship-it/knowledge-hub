-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN "taskId" TEXT;

-- CreateIndex
CREATE INDEX "Attachment_taskId_idx" ON "Attachment"("taskId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DepartmentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
