-- CreateTable
CREATE TABLE "membership_config" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "memberships_enabled" BOOLEAN NOT NULL DEFAULT true,
    "packages_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_validity_unit" VARCHAR(10) NOT NULL DEFAULT 'months',
    "default_validity_value" INTEGER NOT NULL DEFAULT 12,
    "refund_policy" VARCHAR(20) NOT NULL DEFAULT 'partial',
    "cancellation_fee_percentage" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "default_branch_scope" VARCHAR(20) NOT NULL DEFAULT 'all_branches',
    "membership_package_precedence" VARCHAR(30) NOT NULL DEFAULT 'package_first',
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "max_freeze_days_per_year" INTEGER NOT NULL DEFAULT 30,
    "expiry_reminder_days" INTEGER NOT NULL DEFAULT 7,
    "low_balance_threshold" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20),
    "description" TEXT,
    "tier" VARCHAR(20),
    "price" DECIMAL(10,2) NOT NULL,
    "gst_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "validity_value" INTEGER NOT NULL,
    "validity_unit" VARCHAR(10) NOT NULL,
    "branch_scope" VARCHAR(20) NOT NULL DEFAULT 'all_branches',
    "terms_and_conditions" TEXT,
    "sale_commission_type" VARCHAR(20),
    "sale_commission_value" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plan_branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plan_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_benefits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "benefit_type" VARCHAR(30) NOT NULL,
    "service_id" TEXT,
    "category_id" TEXT,
    "discount_type" VARCHAR(20),
    "discount_value" DECIMAL(10,2),
    "complimentary_count" INTEGER,
    "complimentary_period" VARCHAR(20),
    "max_services_per_visit" INTEGER,
    "cooldown_days" INTEGER,
    "benefit_cap_amount" DECIMAL(10,2),
    "benefit_cap_period" VARCHAR(20),
    "priority_level" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "membership_number" VARCHAR(50) NOT NULL,
    "purchase_date" DATE NOT NULL,
    "purchase_branch_id" TEXT NOT NULL,
    "purchase_invoice_id" TEXT,
    "price_paid" DECIMAL(10,2) NOT NULL,
    "gst_paid" DECIMAL(10,2) NOT NULL,
    "total_paid" DECIMAL(10,2) NOT NULL,
    "activation_date" DATE NOT NULL,
    "original_expiry_date" DATE NOT NULL,
    "current_expiry_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "total_freeze_days_used" INTEGER NOT NULL DEFAULT 0,
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "total_discount_availed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_visit_date" DATE,
    "last_visit_branch_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "refund_amount" DECIMAL(10,2),
    "transferred_to_id" TEXT,
    "transferred_from_id" TEXT,
    "sale_commission_amount" DECIMAL(10,2),
    "sale_commission_staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "customer_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_freezes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "freeze_start_date" DATE NOT NULL,
    "freeze_end_date" DATE NOT NULL,
    "freeze_days" INTEGER NOT NULL,
    "reason_code" VARCHAR(30) NOT NULL,
    "reason_description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_freezes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_usage" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "usage_date" DATE NOT NULL,
    "usage_branch_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "invoice_item_id" TEXT,
    "service_id" TEXT,
    "service_name" VARCHAR(255) NOT NULL,
    "benefit_type" VARCHAR(30) NOT NULL,
    "original_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "is_complimentary" BOOLEAN NOT NULL DEFAULT false,
    "complimentary_benefit_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "membership_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20),
    "description" TEXT,
    "package_type" VARCHAR(20) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "mrp" DECIMAL(10,2),
    "gst_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "credit_value" DECIMAL(10,2),
    "validity_value" INTEGER NOT NULL,
    "validity_unit" VARCHAR(10) NOT NULL,
    "branch_scope" VARCHAR(20) NOT NULL DEFAULT 'all_branches',
    "allow_rollover" BOOLEAN NOT NULL DEFAULT false,
    "terms_and_conditions" TEXT,
    "sale_commission_type" VARCHAR(20),
    "sale_commission_value" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_services" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "credit_count" INTEGER NOT NULL,
    "locked_price" DECIMAL(10,2) NOT NULL,
    "variant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_packages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "package_number" VARCHAR(50) NOT NULL,
    "purchase_date" DATE NOT NULL,
    "purchase_branch_id" TEXT NOT NULL,
    "purchase_invoice_id" TEXT,
    "price_paid" DECIMAL(10,2) NOT NULL,
    "gst_paid" DECIMAL(10,2) NOT NULL,
    "total_paid" DECIMAL(10,2) NOT NULL,
    "initial_credit_value" DECIMAL(10,2),
    "remaining_credit_value" DECIMAL(10,2),
    "activation_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "total_redemptions" INTEGER NOT NULL DEFAULT 0,
    "total_redeemed_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_redemption_date" DATE,
    "last_redemption_branch_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "refund_amount" DECIMAL(10,2),
    "transferred_to_id" TEXT,
    "transferred_from_id" TEXT,
    "sale_commission_amount" DECIMAL(10,2),
    "sale_commission_staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "customer_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_credits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_package_id" TEXT NOT NULL,
    "package_service_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "initial_credits" INTEGER NOT NULL,
    "remaining_credits" INTEGER NOT NULL,
    "locked_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_redemptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_package_id" TEXT NOT NULL,
    "package_credit_id" TEXT,
    "redemption_date" DATE NOT NULL,
    "redemption_branch_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "invoice_item_id" TEXT,
    "service_id" TEXT NOT NULL,
    "service_name" VARCHAR(255) NOT NULL,
    "credits_used" INTEGER,
    "value_used" DECIMAL(10,2),
    "locked_price" DECIMAL(10,2) NOT NULL,
    "stylist_id" TEXT,
    "redemption_commission_amount" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "package_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_config_tenant_id_key" ON "membership_config"("tenant_id");

