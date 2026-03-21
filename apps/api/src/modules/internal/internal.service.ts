/**
 * Internal Admin Service
 * Business logic for tenant provisioning
 */

import bcrypt from 'bcrypt';

import { prisma } from '../../lib/prisma';
import { ConflictError, NotFoundError } from '../../lib/errors';
import type { PaginatedResult } from '../../lib/types';
import type {
  CreateTenantBody,
  CreateBranchBody,
  CreateSuperOwnerBody,
  ListTenantsQuery,
  UpdateTenantBody,
} from './internal.schema';

export class InternalService {
  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantBody) {
    // Check if email already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { email: data.email },
    });

    if (existingTenant) {
      throw new ConflictError('DUPLICATE_ENTRY', 'A tenant with this email already exists');
    }

    const slug = this.generateSlug(data.name);

    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug,
        legalName: data.legalName,
        email: data.email,
        phone: data.phone,
        logoUrl: data.logoUrl,
        subscriptionPlan: data.subscriptionPlan,
        subscriptionStatus: 'active',
        trialEndsAt:
          data.subscriptionPlan === 'trial'
            ? new Date(Date.now() + data.trialDays * 24 * 60 * 60 * 1000)
            : null,
      },
    });

    return tenant;
  }

  /**
   * Create a branch for a tenant
   */
  async createBranch(data: CreateBranchBody) {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    // Generate unique slug for branch within tenant
    const baseSlug = this.generateSlug(data.name);
    let slug = baseSlug;
    let counter = 1;

    while (
      await prisma.branch.findFirst({
        where: { tenantId: data.tenantId, slug },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const branch = await prisma.branch.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        slug,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin,
        isActive: true,
      },
    });

    return branch;
  }

  /**
   * Create a super owner user for a tenant
   */
  async createSuperOwner(data: CreateSuperOwnerBody) {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    // Verify branch exists and belongs to tenant
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, tenantId: data.tenantId },
    });

    if (!branch) {
      throw new NotFoundError('BRANCH_NOT_FOUND', 'Branch not found');
    }

    // Check if email or phone already exists for this tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: data.tenantId,
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictError(
        'DUPLICATE_ENTRY',
        'A user with this email or phone already exists for this tenant'
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: 'super_owner',
        isActive: true,
        branchAssignments: {
          create: {
            branchId: data.branchId,
            isPrimary: true,
          },
        },
      },
      include: {
        branchAssignments: true,
      },
    });

    return user;
  }

  /**
   * List all tenants with pagination
   */
  async listTenants(query: ListTenantsQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
          deletedAt: null,
        }
      : { deletedAt: null };

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              branches: true,
              users: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return {
      data: tenants,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get tenant by ID with branches and users count
   */
  async getTenantById(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
        users: {
          where: { deletedAt: null, role: 'super_owner' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            branches: true,
            users: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    return tenant;
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, data: UpdateTenantBody) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    // Check if email is being changed and already exists
    if (data.email && data.email !== tenant.email) {
      const existingTenant = await prisma.tenant.findFirst({
        where: { email: data.email, id: { not: tenantId } },
      });

      if (existingTenant) {
        throw new ConflictError('DUPLICATE_ENTRY', 'A tenant with this email already exists');
      }
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        legalName: data.legalName,
        email: data.email,
        phone: data.phone,
        logoUrl: data.logoUrl,
        subscriptionPlan: data.subscriptionPlan,
        subscriptionStatus: data.subscriptionStatus,
      },
    });

    return updatedTenant;
  }

  /**
   * Generate URL-safe slug
   */
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }
}

export const internalService = new InternalService();
