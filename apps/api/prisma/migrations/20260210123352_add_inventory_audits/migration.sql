-- CreateTable
CREATE TABLE "stock_audits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "audit_number" VARCHAR(50) NOT NULL,
    "audit_type" VARCHAR(20) NOT NULL,
    "category_id" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "posted_at" TIMESTAMP(3),
    "posted_by" TEXT,
    "total_variance_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_shrinkage_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "stock_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_audit_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "system_quantity" INTEGER NOT NULL,
    "physical_count" INTEGER,
    "variance" INTEGER NOT NULL DEFAULT 0,
    "average_cost" DECIMAL(10,2) NOT NULL,
    "variance_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "counted_at" TIMESTAMP(3),
    "counted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_audit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_audits_branch_id_status_idx" ON "stock_audits"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_audits_branch_id_audit_number_key" ON "stock_audits"("branch_id", "audit_number");

-- CreateIndex
CREATE INDEX "stock_audit_items_audit_id_idx" ON "stock_audit_items"("audit_id");

-- AddForeignKey
ALTER TABLE "stock_audit_items" ADD CONSTRAINT "stock_audit_items_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "stock_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
