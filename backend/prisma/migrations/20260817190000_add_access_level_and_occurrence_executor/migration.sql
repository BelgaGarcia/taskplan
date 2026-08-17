-- Stable authorization must not depend on a role's editable name.
CREATE TYPE "AccessLevel" AS ENUM ('ADMIN', 'OPERATOR');

ALTER TABLE "roles"
  ADD COLUMN "accessLevel" "AccessLevel" NOT NULL DEFAULT 'OPERATOR';

-- Preserve the existing administrator installation while allowing the name to
-- be edited freely after this migration.
UPDATE "roles"
SET "accessLevel" = 'ADMIN'
WHERE lower("name") = lower('Administrador');

ALTER TABLE "task_occurrences"
  ADD COLUMN "executedByUserId" UUID;

CREATE INDEX "task_occurrences_executedByUserId_idx"
  ON "task_occurrences"("executedByUserId");

ALTER TABLE "task_occurrences"
  ADD CONSTRAINT "task_occurrences_executedByUserId_fkey"
  FOREIGN KEY ("executedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;