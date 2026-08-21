ALTER TABLE "users"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "task_occurrences"
  DROP CONSTRAINT IF EXISTS "task_occurrences_taskId_scheduledDate_key";

CREATE INDEX IF NOT EXISTS "task_occurrences_taskId_scheduledDate_idx"
  ON "task_occurrences"("taskId", "scheduledDate");
