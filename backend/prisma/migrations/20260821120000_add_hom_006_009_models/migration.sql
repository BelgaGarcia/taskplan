ALTER TYPE "PeriodicityType" ADD VALUE IF NOT EXISTS 'MONTHLY_DAY_RANGE';

ALTER TABLE "periodicities"
  ADD COLUMN "startDayOfMonth" INTEGER,
  ADD COLUMN "endDayOfMonth" INTEGER;

CREATE TABLE "position_inheritances" (
  "id" UUID NOT NULL,
  "positionId" UUID NOT NULL,
  "inheritedPositionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "position_inheritances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "position_inheritances_positionId_inheritedPositionId_key" UNIQUE ("positionId", "inheritedPositionId"),
  CONSTRAINT "position_inheritances_positionId_check" CHECK ("positionId" <> "inheritedPositionId")
);

CREATE INDEX "position_inheritances_inheritedPositionId_idx" ON "position_inheritances"("inheritedPositionId");
ALTER TABLE "position_inheritances" ADD CONSTRAINT "position_inheritances_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "position_inheritances" ADD CONSTRAINT "position_inheritances_inheritedPositionId_fkey"
  FOREIGN KEY ("inheritedPositionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "task_occurrence_exclusions" (
  "id" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "originalDate" DATE NOT NULL,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_occurrence_exclusions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_occurrence_exclusions_taskId_originalDate_key" UNIQUE ("taskId", "originalDate")
);

CREATE INDEX "task_occurrence_exclusions_createdByUserId_idx" ON "task_occurrence_exclusions"("createdByUserId");
ALTER TABLE "task_occurrence_exclusions" ADD CONSTRAINT "task_occurrence_exclusions_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_occurrence_exclusions" ADD CONSTRAINT "task_occurrence_exclusions_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "actorUserId" UUID,
  "action" VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(100) NOT NULL,
  "entityId" VARCHAR(100),
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
