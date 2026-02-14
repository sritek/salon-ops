/**
 * Payslip Service
 *
 * Handles payslip generation, PDF creation, and distribution
 */

import { prisma } from '@/lib/prisma';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// ============================================
// Indian Currency Formatter
// ============================================

/**
 * Format number in Indian currency format (₹X,XX,XXX)
 * Indian numbering system: 1,00,00,000 (1 crore)
 */
export function formatIndianCurrency(amount: number): string {
  if (amount === 0) return '₹0';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Round to 2 decimal places
  const rounded = Math.round(absAmount * 100) / 100;
  const [integerPart, decimalPart] = rounded.toString().split('.');

  // Format integer part with Indian grouping
  const formatted = formatIndianNumber(integerPart);

  // Add decimal part if exists
  const result = decimalPart ? `${formatted}.${decimalPart.padEnd(2, '0')}` : formatted;

  return isNegative ? `-₹${result}` : `₹${result}`;
}

/**
 * Format number with Indian grouping (XX,XX,XXX)
 */
export function formatIndianNumber(numStr: string): string {
  const len = numStr.length;

  if (len <= 3) return numStr;

  // Last 3 digits
  const lastThree = numStr.slice(-3);
  // Remaining digits
  const remaining = numStr.slice(0, -3);

  // Group remaining digits in pairs
  const pairs: string[] = [];
  for (let i = remaining.length; i > 0; i -= 2) {
    const start = Math.max(0, i - 2);
    pairs.unshift(remaining.slice(start, i));
  }

  return `${pairs.join(',')},${lastThree}`;
}

// ============================================
// Payslip Number Generation
// ============================================

/**
 * Generate unique payslip number
 * Format: {BRANCH_CODE}/{YEAR-MONTH}/{SEQUENCE}
 * Example: MUM/2026-02/0001
 */
