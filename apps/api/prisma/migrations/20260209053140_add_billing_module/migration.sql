-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "invoice_number" VARCHAR(50),
    "invoice_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_time" TIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" TEXT,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20),
    "customer_email" VARCHAR(255),
    "appointment_id" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "round_off" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loyalty_points_earned" INTEGER NOT NULL DEFAULT 0,
    "loyalty_points_redeemed" INTEGER NOT NULL DEFAULT 0,
    "loyalty_discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "wallet_amount_used" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "package_redemption_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "membership_discount_applied" BOOLEAN NOT NULL DEFAULT false,
    "membership_id" TEXT,
    "gstin" VARCHAR(20),
    "place_of_supply" VARCHAR(50),
    "is_igst" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "refund_invoice_id" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "finalized_at" TIMESTAMP(3),
    "finalized_by" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "item_type" VARCHAR(20) NOT NULL,
    "reference_id" TEXT NOT NULL,
    "reference_sku" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "variant_name" VARCHAR(100),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "discount_type" VARCHAR(20),
    "discount_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_reason" VARCHAR(255),
    "hsn_sac_code" VARCHAR(20),
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "taxable_amount" DECIMAL(10,2) NOT NULL,
    "cgst_rate" DECIMAL(5,2) NOT NULL,
    "cgst_amount" DECIMAL(10,2) NOT NULL,
    "sgst_rate" DECIMAL(5,2) NOT NULL,
    "sgst_amount" DECIMAL(10,2) NOT NULL,
    "igst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_tax" DECIMAL(10,2) NOT NULL,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "stylist_id" TEXT,
    "assistant_id" TEXT,
    "commission_type" VARCHAR(20),
    "commission_rate" DECIMAL(5,2),
    "commission_amount" DECIMAL(10,2),
    "assistant_commission_amount" DECIMAL(10,2),
    "is_package_redemption" BOOLEAN NOT NULL DEFAULT false,
    "package_redemption_id" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_discounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "discount_type" VARCHAR(20) NOT NULL,
    "discount_source" VARCHAR(50),
    "discount_name" VARCHAR(100) NOT NULL,
    "calculation_type" VARCHAR(20) NOT NULL,
    "calculation_value" DECIMAL(10,2) NOT NULL,
    "applied_to" VARCHAR(20) NOT NULL,
    "applied_item_id" TEXT,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approval_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "invoice_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "card_last_four" VARCHAR(4),
    "card_type" VARCHAR(20),
    "upi_id" VARCHAR(100),
    "transaction_id" VARCHAR(100),
    "bank_name" VARCHAR(100),
    "cheque_number" VARCHAR(50),
    "cheque_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "is_refund" BOOLEAN NOT NULL DEFAULT false,
    "original_payment_id" TEXT,
    "refund_reason" TEXT,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_time" TIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "credit_note_number" VARCHAR(50) NOT NULL,
    "credit_note_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "original_invoice_id" TEXT NOT NULL,
    "original_invoice_number" VARCHAR(50) NOT NULL,
    "customer_id" TEXT,
    "customer_name" VARCHAR(255) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "refund_method" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'issued',
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "credit_note_id" TEXT NOT NULL,
    "original_item_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_note_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_drawer_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "transaction_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_time" TIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "reference_type" VARCHAR(20),
    "reference_id" TEXT,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "cash_drawer_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_closures" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "closure_date" DATE NOT NULL,
    "expected_cash" DECIMAL(12,2) NOT NULL,
    "actual_cash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cash_difference" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_invoices" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_discounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_refunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_tax_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cash_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "card_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "upi_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "wallet_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "reconciliation_notes" TEXT,
    "reconciled_by" TEXT,
    "reconciled_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,

    CONSTRAINT "day_closures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_appointment_id_key" ON "invoices"("appointment_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_branch_id_idx" ON "invoices"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "invoices_branch_id_invoice_date_idx" ON "invoices"("branch_id", "invoice_date");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_branch_id_status_invoice_date_idx" ON "invoices"("branch_id", "status", "invoice_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_branch_id_invoice_number_key" ON "invoices"("branch_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_stylist_id_created_at_idx" ON "invoice_items"("stylist_id", "created_at");

-- CreateIndex
CREATE INDEX "invoice_discounts_invoice_id_idx" ON "invoice_discounts"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_branch_id_payment_date_idx" ON "payments"("branch_id", "payment_date");

-- CreateIndex
CREATE INDEX "payments_branch_id_payment_method_payment_date_idx" ON "payments"("branch_id", "payment_method", "payment_date");

-- CreateIndex
CREATE INDEX "credit_notes_branch_id_credit_note_date_idx" ON "credit_notes"("branch_id", "credit_note_date");

-- CreateIndex
CREATE INDEX "credit_notes_original_invoice_id_idx" ON "credit_notes"("original_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_branch_id_credit_note_number_key" ON "credit_notes"("branch_id", "credit_note_number");

-- CreateIndex
CREATE INDEX "credit_note_items_credit_note_id_idx" ON "credit_note_items"("credit_note_id");

-- CreateIndex
CREATE INDEX "cash_drawer_transactions_branch_id_transaction_date_idx" ON "cash_drawer_transactions"("branch_id", "transaction_date");

-- CreateIndex
CREATE INDEX "day_closures_branch_id_closure_date_idx" ON "day_closures"("branch_id", "closure_date");

-- CreateIndex
CREATE UNIQUE INDEX "day_closures_branch_id_closure_date_key" ON "day_closures"("branch_id", "closure_date");

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_discounts" ADD CONSTRAINT "invoice_discounts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_original_invoice_id_fkey" FOREIGN KEY ("original_invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_original_item_id_fkey" FOREIGN KEY ("original_item_id") REFERENCES "invoice_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
