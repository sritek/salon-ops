/**
 * Staff Performance Service
 *
 * Calculates performance metrics for staff members including:
 * - Attendance metrics (present days, late arrivals, overtime)
 * - Commission metrics (total earned, by service type)
 * - Productivity metrics (appointments completed, revenue generated)
 * - Branch comparison (vs branch average)
 */

import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';

export interface AttendanceMetrics {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  lateArrivals: number;
  totalLateMinutes: number;
  overtimeHours: number;
  attendanceRate: number; // percentage
}

export interface CommissionMetrics {
  totalEarned: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  transactionCount: number;
  byService: Record<string, number>;
  averagePerTransaction: number;
}

export interface ProductivityMetrics {
  appointmentsCompleted: number;
  appointmentsCancelled: number;
  appointmentsNoShow: number;
  completionRate: number; // percentage
  totalRevenue: number;
  averageRevenuePerAppointment: number;
  servicesPerformed: number;
}

export interface BranchComparison {
  branchAverageAttendanceRate: number;
  branchAverageCommission: number;
  branchAverageAppointments: number;
  attendanceVsBranch: number; // percentage difference
  commissionVsBranch: number; // percentage difference
  appointmentsVsBranch: number; // percentage difference
}

export interface PerformanceSummary {
  userId: string;
  userName: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  attendance: AttendanceMetrics;
  commission: CommissionMetrics;
  productivity: ProductivityMetrics;
  branchComparison?: BranchComparison;
}

