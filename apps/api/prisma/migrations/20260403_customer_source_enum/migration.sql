-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('manual', 'walk_in', 'online_booking', 'phone', 'import');

-- AlterTable: convert varchar column to enum
ALTER TABLE "customers" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "customers" ALTER COLUMN "source" TYPE "CustomerSource" USING "source"::"CustomerSource";
ALTER TABLE "customers" ALTER COLUMN "source" SET DEFAULT 'manual';