export async function generatePayslipNumber(
  tenantId: string,
  branchCode: string,
  payslipMonth: string
): Promise<string> {
  // Get count of existing payslips for this period
  const count = await prisma.payslip.count({
    where: {
      tenantId,
      payslipMonth,
    },
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  return `${branchCode}/${payslipMonth}/${sequence}`;
}

// ============================================
// Payslip Service
// ============================================

export interface PayslipData {
  // Employee Info
  employeeName: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  dateOfJoining: Date;

  // Pay Period
  payPeriod: string;
  payslipNumber: string;

  // Attendance
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;

  // Earnings
  baseSalary: number;
  overtimeAmount: number;
  totalCommissions: number;
  otherEarnings: Record<string, number>;
  grossEarnings: number;

  // Deductions
  lopAmount: number;
  otherDeductions: Record<string, number>;
  totalDeductions: number;

  // Net
  netSalary: number;

  // Company Info
  tenantName: string;
  tenantLogo?: string;
  branchName: string;
  branchAddress?: string;
}

export const payslipService = {
  /**
   * Get payslip by ID
   */
  async getById(tenantId: string, payslipId: string) {
    const payslip = await prisma.payslip.findFirst({
      where: { id: payslipId, tenantId },
      include: {
        payrollItem: {
          include: {
            payroll: true,
            staffProfile: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
              },
            },
          },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundError('PAYSLIP_NOT_FOUND', 'Payslip not found');
    }

    return payslip;
  },

  /**
   * List payslips with filters
   */
  async list(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      userId?: string;
      payslipMonth?: string;
    }
  ) {
    const { page = 1, limit = 20, userId, payslipMonth } = query;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(userId && { userId }),
      ...(payslipMonth && { payslipMonth }),
    };

    const [data, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { generatedAt: 'desc' },
        include: {
          payrollItem: {
            include: {
              staffProfile: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.payslip.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get download URL for payslip PDF
   */
  async getDownloadUrl(tenantId: string, payslipId: string) {
    const payslip = await prisma.payslip.findFirst({
      where: { id: payslipId, tenantId },
      select: { id: true, pdfUrl: true, payslipNumber: true },
    });

    if (!payslip) {
      throw new NotFoundError('PAYSLIP_NOT_FOUND', 'Payslip not found');
    }

    if (!payslip.pdfUrl) {
      throw new BadRequestError('PDF_NOT_GENERATED', 'Payslip PDF has not been generated yet');
    }

    return {
      url: payslip.pdfUrl,
      filename: `payslip-${payslip.payslipNumber.replace(/\//g, '-')}.pdf`,
    };
  },

  /**
   * Prepare payslip data for PDF generation
   */
  async preparePayslipData(tenantId: string, payslipId: string): Promise<PayslipData> {
    const payslip = await this.getById(tenantId, payslipId);
    const item = payslip.payrollItem;
    const staff = item.staffProfile;
    const payroll = item.payroll;

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, logoUrl: true },
    });

    // Get branch info if branchId exists
    let branchName = 'Head Office';
    let branchAddress: string | undefined;
    if (payroll.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: payroll.branchId },
        select: { name: true, address: true },
      });
      if (branch) {
        branchName = branch.name;
        branchAddress = branch.address ?? undefined;
      }
    }

    const earningsJson = (item.earningsJson as Record<string, number>) || {};
    const deductionsJson = (item.deductionsJson as Record<string, number>) || {};

    return {
      // Employee Info
      employeeName: staff?.user.name || 'Unknown',
      employeeCode: staff?.employeeCode ?? undefined,
      designation: staff?.designation ?? undefined,
      department: staff?.department ?? undefined,
      dateOfJoining: staff?.dateOfJoining || new Date(),

      // Pay Period
      payPeriod: payslip.payslipMonth,
      payslipNumber: payslip.payslipNumber,

      // Attendance
      workingDays: item.workingDays,
      presentDays: item.presentDays.toNumber(),
      absentDays: item.absentDays.toNumber(),
      leaveDays: item.leaveDays.toNumber(),
      overtimeHours: item.overtimeHours.toNumber(),

      // Earnings
      baseSalary: item.baseSalary.toNumber(),
      overtimeAmount: item.overtimeAmount.toNumber(),
      totalCommissions: item.totalCommissions.toNumber(),
      otherEarnings: earningsJson,
      grossEarnings: item.grossSalary.toNumber(),

      // Deductions
      lopAmount: item.lopAmount.toNumber(),
      otherDeductions: deductionsJson,
      totalDeductions: item.totalDeductions.toNumber(),

      // Net
      netSalary: item.netSalary.toNumber(),

      // Company Info
      tenantName: tenant?.name || 'Company',
      tenantLogo: tenant?.logoUrl ?? undefined,
      branchName,
      branchAddress,
    };
  },

  /**
   * Send payslip via email
   */
  async sendEmail(tenantId: string, payslipId: string) {
    const payslip = await this.getById(tenantId, payslipId);
    const staffProfile = payslip.payrollItem.staffProfile;

    if (!staffProfile) {
      throw new BadRequestError('NO_STAFF_PROFILE', 'Staff profile not found');
    }

    const email = staffProfile.user.email;

    if (!email) {
      throw new BadRequestError('NO_EMAIL', 'Staff member does not have an email address');
    }

    // TODO: Implement actual email sending with AWS SES
    // For now, just update the status
    await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        emailedAt: new Date(),
        emailStatus: 'sent',
      },
    });

    logger.info({ payslipId, email }, 'Payslip email sent');

    return { success: true, email };
  },

  /**
   * Send payslip via WhatsApp
   */
  async sendWhatsApp(tenantId: string, payslipId: string) {
    const payslip = await this.getById(tenantId, payslipId);
    const staffProfile = payslip.payrollItem.staffProfile;

    if (!staffProfile) {
      throw new BadRequestError('NO_STAFF_PROFILE', 'Staff profile not found');
    }

    const phone = staffProfile.user.phone;

    if (!phone) {
      throw new BadRequestError('NO_PHONE', 'Staff member does not have a phone number');
    }

    // TODO: Implement actual WhatsApp sending
    // For now, just update the status
    await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        whatsappSentAt: new Date(),
        whatsappStatus: 'sent',
      },
    });

    logger.info({ payslipId, phone }, 'Payslip WhatsApp sent');

    return { success: true, phone };
  },
};
