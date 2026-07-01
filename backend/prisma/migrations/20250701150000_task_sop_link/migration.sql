-- AlterTable
ALTER TABLE "DepartmentTask" ADD COLUMN "sopId" TEXT;

-- CreateIndex
CREATE INDEX "DepartmentTask_sopId_idx" ON "DepartmentTask"("sopId");

-- AddForeignKey
ALTER TABLE "DepartmentTask" ADD CONSTRAINT "DepartmentTask_sopId_fkey" FOREIGN KEY ("sopId") REFERENCES "SOP"("id") ON DELETE SET NULL ON UPDATE CASCADE;
