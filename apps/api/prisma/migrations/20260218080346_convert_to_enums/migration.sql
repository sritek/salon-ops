-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_owner', 'regional_manager', 'branch_manager', 'receptionist', 'stylist', 'accountant');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('booked', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('online', 'phone', 'walk_in');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'finalized', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'partial', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'upi', 'wallet', 'loyalty', 'package', 'membership', 'bank_transfer', 'cheque');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('casual', 'sick', 'earned', 'unpaid', 'emergency', 'maternity', 'paternity', 'comp_off');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('receipt', 'consumption', 'transfer_out', 'transfer_in', 'adjustment', 'wastage', 'sale', 'return_stock', 'audit');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('consumable', 'retail', 'both');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'frozen', 'expired', 'cancelled', 'transferred');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('active', 'depleted', 'expired', 'cancelled', 'transferred');

-- Convert users.role to enum
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";

-- Convert appointments.status to enum
ALTER TABLE "appointments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "appointments" ALTER COLUMN "status" TYPE "AppointmentStatus" USING "status"::"AppointmentStatus";
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'booked'::"AppointmentStatus";

-- Convert appointments.booking_type to enum
ALTER TABLE "appointments" ALTER COLUMN "booking_type" DROP DEFAULT;
ALTER TABLE "appointments" ALTER COLUMN "booking_type" TYPE "AppointmentType" USING "booking_type"::"AppointmentType";
ALTER TABLE "appointments" ALTER COLUMN "booking_type" SET DEFAULT 'walk_in'::"AppointmentType";

-- Convert invoices.status to enum
ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "InvoiceStatus" USING "status"::"InvoiceStatus";
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'draft'::"InvoiceStatus";

-- Convert invoices.payment_status to enum
ALTER TABLE "invoices" ALTER COLUMN "payment_status" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "payment_status" TYPE "PaymentStatus" USING "payment_status"::"PaymentStatus";
ALTER TABLE "invoices" ALTER COLUMN "payment_status" SET DEFAULT 'pending'::"PaymentStatus";

-- Convert payments.payment_method to enum
ALTER TABLE "payments" ALTER COLUMN "payment_method" TYPE "PaymentMethod" USING "payment_method"::"PaymentMethod";

-- Convert leaves.leave_type to enum
ALTER TABLE "leaves" ALTER COLUMN "leave_type" TYPE "LeaveType" USING "leave_type"::"LeaveType";

-- Convert leaves.status to enum
ALTER TABLE "leaves" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "leaves" ALTER COLUMN "status" TYPE "LeaveStatus" USING "status"::"LeaveStatus";
ALTER TABLE "leaves" ALTER COLUMN "status" SET DEFAULT 'pending'::"LeaveStatus";

-- Convert stock_movements.movement_type to enum
ALTER TABLE "stock_movements" ALTER COLUMN "movement_type" TYPE "MovementType" USING "movement_type"::"MovementType";

-- Convert products.product_type to enum
ALTER TABLE "products" ALTER COLUMN "product_type" TYPE "ProductType" USING "product_type"::"ProductType";

-- Convert customer_memberships.status to enum
ALTER TABLE "customer_memberships" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "customer_memberships" ALTER COLUMN "status" TYPE "MembershipStatus" USING "status"::"MembershipStatus";
ALTER TABLE "customer_memberships" ALTER COLUMN "status" SET DEFAULT 'active'::"MembershipStatus";

-- Convert customer_packages.status to enum
ALTER TABLE "customer_packages" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "customer_packages" ALTER COLUMN "status" TYPE "PackageStatus" USING "status"::"PackageStatus";
ALTER TABLE "customer_packages" ALTER COLUMN "status" SET DEFAULT 'active'::"PackageStatus";
