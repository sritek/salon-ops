/**
 * Customer Package Service
 * Business logic for customer package management
 * Requirements: 4.1, 5.3
 */

import { prisma, serializeDecimals } from '../../lib/prisma';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { addDays, addMonths, addYears, differenceInDays, format, parseISO } from 'date-fns';
import type { Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../lib/types';
import type {
  SellPackageBody,
  CancelPackageBody,
  CustomerPackageQuery,
  PackageRedemptionQuery,
} from './customer-package.schema';

/**
 * Generate package number: PKG-{TENANT_CODE}-{YYYYMM}-{SEQUENCE}
 */
async function generatePackageNumber(tenantId: string): Promise<string> {
  const now = new Date();
  const yearMonth = format(now, 'yyyyMM');

  // Get tenant slug for code
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  const tenantCode = tenant?.slug?.substring(0, 4).toUpperCase() || 'SALN';

  // Get next sequence for this month
  const count = await prisma.customerPackage.count({
    where: {
      tenantId,
      packageNumber: { startsWith: `PKG-${tenantCode}-${yearMonth}` },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `PKG-${tenantCode}-${yearMonth}-${sequence}`;
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

export class CustomerPackageService {
  /**
   * Sell a package to a customer
   */
  async sell(tenantId: string, data: SellPackageBody, createdBy?: string) {
    // Validate customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    // Validate package exists and is active
    const pkg = await prisma.package.findFirst({
      where: { id: data.packageId, tenantId, isActive: true },
      include: {
        branches: true,
        services: true,
      },
    });
    if (!pkg) {
      throw new NotFoundError('PACKAGE_NOT_FOUND', 'Package not found or inactive');
    }

    // Validate branch eligibility
    if (pkg.branchScope === 'specific_branches') {
      const branchAllowed = pkg.branches.some((b) => b.branchId === data.branchId);
      if (!branchAllowed) {
        throw new BadRequestError('BRANCH_NOT_ELIGIBLE', 'Package not available at this branch');
      }
    }

    // Calculate dates
    const activationDate = data.activationDate ? parseISO(data.activationDate) : new Date();
    const expiryDate = calculateExpiryDate(activationDate, pkg.validityValue, pkg.validityUnit);

    // Calculate pricing
    const price = Number(pkg.price);
    const gstRate = Number(pkg.gstRate);
    const gstAmount = price * (gstRate / 100);
    const totalAmount = price + gstAmount;

    // Calculate commission if applicable
    let commissionAmount: number | null = null;
    if (pkg.saleCommissionType && pkg.saleCommissionValue && data.staffId) {
      if (pkg.saleCommissionType === 'percentage') {
        commissionAmount = price * (Number(pkg.saleCommissionValue) / 100);
      } else {
        commissionAmount = Number(pkg.saleCommissionValue);
      }
    }

    // Generate package number
    const packageNumber = await generatePackageNumber(tenantId);

    // Create customer package with credits
    const customerPackage = await prisma.customerPackage.create({
      data: {
        tenantId,
        customerId: data.customerId,
        packageId: data.packageId,
        packageNumber,
        purchaseDate: new Date(),
        purchaseBranchId: data.branchId,
        pricePaid: price,
        gstPaid: gstAmount,
        totalPaid: totalAmount,
        initialCreditValue: pkg.creditValue,
        remainingCreditValue: pkg.creditValue,
        activationDate,
        expiryDate,
        status: 'active',
        saleCommissionAmount: commissionAmount,
        saleCommissionStaffId: data.staffId,
        createdBy,
        // Create credits for service packages
        ...(pkg.packageType !== 'value_package' &&
          pkg.services.length > 0 && {
            credits: {
              create: pkg.services.map((s) => ({
                tenantId,
                packageServiceId: s.id,
                serviceId: s.serviceId,
                initialCredits: s.creditCount,
                remainingCredits: s.creditCount,
                lockedPrice: s.lockedPrice,
              })),
            },
          }),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        package: { select: { id: true, name: true, packageType: true } },
        credits: true,
      },
    });

    return serializeDecimals({
      customerPackage,
      expiryDate: format(expiryDate, 'yyyy-MM-dd'),
    });
  }

  /**
   * Get a customer package by ID
   */
  async getById(tenantId: string, id: string) {
    const customerPackage = await prisma.customerPackage.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        package: {
          include: { services: true },
        },
        credits: true,
        _count: { select: { redemptions: true } },
      },
    });

    if (!customerPackage) {
      throw new NotFoundError('CUSTOMER_PACKAGE_NOT_FOUND', 'Customer package not found');
    }

    return serializeDecimals(customerPackage);
  }

  /**
   * List customer packages with filtering and pagination
   */
  async list(tenantId: string, query: CustomerPackageQuery): Promise<PaginatedResult<unknown>> {
    const {
      page,
      limit,
      customerId,
      packageId,
      branchId,
      status,
      packageType,
      expiringWithinDays,
      search,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.CustomerPackageWhereInput = { tenantId };

    if (customerId) where.customerId = customerId;
    if (packageId) where.packageId = packageId;
    if (branchId) where.purchaseBranchId = branchId;
    if (status) where.status = status;
    if (packageType) where.package = { packageType };

    if (expiringWithinDays) {
      const futureDate = addDays(new Date(), expiringWithinDays);
      where.expiryDate = { lte: futureDate };
      where.status = 'active';
    }

    if (search) {
      where.OR = [
        { packageNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.customerPackage.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          package: { select: { id: true, name: true, packageType: true } },
          credits: true,
        },
      }),
      prisma.customerPackage.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get credit balance for a customer package
   * Uses new Service relation for direct service details
   */
  async getCredits(tenantId: string, id: string) {
    const customerPackage = await prisma.customerPackage.findFirst({
      where: { id, tenantId },
      include: {
        package: { select: { packageType: true } },
        credits: {
          include: {
            // Use new direct Service relation instead of going through packageService
            service: {
              select: {
                id: true,
                name: true,
                sku: true,
                basePrice: true,
              },
            },
          },
        },
      },
    });

    if (!customerPackage) {
      throw new NotFoundError('CUSTOMER_PACKAGE_NOT_FOUND', 'Customer package not found');
    }

    // For value packages, return remaining credit value
    if (customerPackage.package.packageType === 'value_package') {
      return serializeDecimals({
        packageType: 'value_package',
        initialValue: customerPackage.initialCreditValue,
        remainingValue: customerPackage.remainingCreditValue,
        usedValue:
          Number(customerPackage.initialCreditValue || 0) -
          Number(customerPackage.remainingCreditValue || 0),
      });
    }

    // For service packages, return per-service credits with service details
    const credits = customerPackage.credits.map((c) => ({
      serviceId: c.serviceId,
      serviceName: c.service?.name,
      serviceSku: c.service?.sku,
      initialCredits: c.initialCredits,
      remainingCredits: c.remainingCredits,
      usedCredits: c.initialCredits - c.remainingCredits,
      lockedPrice: c.lockedPrice,
    }));

    return serializeDecimals({
      packageType: customerPackage.package.packageType,
      credits,
      totalInitialCredits: credits.reduce((sum, c) => sum + c.initialCredits, 0),
      totalRemainingCredits: credits.reduce((sum, c) => sum + c.remainingCredits, 0),
    });
  }

  /**
   * Cancel a customer package
   */
  async cancel(tenantId: string, id: string, data: CancelPackageBody, cancelledBy?: string) {
    const customerPackage = await prisma.customerPackage.findFirst({
      where: { id, tenantId, status: { in: ['active', 'pending'] } },
    });

    if (!customerPackage) {
      throw new NotFoundError('CUSTOMER_PACKAGE_NOT_FOUND', 'Active customer package not found');
    }

    // Get config for refund calculation
    const config = await prisma.membershipConfig.findUnique({
      where: { tenantId },
    });

    // Calculate prorated refund
    let refundAmount = 0;
    if (config?.refundPolicy !== 'non_refundable') {
      const totalDays = differenceInDays(
        customerPackage.expiryDate,
        customerPackage.activationDate
      );
      const usedDays = differenceInDays(new Date(), customerPackage.activationDate);
      const remainingDays = Math.max(0, totalDays - usedDays);

      // Calculate based on remaining value/credits
      if (customerPackage.remainingCreditValue) {
        // Value package - refund remaining value
        refundAmount = Number(customerPackage.remainingCreditValue);
      } else {
        // Service package - prorate based on time
        const dailyRate = Number(customerPackage.pricePaid) / totalDays;
        refundAmount = dailyRate * remainingDays;
      }

      // Apply cancellation fee if partial refund
      if (config?.refundPolicy === 'partial' && config.cancellationFeePercentage) {
        const fee = refundAmount * (Number(config.cancellationFeePercentage) / 100);
        refundAmount = Math.max(0, refundAmount - fee);
      }
    }

    const updatedPackage = await prisma.customerPackage.update({
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
        package: { select: { id: true, name: true } },
      },
    });

    return serializeDecimals({
      customerPackage: updatedPackage,
      refundAmount,
    });
  }

  /**
   * Get redemption history for a customer package
   * Uses new Service, User (stylist), and Branch relations for richer data
   */
  async getRedemptions(
    tenantId: string,
    customerPackageId: string,
    query: PackageRedemptionQuery
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit, startDate, endDate } = query;

    const where: Prisma.PackageRedemptionWhereInput = { tenantId, customerPackageId };

    if (startDate || endDate) {
      where.redemptionDate = {};
      if (startDate) where.redemptionDate.gte = parseISO(startDate);
      if (endDate) where.redemptionDate.lte = parseISO(endDate);
    }

    const [data, total] = await Promise.all([
      prisma.packageRedemption.findMany({
        where,
        orderBy: { redemptionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          // Leverage new Service relation for service details
          service: {
            select: {
              id: true,
              name: true,
              sku: true,
              basePrice: true,
            },
          },
          // Leverage new User relation for stylist details
          stylist: {
            select: {
              id: true,
              name: true,
            },
          },
          // Leverage new Branch relation for branch details
          redemptionBranch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.packageRedemption.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get customer's active packages
   */
  async getCustomerPackages(tenantId: string, customerId: string) {
    const packages = await prisma.customerPackage.findMany({
      where: {
        tenantId,
        customerId,
        status: { in: ['active', 'pending'] },
      },
      include: {
        package: { select: { id: true, name: true, packageType: true } },
        credits: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    return serializeDecimals(packages);
  }
}

export const customerPackageService = new CustomerPackageService();
