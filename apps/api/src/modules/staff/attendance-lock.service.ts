/**
 * Attendance Lock Service
 *
 * Handles attendance locking based on payroll status.
 * Once payroll is processed for a month, attendance records
 * for that month should be locked to prevent modifications.
 */

import { prisma } from '@/lib/prisma';
import { BadRequestError } from '@/lib/errors';

export interface AttendanceLockStatus {
  isLocked: boolean;
  payrollId?: string;
  payrollStatus?: string;
  lockedAt?: Date;
  lockedBy?: string;
  message: string;
}

/**
 * Check if a specific month's attendance is locked for a branch
 */
export async function isMonthLocked(
  tenantId: string,
  branchId: string | null,
  month: string // YYYY-MM format
): Promise<AttendanceLockStatus> {
  // Find payroll for the month
  const payroll = await prisma.payroll.findFirst({
    where: {
      tenantId,
      payrollMonth: month,
      ...(branchId ? { branchId } : {}),
      // Attendance is locked once payroll is processed (not draft)
      status: { in: ['processing', 'approved', 'paid'] },
    },
    select: {
      id: true,
      status: true,
      processedAt: true,
      processedBy: true,
    },
  });

  if (!payroll) {
    return {
      isLocked: false,
      message: 'Attendance is open for modifications',
    };
  }

  return {
    isLocked: true,
    payrollId: payroll.id,
    payrollStatus: payroll.status,
    lockedAt: payroll.processedAt ?? undefined,
    lockedBy: payroll.processedBy ?? undefined,
    message: `Attendance is locked. Payroll for ${month} is in ${payroll.status} status.`,
  };
}

/**
 * Validate if attendance can be modified for a specific date
 * Throws BadRequestError if locked
 */
export async function validateAttendanceModification(
  tenantId: string,
  branchId: string,
  attendanceDate: Date | string
): Promise<void> {
  const date = typeof attendanceDate === 'string' ? new Date(attendanceDate) : attendanceDate;
  const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

  const lockStatus = await isMonthLocked(tenantId, branchId, month);

  if (lockStatus.isLocked) {
    throw new BadRequestError(
      'ATTENDANCE_LOCKED',
      `Cannot modify attendance for ${month}. ${lockStatus.message}`
    );
  }
}

/**
 * Check if attendance can be modified (returns boolean instead of throwing)
 */
export async function canModifyAttendance(
  tenantId: string,
  branchId: string,
  attendanceDate: Date | string
): Promise<boolean> {
  const date = typeof attendanceDate === 'string' ? new Date(attendanceDate) : attendanceDate;
  const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

  const lockStatus = await isMonthLocked(tenantId, branchId, month);
  return !lockStatus.isLocked;
}

/**
 * Get lock status for multiple months
 */
export async function getMonthsLockStatus(
  tenantId: string,
  branchId: string | null,
  months: string[] // Array of YYYY-MM format
): Promise<Record<string, AttendanceLockStatus>> {
  const result: Record<string, AttendanceLockStatus> = {};

  for (const month of months) {
    result[month] = await isMonthLocked(tenantId, branchId, month);
  }

  return result;
}

/**
 * Unlock attendance when payroll is cancelled
 * This is called when payroll status changes back to draft or is cancelled
 */
export async function unlockAttendanceOnPayrollCancel(
  tenantId: string,
  payrollId: string
): Promise<void> {
  // The unlock happens automatically when payroll status changes
  // This function is for logging/auditing purposes
  const payroll = await prisma.payroll.findFirst({
    where: { id: payrollId, tenantId },
    select: { payrollMonth: true, branchId: true, status: true },
  });

  if (payroll && ['draft', 'cancelled'].includes(payroll.status)) {
    // Attendance is now unlocked for this month
    // Log this event for audit trail
    console.log(
      `Attendance unlocked for ${payroll.payrollMonth} (branch: ${payroll.branchId || 'all'})`
    );
  }
}
