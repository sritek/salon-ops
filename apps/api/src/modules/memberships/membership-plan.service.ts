/**
 * Membership Plan Service
 * Business logic for membership plan management
 * Requirements: 1.1, 1.2
 */

import { prisma, serializeDecimals } from '../../lib/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../../lib/errors';
import type { Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../lib/types';
import type {
  CreateMembershipPlanBody,
  UpdateMembershipPlanBody,
  MembershipPlanQuery,
  CreateBenefitBody,
  UpdateBenefitBody,
} from './membership-plan.schema';

export class MembershipPlanService {
  /**
   * Create a new membership plan
   */
  async create(tenantId: string, data: CreateMembershipPlanBody, createdBy?: string) {
    // Check code uniqueness if provided
    if (data.code) {
      const existing = await prisma.membershipPlan.findUnique({
        where: { tenantId_code: { tenantId, code: data.code } },
      });
      if (existing) {
        throw new ConflictError('DUPLICATE_CODE', 'Membership plan with this code already exists');
      }
    }

    // Validate branch scope
    if (
      data.branchScope === 'specific_branches' &&
      (!data.branchIds || data.branchIds.length === 0)
    ) {
      throw new BadRequestError(
        'INVALID_BRANCH_SCOPE',
        'Branch IDs required for specific_branches scope'
      );
    }

    const { benefits, branchIds, ...planData } = data;

    const plan = await prisma.membershipPlan.create({
      data: {
        tenantId,
        ...planData,
        createdBy,
        // Create branch associations if specific_branches
        ...(data.branchScope === 'specific_branches' &&
          branchIds && {
            branches: {
              create: branchIds.map((branchId) => ({
                tenantId,
                branchId,
              })),
            },
          }),
        // Create benefits if provided
        ...(benefits &&
          benefits.length > 0 && {
            benefits: {
              create: benefits.map((benefit) => ({
                tenantId,
                ...benefit,
              })),
            },
          }),
      },
      include: {
        branches: true,
        benefits: true,
      },
    });

    return serializeDecimals(plan);
  }

  /**
   * Get a membership plan by ID
   */
  async getById(tenantId: string, id: string) {
    const plan = await prisma.membershipPlan.findFirst({
      where: { id, tenantId },
      include: {
        branches: true,
        benefits: {
          orderBy: { priorityLevel: 'desc' },
        },
        _count: {
          select: { customerMemberships: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError('PLAN_NOT_FOUND', 'Membership plan not found');
    }

    return serializeDecimals(plan);
  }

  /**
   * List membership plans with filtering and pagination
   */
  async list(tenantId: string, query: MembershipPlanQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, tier, branchId, isActive, search, sortBy, sortOrder } = query;

    const where: Prisma.MembershipPlanWhereInput = { tenantId };

    if (tier) {
      where.tier = tier;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by branch availability
    if (branchId) {
      where.OR = [{ branchScope: 'all_branches' }, { branches: { some: { branchId } } }];
    }

    const [data, total] = await Promise.all([
      prisma.membershipPlan.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          branches: true,
          benefits: {
            orderBy: { priorityLevel: 'desc' },
          },
          _count: {
            select: { customerMemberships: true },
          },
        },
      }),
      prisma.membershipPlan.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a membership plan
   */
  async update(tenantId: string, id: string, data: UpdateMembershipPlanBody, _updatedBy?: string) {
    const existing = await prisma.membershipPlan.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError('PLAN_NOT_FOUND', 'Membership plan not found');
    }

    // Check code uniqueness if changed
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.membershipPlan.findFirst({
        where: { tenantId, code: data.code, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictError('DUPLICATE_CODE', 'Membership plan with this code already exists');
      }
    }

    const { branchIds, ...updateData } = data;

    // Handle branch scope changes
    const branchOperations: Prisma.MembershipPlanUpdateInput = {};
    if (data.branchScope === 'all_branches') {
      // Remove all branch associations
      branchOperations.branches = { deleteMany: {} };
    } else if (data.branchScope === 'specific_branches' && branchIds) {
      // Replace branch associations
      branchOperations.branches = {
        deleteMany: {},
        create: branchIds.map((branchId) => ({
          tenantId,
          branchId,
        })),
      };
    }

    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: {
        ...updateData,
        ...branchOperations,
      },
      include: {
        branches: true,
        benefits: {
          orderBy: { priorityLevel: 'desc' },
        },
      },
    });

    return serializeDecimals(plan);
  }

  /**
   * Delete (deactivate) a membership plan
   */
  async delete(tenantId: string, id: string) {
    const plan = await prisma.membershipPlan.findFirst({
      where: { id, tenantId },
      include: {
        customerMemberships: {
          where: { status: { in: ['active', 'frozen'] } },
          take: 1,
        },
      },
    });

    if (!plan) {
      throw new NotFoundError('PLAN_NOT_FOUND', 'Membership plan not found');
    }

    // Cannot delete if has active memberships
    if (plan.customerMemberships.length > 0) {
      throw new BadRequestError(
        'PLAN_HAS_ACTIVE_MEMBERSHIPS',
        'Cannot delete plan with active memberships. Deactivate instead.'
      );
    }

    // Soft delete by deactivating
    await prisma.membershipPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================
  // Benefit Management
  // ============================================

  /**
   * Add a benefit to a membership plan
   */
  async addBenefit(tenantId: string, planId: string, data: CreateBenefitBody) {
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: planId, tenantId },
    });

    if (!plan) {
      throw new NotFoundError('PLAN_NOT_FOUND', 'Membership plan not found');
    }

    const benefit = await prisma.membershipBenefit.create({
      data: {
        tenantId,
        planId,
        ...data,
      },
    });

    return serializeDecimals(benefit);
  }

  /**
   * Update a benefit
   */
  async updateBenefit(
    tenantId: string,
    planId: string,
    benefitId: string,
    data: UpdateBenefitBody
  ) {
    const benefit = await prisma.membershipBenefit.findFirst({
      where: { id: benefitId, planId, tenantId },
    });

    if (!benefit) {
      throw new NotFoundError('BENEFIT_NOT_FOUND', 'Benefit not found');
    }

    const updated = await prisma.membershipBenefit.update({
      where: { id: benefitId },
      data,
    });

    return serializeDecimals(updated);
  }

  /**
   * Remove a benefit from a membership plan
   */
  async removeBenefit(tenantId: string, planId: string, benefitId: string) {
    const benefit = await prisma.membershipBenefit.findFirst({
      where: { id: benefitId, planId, tenantId },
    });

    if (!benefit) {
      throw new NotFoundError('BENEFIT_NOT_FOUND', 'Benefit not found');
    }

    await prisma.membershipBenefit.delete({
      where: { id: benefitId },
    });
  }

  /**
   * Get plans available at a specific branch
   */
  async getPlansForBranch(tenantId: string, branchId: string) {
    const plans = await prisma.membershipPlan.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ branchScope: 'all_branches' }, { branches: { some: { branchId } } }],
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        benefits: {
          where: { isActive: true },
          orderBy: { priorityLevel: 'desc' },
        },
      },
    });

    return serializeDecimals(plans);
  }
}

export const membershipPlanService = new MembershipPlanService();
