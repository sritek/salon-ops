/**
 * Branch Pricing Service
 * Business logic for branch-specific service pricing
 */

import { prisma } from '../../lib/prisma';

import type { BranchServicePrice } from '@prisma/client';
import type {
  BulkUpdateBranchPricesBody,
  UpdateBranchPriceBody,
} from './services.schema';

export class BranchPricingService {
  /**
   * Get all service prices for a branch
   */
  async getBranchServicePrices(
    tenantId: string,
    branchId: string
  ): Promise<
    Array<{
      service: {
        id: string;
        sku: string;
        name: string;
        basePrice: number;
        categoryId: string;
      };
      branchPrice: BranchServicePrice | null;
      effectivePrice: number;
      isAvailable: boolean;
    }>
  > {
    // Verify branch belongs to tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    // Get all active services
    const services = await prisma.service.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: {
        id: true,
        sku: true,
        name: true,
        basePrice: true,
        categoryId: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Get branch prices
    const branchPrices = await prisma.branchServicePrice.findMany({
      where: { branchId },
    });

    const branchPriceMap = new Map(branchPrices.map((bp) => [bp.serviceId, bp]));

    return services.map((service) => {
      const branchPrice = branchPriceMap.get(service.id) ?? null;
      return {
        service: {
          ...service,
          basePrice: Number(service.basePrice),
        },
        branchPrice,
        effectivePrice: branchPrice?.price
          ? Number(branchPrice.price)
          : Number(service.basePrice),
        isAvailable: branchPrice?.isAvailable ?? true,
      };
    });
  }

  /**
   * Update a single service price for a branch
   */
  async updateBranchServicePrice(
    tenantId: string,
    branchId: string,
    serviceId: string,
    data: UpdateBranchPriceBody,
    updatedBy?: string
  ): Promise<BranchServicePrice> {
    // Verify branch belongs to tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    // Verify service belongs to tenant
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Check for existing branch price
    const existing = await prisma.branchServicePrice.findUnique({
      where: { branchId_serviceId: { branchId, serviceId } },
    });

    // Track price change if price is being updated
    if (data.price !== undefined && data.price !== null) {
      const oldPrice = existing?.price ? Number(existing.price) : Number(service.basePrice);
      if (data.price !== oldPrice) {
        await prisma.servicePriceHistory.create({
          data: {
            tenantId,
            serviceId,
            branchId,
            oldPrice,
            newPrice: data.price,
            changeReason: 'Branch price override',
            changedBy: updatedBy,
          },
        });
      }
    }

    if (existing) {
      return prisma.branchServicePrice.update({
        where: { id: existing.id },
        data: {
          price: data.price,
          commissionType: data.commissionType,
          commissionValue: data.commissionValue,
          isAvailable: data.isAvailable,
          updatedBy,
        },
      });
    }

    return prisma.branchServicePrice.create({
      data: {
        tenantId,
        branchId,
        serviceId,
        price: data.price,
        commissionType: data.commissionType,
        commissionValue: data.commissionValue,
        isAvailable: data.isAvailable,
        updatedBy,
      },
    });
  }

  /**
   * Bulk update service prices for a branch
   */
  async bulkUpdateBranchServicePrices(
    tenantId: string,
    branchId: string,
    data: BulkUpdateBranchPricesBody,
    updatedBy?: string
  ): Promise<{ updated: number }> {
    // Verify branch belongs to tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    // Verify all services belong to tenant
    const serviceIds = data.prices.map((p) => p.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, tenantId, deletedAt: null },
    });

    if (services.length !== serviceIds.length) {
      throw new Error('Some services not found');
    }

    const serviceMap = new Map(services.map((s) => [s.id, s]));

    // Get existing branch prices
    const existingPrices = await prisma.branchServicePrice.findMany({
      where: { branchId, serviceId: { in: serviceIds } },
    });

    const existingMap = new Map(existingPrices.map((p) => [p.serviceId, p]));

    // Prepare transactions
    const transactions = [];
    const priceHistoryEntries = [];

    for (const priceData of data.prices) {
      const existing = existingMap.get(priceData.serviceId);
      const service = serviceMap.get(priceData.serviceId)!;

      // Track price change
      if (priceData.price !== undefined && priceData.price !== null) {
        const oldPrice = existing?.price
          ? Number(existing.price)
          : Number(service.basePrice);
        if (priceData.price !== oldPrice) {
          priceHistoryEntries.push({
            tenantId,
            serviceId: priceData.serviceId,
            branchId,
            oldPrice,
            newPrice: priceData.price,
            changeReason: 'Branch price override (bulk)',
            changedBy: updatedBy,
          });
        }
      }

      if (existing) {
        transactions.push(
          prisma.branchServicePrice.update({
            where: { id: existing.id },
            data: {
              price: priceData.price,
              commissionType: priceData.commissionType,
              commissionValue: priceData.commissionValue,
              isAvailable: priceData.isAvailable,
              updatedBy,
            },
          })
        );
      } else {
        transactions.push(
          prisma.branchServicePrice.create({
            data: {
              tenantId,
              branchId,
              serviceId: priceData.serviceId,
              price: priceData.price,
              commissionType: priceData.commissionType,
              commissionValue: priceData.commissionValue,
              isAvailable: priceData.isAvailable,
              updatedBy,
            },
          })
        );
      }
    }

    // Add price history entries
    if (priceHistoryEntries.length > 0) {
      transactions.push(
        prisma.servicePriceHistory.createMany({
          data: priceHistoryEntries,
        })
      );
    }

    await prisma.$transaction(transactions);

    return { updated: data.prices.length };
  }
}

export const branchPricingService = new BranchPricingService();
