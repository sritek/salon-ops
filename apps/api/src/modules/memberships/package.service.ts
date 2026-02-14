/**
 * Package Service
 * Business logic for package management
 * Requirements: 2.1, 2.2
 */

import { prisma, serializeDecimals } from '../../lib/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../../lib/errors';
import type { Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../lib/types';
import type { CreatePackageBody, UpdatePackageBody, PackageQuery } from './package.schema';

export class PackageService {
  /**
   * Create a new package
   */
  async create(tenantId: string, data: CreatePackageBody, createdBy?: string) {
    // Check code uniqueness if provided
    if (data.code) {
      const existing = await prisma.package.findUnique({
        where: { tenantId_code: { tenantId, code: data.code } },
      });
      if (existing) {
        throw new ConflictError('DUPLICATE_CODE', 'Package with this code already exists');
      }
    }

    // Validate package type requirements
    if (data.packageType === 'value_package' && !data.creditValue) {
      throw new BadRequestError('INVALID_PACKAGE', 'Value packages require creditValue');
    }

    if (
      (data.packageType === 'service_package' || data.packageType === 'combo_package') &&
      (!data.services || data.services.length === 0)
    ) {
      throw new BadRequestError('INVALID_PACKAGE', 'Service/combo packages require services');
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

    const { services, branchIds, ...packageData } = data;

    // Get service prices for locking
    let serviceDataWithPrices: Array<{
      serviceId: string;
      variantId: string | null;
      creditCount: number;
      lockedPrice: number;
    }> = [];

    if (services && services.length > 0) {
      const serviceIds = services.map((s) => s.serviceId);
      const dbServices = await prisma.service.findMany({
        where: { id: { in: serviceIds }, tenantId },
        include: { variants: true },
      });

      serviceDataWithPrices = services.map((s) => {
        const dbService = dbServices.find((ds) => ds.id === s.serviceId);
        if (!dbService) {
          throw new BadRequestError('SERVICE_NOT_FOUND', `Service ${s.serviceId} not found`);
        }

        let lockedPrice = Number(dbService.basePrice);

        // Apply variant price adjustment if variant specified
        if (s.variantId) {
          const variant = dbService.variants.find((v) => v.id === s.variantId);
          if (!variant) {
            throw new BadRequestError('VARIANT_NOT_FOUND', `Variant ${s.variantId} not found`);
          }
          if (variant.priceAdjustmentType === 'absolute') {
            lockedPrice = Number(variant.priceAdjustment);
          } else {
            lockedPrice += Number(variant.priceAdjustment);
          }
        }

        return {
          serviceId: s.serviceId,
          variantId: s.variantId || null,
          creditCount: s.creditCount,
          lockedPrice,
        };
      });
    }

    const pkg = await prisma.package.create({
      data: {
        tenantId,
        ...packageData,
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
        // Create service associations
        ...(serviceDataWithPrices.length > 0 && {
          services: {
            create: serviceDataWithPrices.map((s) => ({
              tenantId,
              serviceId: s.serviceId,
              variantId: s.variantId,
              creditCount: s.creditCount,
              lockedPrice: s.lockedPrice,
            })),
          },
        }),
      },
      include: {
        branches: true,
        services: {
          include: {
            package: false,
          },
        },
      },
    });

    return serializeDecimals(pkg);
  }

  /**
   * Get a package by ID
   */
  async getById(tenantId: string, id: string) {
    const pkg = await prisma.package.findFirst({
      where: { id, tenantId },
      include: {
        branches: true,
        services: true,
        _count: {
          select: { customerPackages: true },
        },
      },
    });

    if (!pkg) {
      throw new NotFoundError('PACKAGE_NOT_FOUND', 'Package not found');
    }

    return serializeDecimals(pkg);
  }

  /**
   * List packages with filtering and pagination
   */
  async list(tenantId: string, query: PackageQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, packageType, branchId, isActive, search, sortBy, sortOrder } = query;

    const where: Prisma.PackageWhereInput = { tenantId };

    if (packageType) {
      where.packageType = packageType;
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
      prisma.package.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          branches: true,
          services: true,
          _count: {
            select: { customerPackages: true },
          },
        },
      }),
      prisma.package.count({ where }),
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
   * Update a package
   */
  async update(tenantId: string, id: string, data: UpdatePackageBody, _updatedBy?: string) {
    const existing = await prisma.package.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError('PACKAGE_NOT_FOUND', 'Package not found');
    }

    // Check code uniqueness if changed
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.package.findFirst({
        where: { tenantId, code: data.code, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictError('DUPLICATE_CODE', 'Package with this code already exists');
      }
    }

    const { branchIds, services, ...updateData } = data;

    // Handle branch scope changes
    const branchOperations: Prisma.PackageUpdateInput = {};
    if (data.branchScope === 'all_branches') {
      branchOperations.branches = { deleteMany: {} };
    } else if (data.branchScope === 'specific_branches' && branchIds) {
      branchOperations.branches = {
        deleteMany: {},
        create: branchIds.map((branchId) => ({
          tenantId,
          branchId,
        })),
      };
    }

    // Handle service updates
    const serviceOperations: Prisma.PackageUpdateInput = {};
    if (services !== undefined) {
      // Get service prices for locking
      const serviceIds = services.map((s) => s.serviceId);
      const dbServices = await prisma.service.findMany({
        where: { id: { in: serviceIds }, tenantId },
        include: { variants: true },
      });

      const serviceDataWithPrices = services.map((s) => {
        const dbService = dbServices.find((ds) => ds.id === s.serviceId);
        if (!dbService) {
          throw new BadRequestError('SERVICE_NOT_FOUND', `Service ${s.serviceId} not found`);
        }

        let lockedPrice = Number(dbService.basePrice);
        if (s.variantId) {
          const variant = dbService.variants.find((v) => v.id === s.variantId);
          if (!variant) {
            throw new BadRequestError('VARIANT_NOT_FOUND', `Variant ${s.variantId} not found`);
          }
          if (variant.priceAdjustmentType === 'absolute') {
            lockedPrice = Number(variant.priceAdjustment);
          } else {
            lockedPrice += Number(variant.priceAdjustment);
          }
        }

        return {
          serviceId: s.serviceId,
          variantId: s.variantId || null,
          creditCount: s.creditCount,
          lockedPrice,
        };
      });

      serviceOperations.services = {
        deleteMany: {},
        create: serviceDataWithPrices.map((s) => ({
          tenantId,
          serviceId: s.serviceId,
          variantId: s.variantId,
          creditCount: s.creditCount,
          lockedPrice: s.lockedPrice,
        })),
      };
    }

    const pkg = await prisma.package.update({
      where: { id },
      data: {
        ...updateData,
        ...branchOperations,
        ...serviceOperations,
      },
      include: {
        branches: true,
        services: true,
      },
    });

    return serializeDecimals(pkg);
  }

  /**
   * Delete (deactivate) a package
   */
  async delete(tenantId: string, id: string) {
    const pkg = await prisma.package.findFirst({
      where: { id, tenantId },
      include: {
        customerPackages: {
          where: { status: { in: ['active', 'pending'] } },
          take: 1,
        },
      },
    });

    if (!pkg) {
      throw new NotFoundError('PACKAGE_NOT_FOUND', 'Package not found');
    }

    // Cannot delete if has active customer packages
    if (pkg.customerPackages.length > 0) {
      throw new BadRequestError(
        'PACKAGE_HAS_ACTIVE_CUSTOMERS',
        'Cannot delete package with active customer packages. Deactivate instead.'
      );
    }

    // Soft delete by deactivating
    await prisma.package.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get packages available at a specific branch
   */
  async getPackagesForBranch(tenantId: string, branchId: string) {
    const packages = await prisma.package.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ branchScope: 'all_branches' }, { branches: { some: { branchId } } }],
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        services: true,
      },
    });

    return serializeDecimals(packages);
  }
}

export const packageService = new PackageService();