export const performanceService = {
  /**
   * Get performance summary for a staff member
   */
  async getSummary(
    tenantId: string,
    userId: string,
    startDate: string,
    endDate: string,
    branchId?: string
  ): Promise<PerformanceSummary> {
    // Verify staff exists
    const staff = await prisma.staffProfile.findFirst({
      where: { tenantId, userId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!staff) {
      throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
    }

    // Calculate all metrics in parallel
    const [attendance, commission, productivity] = await Promise.all([
      this.calculateAttendanceMetrics(tenantId, userId, startDate, endDate, branchId),
      this.calculateCommissionMetrics(tenantId, userId, startDate, endDate),
      this.calculateProductivityMetrics(tenantId, userId, startDate, endDate, branchId),
    ]);

    // Calculate branch comparison if branchId provided
    let branchComparison: BranchComparison | undefined;
    if (branchId) {
      branchComparison = await this.calculateBranchComparison(
        tenantId,
        branchId,
        startDate,
        endDate,
        attendance,
        commission,
        productivity
      );
    }

    return {
      userId,
      userName: staff.user.name,
      dateRange: { startDate, endDate },
      attendance,
      commission,
      productivity,
      branchComparison,
    };
  },

  /**
   * Calculate attendance metrics
   */
  async calculateAttendanceMetrics(
    tenantId: string,
    userId: string,
    startDate: string,
    endDate: string,
    branchId?: string
  ): Promise<AttendanceMetrics> {
    const records = await prisma.attendance.findMany({
      where: {
        tenantId,
        userId,
        attendanceDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        ...(branchId && { branchId }),
      },
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'present').length;
    const absentDays = records.filter((r) => r.status === 'absent').length;
    const halfDays = records.filter((r) => r.status === 'half_day').length;
    const leaveDays = records.filter((r) => r.status === 'on_leave').length;
    const lateArrivals = records.filter((r) => r.lateMinutes > 0).length;
    const totalLateMinutes = records.reduce((sum, r) => sum + r.lateMinutes, 0);
    const overtimeHours = records.reduce((sum, r) => sum + (r.overtimeHours?.toNumber() || 0), 0);

    // Calculate attendance rate (present + half days count as 0.5)
    const effectiveDays = presentDays + halfDays * 0.5;
    const workingDays =
      totalDays -
      leaveDays -
      records.filter((r) => r.status === 'week_off' || r.status === 'holiday').length;
    const attendanceRate = workingDays > 0 ? (effectiveDays / workingDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      lateArrivals,
      totalLateMinutes,
      overtimeHours,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };
  },

  /**
   * Calculate commission metrics
   */
  async calculateCommissionMetrics(
    tenantId: string,
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<CommissionMetrics> {
    const commissions = await prisma.commission.findMany({
      where: {
        tenantId,
        userId,
        commissionDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const totalEarned = commissions.reduce((sum, c) => sum + c.commissionAmount.toNumber(), 0);
    const pendingAmount = commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.commissionAmount.toNumber(), 0);
    const approvedAmount = commissions
      .filter((c) => c.status === 'approved')
      .reduce((sum, c) => sum + c.commissionAmount.toNumber(), 0);
    const paidAmount = commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount.toNumber(), 0);

    const byService = commissions.reduce(
      (acc, c) => {
        acc[c.serviceName] = (acc[c.serviceName] || 0) + c.commissionAmount.toNumber();
        return acc;
      },
      {} as Record<string, number>
    );

    const transactionCount = commissions.length;
    const averagePerTransaction = transactionCount > 0 ? totalEarned / transactionCount : 0;

    return {
      totalEarned,
      pendingAmount,
      approvedAmount,
      paidAmount,
      transactionCount,
      byService,
      averagePerTransaction: Math.round(averagePerTransaction * 100) / 100,
    };
  },

  /**
   * Calculate productivity metrics from appointments
   */
  async calculateProductivityMetrics(
    tenantId: string,
    userId: string,
    startDate: string,
    endDate: string,
    branchId?: string
  ): Promise<ProductivityMetrics> {
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        stylistId: userId,
        scheduledDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        ...(branchId && { branchId }),
      },
      include: {
        services: true,
      },
    });

    const appointmentsCompleted = appointments.filter((a) => a.status === 'completed').length;
    const appointmentsCancelled = appointments.filter((a) => a.status === 'cancelled').length;
    const appointmentsNoShow = appointments.filter((a) => a.status === 'no_show').length;

    const totalAppointments = appointments.length;
    const completionRate =
      totalAppointments > 0 ? (appointmentsCompleted / totalAppointments) * 100 : 0;

    // Calculate revenue from completed appointments
    const completedAppointments = appointments.filter((a) => a.status === 'completed');
    const totalRevenue = completedAppointments.reduce(
      (sum, a) => sum + (a.totalAmount?.toNumber() || 0),
      0
    );
    const averageRevenuePerAppointment =
      appointmentsCompleted > 0 ? totalRevenue / appointmentsCompleted : 0;

    // Count services performed
    const servicesPerformed = completedAppointments.reduce((sum, a) => sum + a.services.length, 0);

    return {
      appointmentsCompleted,
      appointmentsCancelled,
      appointmentsNoShow,
      completionRate: Math.round(completionRate * 100) / 100,
      totalRevenue,
      averageRevenuePerAppointment: Math.round(averageRevenuePerAppointment * 100) / 100,
      servicesPerformed,
    };
  },

  /**
   * Calculate branch comparison metrics
   */
  async calculateBranchComparison(
    tenantId: string,
    branchId: string,
    startDate: string,
    endDate: string,
    staffAttendance: AttendanceMetrics,
    staffCommission: CommissionMetrics,
    staffProductivity: ProductivityMetrics
  ): Promise<BranchComparison> {
    // Get all staff in the branch
    const branchStaff = await prisma.staffProfile.findMany({
      where: {
        tenantId,
        isActive: true,
        user: {
          branchAssignments: {
            some: { branchId },
          },
        },
      },
      select: { userId: true },
    });

    if (branchStaff.length === 0) {
      return {
        branchAverageAttendanceRate: 0,
        branchAverageCommission: 0,
        branchAverageAppointments: 0,
        attendanceVsBranch: 0,
        commissionVsBranch: 0,
        appointmentsVsBranch: 0,
      };
    }

    // Calculate branch averages
    let totalAttendanceRate = 0;
    let totalCommission = 0;
    let totalAppointments = 0;

    for (const staff of branchStaff) {
      const attendance = await this.calculateAttendanceMetrics(
        tenantId,
        staff.userId,
        startDate,
        endDate,
        branchId
      );
      const commission = await this.calculateCommissionMetrics(
        tenantId,
        staff.userId,
        startDate,
        endDate
      );
      const productivity = await this.calculateProductivityMetrics(
        tenantId,
        staff.userId,
        startDate,
        endDate,
        branchId
      );

      totalAttendanceRate += attendance.attendanceRate;
      totalCommission += commission.totalEarned;
      totalAppointments += productivity.appointmentsCompleted;
    }

    const staffCount = branchStaff.length;
    const branchAverageAttendanceRate = totalAttendanceRate / staffCount;
    const branchAverageCommission = totalCommission / staffCount;
    const branchAverageAppointments = totalAppointments / staffCount;

    // Calculate percentage differences
    const attendanceVsBranch =
      branchAverageAttendanceRate > 0
        ? ((staffAttendance.attendanceRate - branchAverageAttendanceRate) /
            branchAverageAttendanceRate) *
          100
        : 0;

    const commissionVsBranch =
      branchAverageCommission > 0
        ? ((staffCommission.totalEarned - branchAverageCommission) / branchAverageCommission) * 100
        : 0;

    const appointmentsVsBranch =
      branchAverageAppointments > 0
        ? ((staffProductivity.appointmentsCompleted - branchAverageAppointments) /
            branchAverageAppointments) *
          100
        : 0;

    return {
      branchAverageAttendanceRate: Math.round(branchAverageAttendanceRate * 100) / 100,
      branchAverageCommission: Math.round(branchAverageCommission * 100) / 100,
      branchAverageAppointments: Math.round(branchAverageAppointments * 100) / 100,
      attendanceVsBranch: Math.round(attendanceVsBranch * 100) / 100,
      commissionVsBranch: Math.round(commissionVsBranch * 100) / 100,
      appointmentsVsBranch: Math.round(appointmentsVsBranch * 100) / 100,
    };
  },
};
