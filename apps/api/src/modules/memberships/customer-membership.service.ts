/**
 * Customer Membership Service
 * Business logic for customer membership management
 * Requirements: 3.1, 3.2, 6.1
 */

import { prisma, serializeDecimals } from '../../lib/prisma';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { addDays, addMonths, addYears, differenceInDays, format, parseISO } from 'date-fns';
import type { Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../lib/types';
import type {
  SellMembershipBody,
  FreezeMembershipBody,
  CancelMembershipBody,
  CustomerMembershipQuery,
  MembershipUsageQuery,
} from './customer-membership.schema';

/**
 * Generate membership number: MEM-{TENANT_CODE}-{YYYYMM}-{SEQUENCE}
 */
async function generateMembershipNumber(tenantId: string): Promise<string> {
  const now = new Date();
  const yearMonth = format(now, 'yyyyMM');

  // Get tenant slug for code
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  const tenantCode = tenant?.slug?.substring(0, 4).toUpperCase() || 'SALN';

  // Get next sequence for this month
  const count = await prisma.customerMembership.count({
    where: {
      tenantId,
      membershipNumber: { startsWith: `MEM-${tenantCode}-${yearMonth}` },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `MEM-${tenantCode}-${yearMonth}-${sequence}`;
}

/**
 * Calculate expiry date based on validity
 */
function calculateExpiryDate(
  activationDate: Date,
  validityValue: number,
  validityUnit: string
): Date {
  switch (validityUnit) {
    case 'days':
      return addDays(activationDate, validityValue);
    case 'months':
      return addMonths(activationDate, validityValue);
    case 'years':
      return addYears(activationDate, validityValue);
    default:
      return addMonths(activationDate, validityValue);
  }
}

export class CustomerMembershipService {
  /**
   * Sell a membership to a customer
   */
  async sell(tenantId: string, data: SellMembershipBody, createdBy?: string) {
    // Validate customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    // Validate plan exists and is active
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: data.planId, tenantId, isActive: true },
      include: { branches: true },
    });
    if (!plan) {
      throw new NotFoundError('PLAN_NOT_FOUND', 'Membership plan not found or inactive');
    }

    // Validate branch eligibility
    if (plan.branchScope === 'specific_branches') {
      const branchAllowed = plan.branches.some((b) => b.branchId === data.branchId);
      if (!branchAllowed) {
        throw new BadRequestError('BRANCH_NOT_ELIGIBLE', 'Plan not available at this branch');
      }
    }

    // Check if customer already has an active membership of this plan
    const existingMembership = await prisma.customerMembership.findFirst({
      where: {
        tenantId,
        customerId: data.customerId,
        planId: data.planId,
        status: { in: ['active', 'frozen'] },
      },
    });
    if (existingMembership) {
      throw new BadRequestError(
        'MEMBERSHIP_EXISTS',
        'Customer already has an active membership of this plan'
      );
    }

    // Calculate dates
    const activationDate = data.activationDate ? parseISO(data.activationDate) : new Date();
    const expiryDate = calculateExpiryDate(activationDate, plan.validityValue, plan.validityUnit);

    // Calculate pricing
    const price = Number(plan.price);
    const gstRate = Number(plan.gstRate);
    const gstAmount = price * (gstRate / 100);
    const totalAmount = price + gstAmount;

    // Calculate commission if applicable
    let commissionAmount: number | null = null;
    if (plan.saleCommissionType && plan.saleCommissionValue && data.staffId) {
      if (plan.saleCommissionType === 'percentage') {
        commissionAmount = price * (Number(plan.saleCommissionValue) / 100);
      } else {
        commissionAmount = Number(plan.saleCommissionValue);
      }
    }

    // Generate membership number
    const membershipNumber = await generateMembershipNumber(tenantId);

    // Create membership
    const membership = await prisma.customerMembership.create({
      data: {
        tenantId,
        customerId: data.customerId,
        planId: data.planId,
        membershipNumber,
        purchaseDate: new Date(),
        purchaseBranchId: data.branchId,
        pricePaid: price,
        gstPaid: gstAmount,
        totalPaid: totalAmount,
        activationDate,
        originalExpiryDate: expiryDate,
        currentExpiryDate: expiryDate,
        status: 'active',
        saleCommissionAmount: commissionAmount,
        saleCommissionStaffId: data.staffId,
        createdBy,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        plan: { select: { id: true, name: true, tier: true } },
      },
    });

    return serializeDecimals({
      membership,
      expiryDate: format(expiryDate, 'yyyy-MM-dd'),
    });
  }

  /**
   * Get a customer membership by ID
   */
  async getById(tenantId: string, id: string) {
    const membership = await prisma.customerMembership.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        plan: {
          include: {
            benefits: { where: { isActive: true }, orderBy: { priorityLevel: 'desc' } },
          },
        },
        freezes: { orderBy: { createdAt: 'desc' } },
        _count: { select: { usage: true } },
      },
    });

    if (!membership) {
      throw new NotFoundError('MEMBERSHIP_NOT_FOUND', 'Membership not found');
    }

    return serializeDecimals(membership);
  }

  /**
   * List customer memberships with filtering and pagination
   */
  async list(tenantId: string, query: CustomerMembershipQuery): Promise<PaginatedResult<unknown>> {
    const {
      page,
      limit,
      customerId,
      planId,
      branchId,
      status,
      expiringWithinDays,
      search,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.CustomerMembershipWhereInput = { tenantId };

    if (customerId) where.customerId = customerId;
    if (planId) where.planId = planId;
    if (branchId) where.purchaseBranchId = branchId;
    if (status) where.status = status;

    if (expiringWithinDays) {
      const futureDate = addDays(new Date(), expiringWithinDays);
      where.currentExpiryDate = { lte: futureDate };
      where.status = 'active';
    }

    if (search) {
      where.OR = [
        { membershipNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.customerMembership.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          plan: { select: { id: true, name: true, tier: true } },
        },
      }),
      prisma.customerMembership.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Freeze a membership
   */
  async freeze(tenantId: string, id: string, data: FreezeMembershipBody, requestedBy?: string) {
    const membership = await prisma.customerMembership.findFirst({
      where: { id, tenantId, status: 'active' },
    });

    if (!membership) {
      throw new NotFoundError('MEMBERSHIP_NOT_FOUND', 'Active membership not found');
    }

    // Get config for freeze limits
    const config = await prisma.membershipConfig.findUnique({
      where: { tenantId },
    });
    const maxFreezeDays = config?.maxFreezeDaysPerYear || 30;

    // Calculate freeze days
    const freezeStart = parseISO(data.freezeStartDate);
    const freezeEnd = parseISO(data.freezeEndDate);
    const freezeDays = differenceInDays(freezeEnd, freezeStart) + 1;

    // Check freeze limit
    const totalFreezeDays = membership.totalFreezeDaysUsed + freezeDays;
    if (totalFreezeDays > maxFreezeDays) {
      throw new BadRequestError(
        'FREEZE_LIMIT_EXCEEDED',
        `Cannot freeze. Maximum ${maxFreezeDays} days per year. Used: ${membership.totalFreezeDaysUsed}, Requested: ${freezeDays}`
      );
    }

    // Calculate new expiry date (extend by freeze days)
    const newExpiryDate = addDays(membership.currentExpiryDate, freezeDays);

    // Create freeze record and update membership
    const [freeze, updatedMembership] = await prisma.$transaction([
      prisma.membershipFreeze.create({
        data: {
          tenantId,
          membershipId: id,
          freezeStartDate: freezeStart,
          freezeEndDate: freezeEnd,
          freezeDays,
          reasonCode: data.reasonCode,
          reasonDescription: data.reasonDescription,
          status: 'active',
          requestedBy,
        },
      }),
      prisma.customerMembership.update({
        where: { id },
        data: {
          status: 'frozen',
          totalFreezeDaysUsed: totalFreezeDays,
          currentExpiryDate: newExpiryDate,
        },
        include: {
          customer: { select: { id: true, name: true } },
          plan: { select: { id: true, name: true } },
        },
      }),
    ]);

    return serializeDecimals({
      membership: updatedMembership,
      freeze,
      newExpiryDate: format(newExpiryDate, 'yyyy-MM-dd'),
      remainingFreezeDays: maxFreezeDays - totalFreezeDays,
    });
  }

  /**
   * Unfreeze a membership (end freeze early)
   */
  async unfreeze(tenantId: string, id: string, userId?: string) {
    const membership = await prisma.customerMembership.findFirst({
      where: { id, tenantId, status: 'frozen' },
      include: {
        freezes: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError('MEMBERSHIP_NOT_FOUND', 'Frozen membership not found');
    }

    const activeFreeze = membership.freezes[0];
    if (!activeFreeze) {
      throw new BadRequestError('NO_ACTIVE_FREEZE', 'No active freeze found');
    }

    // Calculate actual freeze days used
    const today = new Date();
    const actualFreezeDays = differenceInDays(today, activeFreeze.freezeStartDate) + 1;
    const unusedFreezeDays = activeFreeze.freezeDays - actualFreezeDays;

    // Adjust expiry date (remove unused freeze days)
    const adjustedExpiryDate = addDays(membership.currentExpiryDate, -unusedFreezeDays);

    // Update freeze and membership
    const [, updatedMembership] = await prisma.$transaction([
      prisma.membershipFreeze.update({
        where: { id: activeFreeze.id },
        data: {
          status: 'completed',
          freezeEndDate: today,
          freezeDays: actualFreezeDays,
          approvedAt: new Date(),
          approvedBy: userId,
        },
      }),
      prisma.customerMembership.update({
        where: { id },
        data: {
          status: 'active',
          totalFreezeDaysUsed: membership.totalFreezeDaysUsed - unusedFreezeDays,
          currentExpiryDate: adjustedExpiryDate,
        },
        include: {
          customer: { select: { id: true, name: true } },
          plan: { select: { id: true, name: true } },
        },
      }),
    ]);

    return serializeDecimals({
      membership: updatedMembership,
      actualFreezeDays,
      unusedFreezeDays,
    });
  }

  /**
   * Cancel a membership
   */
  async cancel(tenantId: string, id: string, data: CancelMembershipBody, cancelledBy?: string) {
    const membership = await prisma.customerMembership.findFirst({
      where: { id, tenantId, status: { in: ['active', 'frozen'] } },
    });

    if (!membership) {
      throw new NotFoundError('MEMBERSHIP_NOT_FOUND', 'Active membership not found');
    }

    // Get config for refund calculation
    const config = await prisma.membershipConfig.findUnique({
      where: { tenantId },
    });

    // Calculate prorated refund
    let refundAmount = 0;
    if (config?.refundPolicy !== 'non_refundable') {
      const totalDays = differenceInDays(membership.originalExpiryDate, membership.activationDate);
      const usedDays = differenceInDays(new Date(), membership.activationDate);
      const remainingDays = Math.max(0, totalDays - usedDays);
      const dailyRate = Number(membership.pricePaid) / totalDays;
      refundAmount = dailyRate * remainingDays;

      // Apply cancellation fee if partial refund
      if (config?.refundPolicy === 'partial' && config.cancellationFeePercentage) {
        const fee = refundAmount * (Number(config.cancellationFeePercentage) / 100);
        refundAmount = Math.max(0, refundAmount - fee);
      }
    }

    const updatedMembership = await prisma.customerMembership.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: data.reason,
        refundAmount,
      },
      include: {
        customer: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
      },
    });

    return serializeDecimals({
      membership: updatedMembership,
      refundAmount,
    });
  }

  /**
   * Get membership usage history
   */
  async getUsage(
    tenantId: string,
    membershipId: string,
    query: MembershipUsageQuery
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit, startDate, endDate } = query;

    const where: Prisma.MembershipUsageWhereInput = { tenantId, membershipId };

    if (startDate || endDate) {
      where.usageDate = {};
      if (startDate) where.usageDate.gte = parseISO(startDate);
      if (endDate) where.usageDate.lte = parseISO(endDate);
    }

    const [data, total] = await Promise.all([
      prisma.membershipUsage.findMany({
        where,
        orderBy: { usageDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.membershipUsage.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get customer's active memberships
   */
  async getCustomerMemberships(tenantId: string, customerId: string) {
    const memberships = await prisma.customerMembership.findMany({
      where: {
        tenantId,
        customerId,
        status: { in: ['active', 'frozen'] },
      },
      include: {
        plan: {
          include: {
            benefits: { where: { isActive: true }, orderBy: { priorityLevel: 'desc' } },
          },
        },
      },
      orderBy: { currentExpiryDate: 'asc' },
    });

    return serializeDecimals(memberships);
  }
}

export const customerMembershipService = new CustomerMembershipService();
