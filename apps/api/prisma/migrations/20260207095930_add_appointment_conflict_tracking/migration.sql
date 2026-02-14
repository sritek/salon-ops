-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "conflict_marked_at" TIMESTAMP(3),
ADD COLUMN     "conflict_notes" TEXT,
ADD COLUMN     "conflict_resolved_at" TIMESTAMP(3),
ADD COLUMN     "has_conflict" BOOLEAN NOT NULL DEFAULT false;
