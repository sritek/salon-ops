-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20),
    "service_ids" TEXT[],
    "preferred_stylist_id" TEXT,
    "preferred_start_date" DATE NOT NULL,
    "preferred_end_date" DATE NOT NULL,
    "time_preferences" TEXT[],
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "appointment_id" TEXT,
    "converted_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_appointment_id_key" ON "waitlist_entries"("appointment_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_tenant_id_branch_id_status_idx" ON "waitlist_entries"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE INDEX "waitlist_entries_branch_id_preferred_start_date_preferred_e_idx" ON "waitlist_entries"("branch_id", "preferred_start_date", "preferred_end_date");

-- CreateIndex
CREATE INDEX "waitlist_entries_tenant_id_idx" ON "waitlist_entries"("tenant_id");

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
