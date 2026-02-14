/*
  Warnings:

  - You are about to drop the column `duration` on the `appointment_services` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `appointment_services` table. All the data in the column will be lost.
  - You are about to drop the column `final_price` on the `appointment_services` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `appointment_services` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `appointment_services` table. All the data in the column will be lost.
  - You are about to drop the column `variant_id` on the `appointment_services` table. All the data in the column will be lost.
  - You are about to drop the column `appointment_date` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `cancel_reason` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `no_show_reason` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `appointments` table. All the data in the column will be lost.
  - Added the required column `active_time_minutes` to the `appointment_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration_minutes` to the `appointment_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_name` to the `appointment_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_amount` to the `appointment_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_rate` to the `appointment_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `appointment_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_amount` to the `appointment_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_price` to the `appointment_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduled_date` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduled_time` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_duration` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "appointment_services" DROP CONSTRAINT "appointment_services_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_customer_id_fkey";

-- DropIndex
DROP INDEX "appointments_tenant_id_appointment_date_idx";

-- AlterTable
ALTER TABLE "appointment_services" DROP COLUMN "duration",
DROP COLUMN "end_time",
DROP COLUMN "final_price",
DROP COLUMN "price",
DROP COLUMN "start_time",
DROP COLUMN "variant_id",
ADD COLUMN     "active_time_minutes" INTEGER NOT NULL,
ADD COLUMN     "assistant_id" TEXT,
ADD COLUMN     "commission_amount" DECIMAL(10,2),
ADD COLUMN     "commission_rate" DECIMAL(5,2),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "duration_minutes" INTEGER NOT NULL,
ADD COLUMN     "processing_time_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "service_name" VARCHAR(255) NOT NULL,
ADD COLUMN     "service_sku" VARCHAR(50),
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "tax_amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "tax_rate" DECIMAL(5,2) NOT NULL,
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "total_amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "unit_price" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "appointment_date",
DROP COLUMN "cancel_reason",
DROP COLUMN "no_show_reason",
DROP COLUMN "notes",
DROP COLUMN "source",
DROP COLUMN "start_time",
DROP COLUMN "updated_by",
ADD COLUMN     "booking_source" VARCHAR(50),
ADD COLUMN     "booking_type" VARCHAR(20) NOT NULL DEFAULT 'walk_in',
ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by" TEXT,
ADD COLUMN     "customer_name" VARCHAR(255),
ADD COLUMN     "customer_notes" TEXT,
ADD COLUMN     "customer_phone" VARCHAR(20),
ADD COLUMN     "is_salon_cancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "original_appointment_id" TEXT,
ADD COLUMN     "payment_id" VARCHAR(100),
ADD COLUMN     "prepayment_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "prepayment_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prepayment_status" VARCHAR(20),
ADD COLUMN     "price_locked_at" TIMESTAMP(3),
ADD COLUMN     "reschedule_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rescheduled_to_id" TEXT,
ADD COLUMN     "scheduled_date" DATE NOT NULL,
ADD COLUMN     "scheduled_time" VARCHAR(5) NOT NULL,
ADD COLUMN     "stylist_gender_preference" VARCHAR(10),
ADD COLUMN     "stylist_id" TEXT,
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "token_number" INTEGER,
ADD COLUMN     "total_duration" INTEGER NOT NULL,
ALTER COLUMN "customer_id" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'booked',
ALTER COLUMN "created_by" DROP NOT NULL;

-- CreateTable
CREATE TABLE "appointment_status_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "from_status" VARCHAR(20),
    "to_status" VARCHAR(20) NOT NULL,
    "changed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stylist_breaks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "stylist_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "day_of_week" INTEGER,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "stylist_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stylist_blocked_slots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "stylist_id" TEXT NOT NULL,
    "blocked_date" DATE NOT NULL,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "is_full_day" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "stylist_blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walk_in_queue" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "queue_date" DATE NOT NULL,
    "token_number" INTEGER NOT NULL,
    "customer_id" TEXT,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20),
    "service_ids" TEXT[],
    "stylist_preference_id" TEXT,
    "gender_preference" VARCHAR(10),
    "status" VARCHAR(20) NOT NULL DEFAULT 'waiting',
    "position" INTEGER NOT NULL,
    "estimated_wait_minutes" INTEGER,
    "called_at" TIMESTAMP(3),
    "appointment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walk_in_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_status_history_appointment_id_created_at_idx" ON "appointment_status_history"("appointment_id", "created_at");

-- CreateIndex
CREATE INDEX "appointment_status_history_tenant_id_idx" ON "appointment_status_history"("tenant_id");

-- CreateIndex
CREATE INDEX "stylist_breaks_stylist_id_day_of_week_idx" ON "stylist_breaks"("stylist_id", "day_of_week");

-- CreateIndex
CREATE INDEX "stylist_breaks_tenant_id_branch_id_idx" ON "stylist_breaks"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "stylist_blocked_slots_stylist_id_blocked_date_idx" ON "stylist_blocked_slots"("stylist_id", "blocked_date");

-- CreateIndex
CREATE INDEX "stylist_blocked_slots_tenant_id_branch_id_idx" ON "stylist_blocked_slots"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_queue_appointment_id_key" ON "walk_in_queue"("appointment_id");

-- CreateIndex
CREATE INDEX "walk_in_queue_branch_id_queue_date_status_idx" ON "walk_in_queue"("branch_id", "queue_date", "status");

-- CreateIndex
CREATE INDEX "walk_in_queue_tenant_id_idx" ON "walk_in_queue"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_queue_branch_id_queue_date_token_number_key" ON "walk_in_queue"("branch_id", "queue_date", "token_number");

-- CreateIndex
CREATE INDEX "appointment_services_tenant_id_idx" ON "appointment_services"("tenant_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_scheduled_date_idx" ON "appointments"("tenant_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "appointments_branch_id_scheduled_date_scheduled_time_idx" ON "appointments"("branch_id", "scheduled_date", "scheduled_time");

-- CreateIndex
CREATE INDEX "appointments_stylist_id_scheduled_date_idx" ON "appointments"("stylist_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "appointments_branch_id_status_scheduled_date_idx" ON "appointments"("branch_id", "status", "scheduled_date");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_original_appointment_id_fkey" FOREIGN KEY ("original_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_in_queue" ADD CONSTRAINT "walk_in_queue_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
