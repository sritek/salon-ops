-- Rename end_time to scheduled_end_time
ALTER TABLE "appointments" RENAME COLUMN "end_time" TO "scheduled_end_time";

-- Add new columns for actual start and end times
ALTER TABLE "appointments" ADD COLUMN "actual_start_time" TIMESTAMP;
ALTER TABLE "appointments" ADD COLUMN "actual_end_time" TIMESTAMP;

-- Migrate data: copy started_at to actual_start_time for existing appointments
UPDATE "appointments" SET "actual_start_time" = "started_at" WHERE "started_at" IS NOT NULL;

-- Drop the old started_at column
ALTER TABLE "appointments" DROP COLUMN "started_at";

-- Create indexes for the new columns
CREATE INDEX "idx_appointments_actual_start_time" ON "appointments"("actual_start_time");
CREATE INDEX "idx_appointments_actual_end_time" ON "appointments"("actual_end_time");
