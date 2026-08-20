-- Keep the earliest generated occurrence when non-business days converge on one date.
DELETE FROM "task_occurrences" AS duplicate
USING "task_occurrences" AS kept
WHERE duplicate."taskId" = kept."taskId"
  AND duplicate."scheduledDate" = kept."scheduledDate"
  AND (duplicate."createdAt", duplicate."id") > (kept."createdAt", kept."id");

CREATE UNIQUE INDEX "task_occurrences_taskId_scheduledDate_key"
ON "task_occurrences" ("taskId", "scheduledDate");
