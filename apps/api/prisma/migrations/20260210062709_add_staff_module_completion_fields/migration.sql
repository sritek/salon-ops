-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "geo_fence_radius" INTEGER DEFAULT 100,
ADD COLUMN     "latitude" DECIMAL(10,8),
ADD COLUMN     "longitude" DECIMAL(11,8);

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "whatsapp_sent_at" TIMESTAMP(3),
ADD COLUMN     "whatsapp_status" VARCHAR(20);

-- CreateTable
CREATE TABLE "tenant_leave_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leave_type" VARCHAR(20) NOT NULL,
    "annual_entitlement" DECIMAL(4,1) NOT NULL,
    "max_carry_forward" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_leave_policies_tenant_id_is_active_idx" ON "tenant_leave_policies"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_leave_policies_tenant_id_leave_type_key" ON "tenant_leave_policies"("tenant_id", "leave_type");
