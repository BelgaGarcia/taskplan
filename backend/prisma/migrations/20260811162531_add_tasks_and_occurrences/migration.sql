-- CreateEnum
CREATE TYPE "TaskOccurrenceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskOccurrenceResult" AS ENUM ('SUCCESS', 'ERROR', 'PARTIAL');

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "functionId" UUID NOT NULL,
    "periodicityId" UUID NOT NULL,
    "responsiblePositionId" UUID,
    "responsibleUserId" UUID,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "scheduledTime" VARCHAR(5),
    "estimatedDurationMinutes" INTEGER,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "advanceOnNonBusinessDay" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_occurrences" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "responsibleUserId" UUID,
    "originalDate" DATE NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" VARCHAR(5),
    "status" "TaskOccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "result" "TaskOccurrenceResult",
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "actualDurationMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_functionId_idx" ON "tasks"("functionId");

-- CreateIndex
CREATE INDEX "tasks_periodicityId_idx" ON "tasks"("periodicityId");

-- CreateIndex
CREATE INDEX "tasks_responsiblePositionId_idx" ON "tasks"("responsiblePositionId");

-- CreateIndex
CREATE INDEX "tasks_responsibleUserId_idx" ON "tasks"("responsibleUserId");

-- CreateIndex
CREATE INDEX "tasks_startDate_idx" ON "tasks"("startDate");

-- CreateIndex
CREATE INDEX "tasks_endDate_idx" ON "tasks"("endDate");

-- CreateIndex
CREATE INDEX "tasks_active_idx" ON "tasks"("active");

-- CreateIndex
CREATE INDEX "task_occurrences_taskId_idx" ON "task_occurrences"("taskId");

-- CreateIndex
CREATE INDEX "task_occurrences_responsibleUserId_idx" ON "task_occurrences"("responsibleUserId");

-- CreateIndex
CREATE INDEX "task_occurrences_originalDate_idx" ON "task_occurrences"("originalDate");

-- CreateIndex
CREATE INDEX "task_occurrences_scheduledDate_idx" ON "task_occurrences"("scheduledDate");

-- CreateIndex
CREATE INDEX "task_occurrences_status_idx" ON "task_occurrences"("status");

-- CreateIndex
CREATE INDEX "task_occurrences_scheduledDate_status_idx" ON "task_occurrences"("scheduledDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "task_occurrences_taskId_originalDate_key" ON "task_occurrences"("taskId", "originalDate");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "functions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_periodicityId_fkey" FOREIGN KEY ("periodicityId") REFERENCES "periodicities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_responsiblePositionId_fkey" FOREIGN KEY ("responsiblePositionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
