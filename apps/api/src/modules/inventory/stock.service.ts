/**
 * Stock Service
 * Business logic for stock management, consumption, adjustments, and alerts
 * Requirements: 12.1-12.5, 13.1-13.5, 14.1-14.5, 16.1-16.6, 17.1-17.6
 */

import { prisma, serializeDecimals } from '../../lib/prisma';

import type { Prisma } from '@prisma/client';
import type {
  StockBatch,
  StockMovement,
  StockSummary,
  StockFilters,
  MovementFilters,
  ConsumptionReason,
  AdjustmentType,
  FIFOConsumptionResult,
} from './inventory.types';
import { fifoEngine } from './fifo-engine';

export class StockService {
  // ============================================
  // Batch Management
  // Requirements: 12.1-12.5
  // ============================================

  /**
   * Get all batches for a product at a branch
   */
  async getBatches(tenantId: string, branchId: string, productId: string): Promise<StockBatch[]> {
    const batches = await prisma.stockBatch.findMany({
      where: {
        tenantId,
        branchId,
        productId,
      },
      orderBy: [{ receiptDate: 'asc' }, { createdAt: 'asc' }],
    });

    return serializeDecimals(batches) as unknown as StockBatch[];
  }

  /**
   * Get available (non-depleted, non-expired) batches in FIFO order
   * Requirement 12.5: FIFO order for consumption
   */
  async getAvailableBatches(
    _tenantId: string,
    branchId: string,
    productId: string
  ): Promise<StockBatch[]> {
    return fifoEngine.getBatchesInFIFOOrder(branchId, productId);
  }

  // ============================================
  // Stock Summary and Aggregation
  // Requirements: 13.1
  // ============================================

