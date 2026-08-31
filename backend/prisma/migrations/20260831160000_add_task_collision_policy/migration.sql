ALTER TABLE "tasks"
  ADD COLUMN "suppressScheduledDateCollisions" BOOLEAN NOT NULL DEFAULT false;
