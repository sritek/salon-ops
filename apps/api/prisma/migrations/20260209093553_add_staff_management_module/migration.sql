-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date_of_birth" DATE,
    "blood_group" VARCHAR(5),
    "emergency_contact_name" VARCHAR(100),
    "emergency_contact_phone" VARCHAR(20),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "employee_code" VARCHAR(50),
    "designation" VARCHAR(100),
    "department" VARCHAR(100),
    "date_of_joining" DATE NOT NULL,
    "date_of_leaving" DATE,
    "employment_type" VARCHAR(20) NOT NULL DEFAULT 'full_time',
    "skill_level" VARCHAR(20),
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aadhar_number" VARCHAR(20),
    "pan_number" VARCHAR(20),
    "bank_account_number" VARCHAR(30),
    "bank_name" VARCHAR(100),
    "bank_ifsc" VARCHAR(20),
    "salary_type" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "base_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_commission_type" VARCHAR(20),
    "default_commission_rate" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "break_duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "applicable_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_shift_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "staff_shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "check_in_time" VARCHAR(8),
    "check_out_time" VARCHAR(8),
    "scheduled_hours" DECIMAL(4,2),
    "actual_hours" DECIMAL(4,2),
    "overtime_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'absent',
    "leave_id" TEXT,
    "notes" TEXT,
    "is_manual_entry" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "check_in_latitude" DECIMAL(10,8),
    "check_in_longitude" DECIMAL(11,8),
    "check_out_latitude" DECIMAL(10,8),
    "check_out_longitude" DECIMAL(11,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "leave_type" VARCHAR(20) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" DECIMAL(4,1) NOT NULL,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "half_day_type" VARCHAR(20),
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "financial_year" VARCHAR(10) NOT NULL,
    "leave_type" VARCHAR(20) NOT NULL,
    "opening_balance" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "accrued" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "used" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "lapsed" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "carried_forward" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "invoice_item_id" TEXT NOT NULL,
    "service_id" TEXT,
    "service_name" VARCHAR(255) NOT NULL,
    "service_amount" DECIMAL(10,2) NOT NULL,
    "commission_type" VARCHAR(20) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "role_type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "payroll_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "commission_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_components" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "component_type" VARCHAR(20) NOT NULL,
    "calculation_type" VARCHAR(20) NOT NULL,
    "calculation_base" VARCHAR(50),
    "default_value" DECIMAL(10,2),
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_salary_structure" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "staff_salary_structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_deductions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "deduction_type" VARCHAR(20) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "monthly_deduction" DECIMAL(10,2) NOT NULL,
    "remaining_amount" DECIMAL(10,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "staff_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "payroll_month" VARCHAR(7) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "total_employees" INTEGER NOT NULL DEFAULT 0,
    "total_gross_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_commissions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_net_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "working_days" INTEGER NOT NULL,
    "present_days" DECIMAL(4,1) NOT NULL,
    "absent_days" DECIMAL(4,1) NOT NULL,
    "leave_days" DECIMAL(4,1) NOT NULL,
    "overtime_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "base_salary" DECIMAL(10,2) NOT NULL,
    "earnings_json" JSONB NOT NULL,
    "total_earnings" DECIMAL(10,2) NOT NULL,
    "total_commissions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commission_count" INTEGER NOT NULL DEFAULT 0,
    "deductions_json" JSONB NOT NULL,
    "total_deductions" DECIMAL(10,2) NOT NULL,
    "overtime_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overtime_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lop_days" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "lop_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gross_salary" DECIMAL(10,2) NOT NULL,
    "net_salary" DECIMAL(10,2) NOT NULL,
    "payment_mode" VARCHAR(20),
    "payment_reference" VARCHAR(100),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payroll_item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payslip_number" VARCHAR(50) NOT NULL,
    "payslip_month" VARCHAR(7) NOT NULL,
    "pdf_url" VARCHAR(500),
    "generated_at" TIMESTAMP(3),
    "emailed_at" TIMESTAMP(3),
    "email_status" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_user_id_key" ON "staff_profiles"("user_id");

-- CreateIndex
CREATE INDEX "staff_profiles_tenant_id_user_id_idx" ON "staff_profiles"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "staff_profiles_tenant_id_employee_code_idx" ON "staff_profiles"("tenant_id", "employee_code");

-- CreateIndex
CREATE INDEX "shifts_branch_id_is_active_idx" ON "shifts"("branch_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_branch_id_name_key" ON "shifts"("branch_id", "name");

-- CreateIndex
CREATE INDEX "staff_shift_assignments_user_id_effective_from_idx" ON "staff_shift_assignments"("user_id", "effective_from");

-- CreateIndex
CREATE INDEX "attendance_user_id_attendance_date_idx" ON "attendance"("user_id", "attendance_date");

-- CreateIndex
CREATE INDEX "attendance_branch_id_attendance_date_idx" ON "attendance"("branch_id", "attendance_date");

-- CreateIndex
CREATE INDEX "attendance_branch_id_status_attendance_date_idx" ON "attendance"("branch_id", "status", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_branch_id_user_id_attendance_date_key" ON "attendance"("branch_id", "user_id", "attendance_date");

-- CreateIndex
CREATE INDEX "leaves_user_id_start_date_idx" ON "leaves"("user_id", "start_date");

-- CreateIndex
CREATE INDEX "leaves_user_id_status_idx" ON "leaves"("user_id", "status");

-- CreateIndex
CREATE INDEX "leave_balances_user_id_financial_year_idx" ON "leave_balances"("user_id", "financial_year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_user_id_financial_year_leave_type_key" ON "leave_balances"("user_id", "financial_year", "leave_type");

-- CreateIndex
CREATE INDEX "commissions_user_id_commission_date_idx" ON "commissions"("user_id", "commission_date");

-- CreateIndex
CREATE INDEX "commissions_invoice_id_idx" ON "commissions"("invoice_id");

-- CreateIndex
CREATE INDEX "commissions_user_id_status_idx" ON "commissions"("user_id", "status");

-- CreateIndex
CREATE INDEX "commissions_payroll_id_idx" ON "commissions"("payroll_id");

-- CreateIndex
CREATE UNIQUE INDEX "salary_components_tenant_id_code_key" ON "salary_components"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "staff_salary_structure_user_id_effective_from_idx" ON "staff_salary_structure"("user_id", "effective_from");

-- CreateIndex
CREATE INDEX "staff_deductions_user_id_status_idx" ON "staff_deductions"("user_id", "status");

-- CreateIndex
CREATE INDEX "payroll_tenant_id_payroll_month_idx" ON "payroll"("tenant_id", "payroll_month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_tenant_id_branch_id_payroll_month_key" ON "payroll"("tenant_id", "branch_id", "payroll_month");

-- CreateIndex
CREATE INDEX "payroll_items_payroll_id_idx" ON "payroll_items"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_items_user_id_idx" ON "payroll_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payroll_item_id_key" ON "payslips"("payroll_item_id");

-- CreateIndex
CREATE INDEX "payslips_user_id_payslip_month_idx" ON "payslips"("user_id", "payslip_month");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_tenant_id_payslip_number_key" ON "payslips"("tenant_id", "payslip_number");

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shift_assignments" ADD CONSTRAINT "staff_shift_assignments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "leaves"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_salary_structure" ADD CONSTRAINT "staff_salary_structure_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_salary_structure" ADD CONSTRAINT "staff_salary_structure_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "salary_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_deductions" ADD CONSTRAINT "staff_deductions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_item_id_fkey" FOREIGN KEY ("payroll_item_id") REFERENCES "payroll_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