  /**
   * Get stock summary for all products at a branch
   * Requirement 13.1: Show quantity on hand, available, value, average cost
   */
  async getStockSummary(
    tenantId: string,
    branchId: string,
    filters?: StockFilters
  ): Promise<{ data: StockSummary[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    // Build product filter
    const productWhere: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      isActive: true,
    };

    if (filters?.categoryId) {
      productWhere.categoryId = filters.categoryId;
    }

    if (filters?.productType) {
      productWhere.productType = filters.productType;
    }

    if (filters?.search) {
      productWhere.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get products with branch settings
    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        category: { select: { name: true } },
        branchSettings: {
          where: { branchId, isEnabled: true },
        },
      },
    });

    // Get stock aggregates for all products
    const productIds = products.map((p) => p.id);

    const stockAggregates = await prisma.stockBatch.groupBy({
      by: ['productId'],
      where: {
        branchId,
        productId: { in: productIds },
        isDepleted: false,
      },
      _sum: {
        quantity: true,
        availableQuantity: true,
        totalValue: true,
      },
    });

    const stockMap = new Map(
      stockAggregates.map((s) => [
        s.productId,
        {
          quantityOnHand: s._sum.quantity ?? 0,
          availableQuantity: s._sum.availableQuantity ?? 0,
          totalValue: Number(s._sum.totalValue ?? 0),
        },
      ])
    );

    // Check for near-expiry and expired batches
    const today = new Date();
    const nearExpiryDate = new Date();
    nearExpiryDate.setDate(nearExpiryDate.getDate() + 30); // 30 days threshold

    const expiryInfo = await prisma.stockBatch.groupBy({
      by: ['productId'],
      where: {
        branchId,
        productId: { in: productIds },
        isDepleted: false,
        expiryDate: { not: null },
      },
      _min: {
        expiryDate: true,
      },
    });

    const expiryMap = new Map(expiryInfo.map((e) => [e.productId, e._min.expiryDate]));

    // Build summaries
    let summaries: StockSummary[] = products.map((product) => {
      const stock = stockMap.get(product.id) || {
        quantityOnHand: 0,
        availableQuantity: 0,
        totalValue: 0,
      };
      const branchSettings = product.branchSettings[0];
      const reorderLevel = branchSettings?.reorderLevel ?? null;
      const earliestExpiry = expiryMap.get(product.id);

      const averageCost = stock.quantityOnHand > 0 ? stock.totalValue / stock.quantityOnHand : 0;

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        categoryName: product.category?.name ?? '',
        unitOfMeasure: product.unitOfMeasure,
        quantityOnHand: stock.quantityOnHand,
        reservedQuantity: 0, // TODO: Implement reservation system
        availableQuantity: stock.availableQuantity,
        averageCost,
        totalValue: stock.totalValue,
        reorderLevel,
        isLowStock: reorderLevel !== null && stock.availableQuantity < reorderLevel,
        hasNearExpiry: earliestExpiry != null && earliestExpiry <= nearExpiryDate,
        hasExpired: earliestExpiry != null && earliestExpiry < today,
      };
    });

    // Apply alert filters
    if (filters?.alertType === 'low_stock') {
      summaries = summaries.filter((s) => s.isLowStock);
    } else if (filters?.alertType === 'near_expiry') {
      summaries = summaries.filter((s) => s.hasNearExpiry);
    } else if (filters?.alertType === 'expired') {
      summaries = summaries.filter((s) => s.hasExpired);
    }

    // Sort
    const sortBy = filters?.sortBy ?? 'productName';
    const sortOrder = filters?.sortOrder ?? 'asc';
    summaries.sort((a, b) => {
      const aVal = a[sortBy as keyof StockSummary];
      const bVal = b[sortBy as keyof StockSummary];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    // Paginate
    const total = summaries.length;
    const paginatedData = summaries.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedData,
      total,
      page,
      limit,
    };
  }

  /**
   * Get stock summary for a single product
   */
  async getProductStock(
    tenantId: string,
    branchId: string,
    productId: string
  ): Promise<StockSummary | null> {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      include: {
        category: { select: { name: true } },
        branchSettings: {
          where: { branchId },
        },
      },
    });

    if (!product) {
      return null;
    }

    // Get stock aggregates
    const stockAggregate = await prisma.stockBatch.aggregate({
      where: {
        branchId,
        productId,
        isDepleted: false,
      },
      _sum: {
        quantity: true,
        availableQuantity: true,
        totalValue: true,
      },
    });

    const quantityOnHand = stockAggregate._sum.quantity ?? 0;
    const availableQuantity = stockAggregate._sum.availableQuantity ?? 0;
    const totalValue = Number(stockAggregate._sum.totalValue ?? 0);
    const averageCost = quantityOnHand > 0 ? totalValue / quantityOnHand : 0;

    // Check expiry
    const today = new Date();
    const nearExpiryDate = new Date();
    nearExpiryDate.setDate(nearExpiryDate.getDate() + 30);

    const earliestExpiry = await prisma.stockBatch.findFirst({
      where: {
        branchId,
        productId,
        isDepleted: false,
        expiryDate: { not: null },
      },
      orderBy: { expiryDate: 'asc' },
      select: { expiryDate: true },
    });

    const branchSettings = product.branchSettings[0];
    const reorderLevel = branchSettings?.reorderLevel ?? null;

    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      categoryName: product.category?.name ?? '',
      unitOfMeasure: product.unitOfMeasure,
      quantityOnHand,
      reservedQuantity: 0,
      availableQuantity,
      averageCost,
      totalValue,
      reorderLevel,
      isLowStock: reorderLevel !== null && availableQuantity < reorderLevel,
      hasNearExpiry:
        earliestExpiry?.expiryDate !== null &&
        earliestExpiry?.expiryDate !== undefined &&
        earliestExpiry.expiryDate <= nearExpiryDate,
      hasExpired:
        earliestExpiry?.expiryDate !== null &&
        earliestExpiry?.expiryDate !== undefined &&
        earliestExpiry.expiryDate < today,
    };
  }

  // ============================================
  // Consumption (FIFO)
  // Requirements: 16.1-16.6
  // ============================================

  /**
   * Consume stock manually with reason code
   * Requirement 16.1: Manual consumption with reason
   * Requirement 16.2: Reason codes: sample, demo, wastage, damaged, expired, other
   * Requirement 16.3: Description required for "other" reason
   * Requirement 16.4: Uses FIFO for batch selection
   * Requirement 16.5: Creates stock movement record
   */
  async consumeStock(
    tenantId: string,
    branchId: string,
    productId: string,
    quantity: number,
    reason: ConsumptionReason,
    description: string | undefined,
    userId: string
  ): Promise<FIFOConsumptionResult> {
    // Requirement 16.3: Description required for "other" reason
    if (reason === 'other' && (!description || description.trim().length === 0)) {
      throw new Error('Description is required when reason is "other"');
    }

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Use FIFO engine for consumption
    const result = await fifoEngine.consume(
      tenantId,
      branchId,
      productId,
      quantity,
      'consumption',
      'manual_consumption',
      undefined,
      userId,
      `Reason: ${reason}${description ? ` - ${description}` : ''}`
    );

    return result;
  }

  /**
   * Consume stock for a service completion
   * Requirement 15.3: Auto-deduct on service completion
   * Requirement 15.4: Uses FIFO
   * Requirement 15.5: Handles insufficient stock gracefully
   */
  async consumeForService(
    tenantId: string,
    branchId: string,
    serviceId: string,
    invoiceId: string,
    userId: string
  ): Promise<FIFOConsumptionResult[]> {
    // Get service consumable mappings
    const mappings = await prisma.serviceConsumableMapping.findMany({
      where: {
        tenantId,
        serviceId,
        isActive: true,
      },
    });

    const results: FIFOConsumptionResult[] = [];

    for (const mapping of mappings) {
      const quantity = Number(mapping.quantityPerService);

      // Requirement 15.5: Handle insufficient stock gracefully
      const result = await fifoEngine.consume(
        tenantId,
        branchId,
        mapping.productId,
        quantity,
        'consumption',
        'service_completion',
        invoiceId,
        userId,
        `Service: ${serviceId}`
      );

      // Log alert if shortfall (but don't block service completion)
      if (result.shortfall > 0) {
        console.warn(
          `Insufficient stock for product ${mapping.productId}: needed ${quantity}, consumed ${result.totalConsumed}`
        );
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Consume stock for a retail sale
   * Requirement 24.2: Uses FIFO
   * Requirement 24.3: Creates stock movement
   * Requirement 24.4: Prevents adding products with insufficient stock
   */
  async consumeForSale(
    tenantId: string,
    branchId: string,
    productId: string,
    quantity: number,
    invoiceId: string,
    userId: string
  ): Promise<FIFOConsumptionResult> {
    // Check availability first (Requirement 24.4)
    const availability = await fifoEngine.checkAvailability(branchId, productId, quantity);

    if (!availability.available) {
      throw new Error(
        `Insufficient stock: available ${availability.currentStock}, requested ${quantity}`
      );
    }

    return fifoEngine.consume(
      tenantId,
      branchId,
      productId,
      quantity,
      'sale',
      'invoice',
      invoiceId,
      userId,
      `Invoice: ${invoiceId}`
    );
  }

  // ============================================
  // Adjustments
  // Requirements: 17.1-17.6
  // ============================================

  /**
   * Adjust stock (increase or decrease)
   * Requirement 17.1: Support increase and decrease
   * Requirement 17.2: Increase creates new batch
   * Requirement 17.3: Decrease uses FIFO
   * Requirement 17.4: Requires reason
   * Requirement 17.5: Creates stock movement
   */
  async adjustStock(
    tenantId: string,
    branchId: string,
    productId: string,
    adjustmentType: AdjustmentType,
    quantity: number,
    reason: string,
    userId: string
  ): Promise<StockMovement> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required for stock adjustment');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (adjustmentType === 'increase') {
      // Requirement 17.2: Create new batch for increase
      const avgCost = await fifoEngine.calculateWeightedAverageCost(branchId, productId);
      const unitCost = avgCost > 0 ? avgCost : Number(product.defaultPurchasePrice);

      const batch = await prisma.stockBatch.create({
        data: {
          tenantId,
          branchId,
          productId,
          quantity,
          availableQuantity: quantity,
          unitCost,
          totalValue: quantity * unitCost,
          receiptDate: new Date(),
          isExpired: false,
          isDepleted: false,
          adjustmentId: `adj_${Date.now()}`,
        },
      });

      // Create movement record
      const movement = await prisma.stockMovement.create({
        data: {
          tenantId,
          branchId,
          productId,
          batchId: batch.id,
          movementType: 'adjustment',
          quantity, // Positive for increase
          quantityBefore: 0,
          quantityAfter: quantity,
          referenceType: 'adjustment',
          reason: `Increase: ${reason}`,
          createdBy: userId,
        },
      });

      return serializeDecimals(movement) as StockMovement;
    } else {
      // Requirement 17.3: Use FIFO for decrease
      const result = await fifoEngine.consume(
        tenantId,
        branchId,
        productId,
        quantity,
        'adjustment',
        'adjustment',
        undefined,
        userId,
        `Decrease: ${reason}`
      );

      if (result.shortfall > 0) {
        throw new Error(
          `Insufficient stock for adjustment: available ${result.totalConsumed}, requested ${quantity}`
        );
      }

      // Return the first movement (or create a summary movement)
      if (result.movements.length > 0) {
        return result.movements[0];
      }

      throw new Error('No stock movements created');
    }
  }

  // ============================================
  // Movement Log
  // Requirements: 14.1-14.5
  // ============================================

  /**
   * Get stock movements with filtering
   * Requirement 14.1: Log all stock changes
   * Requirement 14.4: Movements are immutable
   */
  async getMovements(
    tenantId: string,
    branchId: string,
    filters?: MovementFilters
  ): Promise<{ data: StockMovement[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      branchId,
    };

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    if (filters?.movementType) {
      if (Array.isArray(filters.movementType)) {
        where.movementType = { in: filters.movementType };
      } else {
        where.movementType = filters.movementType;
      }
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const total = await prisma.stockMovement.count({ where });

    const sortOrder = filters?.sortOrder ?? 'desc';

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        batch: true,
      },
    });

    return {
      data: serializeDecimals(movements) as StockMovement[],
      total,
      page,
      limit,
    };
  }

  // ============================================
  // Alerts
  // Requirements: 13.2-13.4
  // ============================================

  /**
   * Get products below reorder level
   * Requirement 13.2: Low stock alerts
   */
  async getLowStockAlerts(tenantId: string, branchId: string): Promise<StockSummary[]> {
    const result = await this.getStockSummary(tenantId, branchId, {
      alertType: 'low_stock',
      limit: 100,
    });
    return result.data;
  }

  /**
   * Get batches expiring within threshold
   * Requirement 13.3: Near-expiry alerts
   */
  async getNearExpiryAlerts(
    tenantId: string,
    branchId: string,
    daysThreshold: number = 30
  ): Promise<StockBatch[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const batches = await prisma.stockBatch.findMany({
      where: {
        tenantId,
        branchId,
        isDepleted: false,
        isExpired: false,
        expiryDate: {
          not: null,
          lte: thresholdDate,
          gt: new Date(),
        },
      },
      orderBy: { expiryDate: 'asc' },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    });

    return serializeDecimals(batches) as unknown as StockBatch[];
  }

  /**
   * Get expired stock
   * Requirement 13.4: Expired stock alerts
   */
  async getExpiredStock(tenantId: string, branchId: string): Promise<StockBatch[]> {
    // First mark expired batches
    await prisma.stockBatch.updateMany({
      where: {
        tenantId,
        branchId,
        isExpired: false,
        expiryDate: {
          lt: new Date(),
        },
      },
      data: {
        isExpired: true,
      },
    });

    const batches = await prisma.stockBatch.findMany({
      where: {
        tenantId,
        branchId,
        isDepleted: false,
        isExpired: true,
        availableQuantity: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    });

    return serializeDecimals(batches) as unknown as StockBatch[];
  }

  // ============================================
  // Utilities
  // ============================================

  /**
   * Calculate average cost for a product
   */
  async calculateAverageCost(
    _tenantId: string,
    branchId: string,
    productId: string
  ): Promise<number> {
    return fifoEngine.calculateWeightedAverageCost(branchId, productId);
  }

  /**
   * Check stock availability
   */
  async checkStockAvailability(
    _tenantId: string,
    branchId: string,
    productId: string,
    quantity: number
  ): Promise<boolean> {
    const result = await fifoEngine.checkAvailability(branchId, productId, quantity);
    return result.available;
  }
}

export const stockService = new StockService();
