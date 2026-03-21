-- DropIndex
DROP INDEX "idx_appointments_actual_end_time";

-- DropIndex
DROP INDEX "idx_appointments_actual_start_time";

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "actual_start_time" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "actual_end_time" SET DATA TYPE TIMESTAMP(3);
