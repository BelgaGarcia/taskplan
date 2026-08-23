-- Link each continued occurrence to the occurrence from the previous day.
ALTER TABLE "task_occurrences"
ADD COLUMN "continuationOfId" UUID;

CREATE UNIQUE INDEX "task_occurrences_continuationOfId_key"
ON "task_occurrences"("continuationOfId");

ALTER TABLE "task_occurrences"
ADD CONSTRAINT "task_occurrences_continuationOfId_fkey"
FOREIGN KEY ("continuationOfId") REFERENCES "task_occurrences"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
