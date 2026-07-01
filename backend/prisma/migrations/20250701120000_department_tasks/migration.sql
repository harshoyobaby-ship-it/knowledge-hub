-- CreateEnum
CREATE TYPE "DepartmentTaskStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DepartmentTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_UPDATED';

-- CreateTable
CREATE TABLE "DepartmentTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" "DepartmentTaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "priority" "DepartmentTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentTaskUpdate" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DepartmentTaskStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentTaskUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepartmentTask_departmentId_idx" ON "DepartmentTask"("departmentId");

-- CreateIndex
CREATE INDEX "DepartmentTask_assignedById_idx" ON "DepartmentTask"("assignedById");

-- CreateIndex
CREATE INDEX "DepartmentTask_status_idx" ON "DepartmentTask"("status");

-- CreateIndex
CREATE INDEX "DepartmentTask_dueDate_idx" ON "DepartmentTask"("dueDate");

-- CreateIndex
CREATE INDEX "DepartmentTaskUpdate_taskId_idx" ON "DepartmentTaskUpdate"("taskId");

-- CreateIndex
CREATE INDEX "DepartmentTaskUpdate_userId_idx" ON "DepartmentTaskUpdate"("userId");

-- AddForeignKey
ALTER TABLE "DepartmentTask" ADD CONSTRAINT "DepartmentTask_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentTask" ADD CONSTRAINT "DepartmentTask_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentTask" ADD CONSTRAINT "DepartmentTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentTaskUpdate" ADD CONSTRAINT "DepartmentTaskUpdate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DepartmentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentTaskUpdate" ADD CONSTRAINT "DepartmentTaskUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
