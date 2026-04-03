-- Remove overtime fields from attendance table
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "overtime_hours";

-- Remove overtime fields from payroll_items table
ALTER TABLE "payroll_items" DROP COLUMN IF EXISTS "overtime_hours";
ALTER TABLE "payroll_items" DROP COLUMN IF EXISTS "overtime_rate";
ALTER TABLE "payroll_items" DROP COLUMN IF EXISTS "overtime_amount";
