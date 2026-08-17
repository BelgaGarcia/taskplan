-- CreateEnum
CREATE TYPE "PeriodicityType" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'SPECIFIC_WEEKDAYS', 'SPECIFIC_MONTH_DAY', 'FIRST_BUSINESS_DAY', 'LAST_BUSINESS_DAY', 'CUSTOM_INTERVAL');

-- CreateEnum
CREATE TYPE "NonexistentDayRule" AS ENUM ('PREVIOUS_DAY', 'LAST_DAY_OF_MONTH', 'NEXT_MONTH', 'SKIP');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'STATE', 'MUNICIPAL', 'INTERNAL');

-- CreateTable
CREATE TABLE "functions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "responsiblePositionId" UUID,
    "responsibleUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodicities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "PeriodicityType" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "dayOfMonth" INTEGER,
    "month" INTEGER,
    "nonexistentDayRule" "NonexistentDayRule" NOT NULL DEFAULT 'PREVIOUS_DAY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodicities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "date" DATE NOT NULL,
    "type" "HolidayType" NOT NULL,
    "locality" VARCHAR(150),
    "recurringAnnual" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "functions_name_key" ON "functions"("name");

-- CreateIndex
CREATE INDEX "functions_active_idx" ON "functions"("active");

-- CreateIndex
CREATE INDEX "functions_responsiblePositionId_idx" ON "functions"("responsiblePositionId");

-- CreateIndex
CREATE INDEX "functions_responsibleUserId_idx" ON "functions"("responsibleUserId");

-- CreateIndex
CREATE UNIQUE INDEX "periodicities_name_key" ON "periodicities"("name");

-- CreateIndex
CREATE INDEX "periodicities_type_idx" ON "periodicities"("type");

-- CreateIndex
CREATE INDEX "periodicities_active_idx" ON "periodicities"("active");

-- CreateIndex
CREATE INDEX "holidays_date_idx" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "holidays_type_idx" ON "holidays"("type");

-- CreateIndex
CREATE INDEX "holidays_active_idx" ON "holidays"("active");

-- AddForeignKey
ALTER TABLE "functions" ADD CONSTRAINT "functions_responsiblePositionId_fkey" FOREIGN KEY ("responsiblePositionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "functions" ADD CONSTRAINT "functions_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