-- CreateIndex
CREATE INDEX "membership_plans_tenant_id_is_active_idx" ON "membership_plans"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_tenant_id_code_key" ON "membership_plans"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "membership_plan_branches_plan_id_idx" ON "membership_plan_branches"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plan_branches_plan_id_branch_id_key" ON "membership_plan_branches"("plan_id", "branch_id");

-- CreateIndex
CREATE INDEX "membership_benefits_plan_id_benefit_type_idx" ON "membership_benefits"("plan_id", "benefit_type");

-- CreateIndex
CREATE INDEX "customer_memberships_customer_id_status_idx" ON "customer_memberships"("customer_id", "status");

-- CreateIndex
CREATE INDEX "customer_memberships_current_expiry_date_status_idx" ON "customer_memberships"("current_expiry_date", "status");

-- CreateIndex
CREATE INDEX "customer_memberships_purchase_branch_id_idx" ON "customer_memberships"("purchase_branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_memberships_tenant_id_membership_number_key" ON "customer_memberships"("tenant_id", "membership_number");

-- CreateIndex
CREATE INDEX "membership_freezes_membership_id_status_idx" ON "membership_freezes"("membership_id", "status");

-- CreateIndex
CREATE INDEX "membership_usage_membership_id_usage_date_idx" ON "membership_usage"("membership_id", "usage_date");

-- CreateIndex
CREATE INDEX "membership_usage_usage_branch_id_usage_date_idx" ON "membership_usage"("usage_branch_id", "usage_date");

-- CreateIndex
CREATE INDEX "packages_tenant_id_is_active_package_type_idx" ON "packages"("tenant_id", "is_active", "package_type");

-- CreateIndex
CREATE UNIQUE INDEX "packages_tenant_id_code_key" ON "packages"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "package_branches_package_id_branch_id_key" ON "package_branches"("package_id", "branch_id");

-- CreateIndex
CREATE INDEX "package_services_package_id_idx" ON "package_services"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_services_package_id_service_id_variant_id_key" ON "package_services"("package_id", "service_id", "variant_id");

-- CreateIndex
CREATE INDEX "customer_packages_customer_id_status_idx" ON "customer_packages"("customer_id", "status");

-- CreateIndex
CREATE INDEX "customer_packages_expiry_date_status_idx" ON "customer_packages"("expiry_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_packages_tenant_id_package_number_key" ON "customer_packages"("tenant_id", "package_number");

-- CreateIndex
CREATE INDEX "package_credits_customer_package_id_idx" ON "package_credits"("customer_package_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_credits_customer_package_id_package_service_id_key" ON "package_credits"("customer_package_id", "package_service_id");

-- CreateIndex
CREATE INDEX "package_redemptions_customer_package_id_redemption_date_idx" ON "package_redemptions"("customer_package_id", "redemption_date");

-- CreateIndex
CREATE INDEX "package_redemptions_redemption_branch_id_redemption_date_idx" ON "package_redemptions"("redemption_branch_id", "redemption_date");

-- AddForeignKey
ALTER TABLE "membership_plan_branches" ADD CONSTRAINT "membership_plan_branches_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_benefits" ADD CONSTRAINT "membership_benefits_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_freezes" ADD CONSTRAINT "membership_freezes_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "customer_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_usage" ADD CONSTRAINT "membership_usage_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "customer_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_branches" ADD CONSTRAINT "package_branches_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_credits" ADD CONSTRAINT "package_credits_customer_package_id_fkey" FOREIGN KEY ("customer_package_id") REFERENCES "customer_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_credits" ADD CONSTRAINT "package_credits_package_service_id_fkey" FOREIGN KEY ("package_service_id") REFERENCES "package_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_customer_package_id_fkey" FOREIGN KEY ("customer_package_id") REFERENCES "customer_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_package_credit_id_fkey" FOREIGN KEY ("package_credit_id") REFERENCES "package_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
