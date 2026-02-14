/**
 * Audit Service
 * Business logic for stock audits (physical inventory counts)
 * Requirements: 21.1-21.6, 22.1-22.5, 23.1-23.6
 */

import { prisma, serializeDecimals } from '../../lib/prisma';

import type { Prisma } from '@prisma/client';
import type {
  StockAuditItem,
  StockAuditWithItems,
  CreateAuditInput,
  UpdateCountInput,
  AuditFilters,
} from './inventory.types';
import { fifoEngine } from './fifo-engine';

export class AuditService {
  // ============================================
  // Audit Number Generation
  // Requirement 21.1: Format AUD/{BRANCH_CODE}/{YEAR}/{SEQUENCE}
  // ============================================

  /**
   * Generate unique audit number
   */
  async generateAuditNumber(tenantId: string, branchId: string): Promise<string> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { name: true },
    });

    const branchCode = branch?.name?.substring(0, 3).toUpperCase() || 'XXX';
    const year = new Date().getFullYear();

    // Get the last audit number for this branch and year
    const lastAudit = await prisma.stockAudit.findFirst({
      where: {
        tenantId,
        branchId,
        auditNumber: {
          startsWith: `AUD/${branchCode}/${year}/`,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { auditNumber: true },
    });

    let sequence = 1;
    if (lastAudit) {
      const parts = lastAudit.auditNumber.split('/');
      const lastSeq = parseInt(parts[3], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `AUD/${branchCode}/${year}/${sequence.toString().padStart(4, '0')}`;
  }

  // ============================================
  // CRUD Operations
  // Requirements: 21.1-21.6
  // ============================================

  /**
   * Create a new stock audit
   * Requirement 21.2: Support full, partial, and category audit types
   * Requirement 21.6: Prevent concurrent audits at same branch
   */
  async create(
    tenantId: string,
    data: CreateAuditInput,
    userId: string
  ): Promise<StockAuditWithItems> {
    // Requirement 21.6: Check for concurrent audits
    const existingAudit = await prisma.stockAudit.findFirst({
      where: {
        tenantId,
        branchId: data.branchId,
        status: 'in_progress',
      },
    });

    if (existingAudit) {
      throw new Error(
        `An audit is already in progress at this branch (${existingAudit.auditNumber})`
      );
    }

    // Generate audit number
    const auditNumber = await this.generateAuditNumber(tenantId, data.branchId);

    // Determine which products to include
    let productIds: string[] = [];

    if (data.auditType === 'full') {
      // Full audit: all active products with stock
      const products = await prisma.product.findMany({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      productIds = products.map((p) => p.id);
    } else if (data.auditType === 'category' && data.categoryId) {
      // Category audit: products in specific category
      const products = await prisma.product.findMany({
        where: {
          tenantId,
          categoryId: data.categoryId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      productIds = products.map((p) => p.id);
    } else if (data.auditType === 'partial' && data.productIds) {
      // Partial audit: specific products
      productIds = data.productIds;
    }

    if (productIds.length === 0) {
      throw new Error('No products found for audit');
    }

    // Get current stock quantities for each product
    const auditItems: Array<{
      tenantId: string;
      productId: string;
      productName: string;
      systemQuantity: number;
      physicalCount: number | null;
      variance: number;
      averageCost: number;
      varianceValue: number;
    }> = [];

    for (const productId of productIds) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true },
      });

      // Get system quantity (available stock)
      const systemQuantity = await fifoEngine.getAvailableQuantity(data.branchId, productId);

      // Get average cost
      const averageCost = await fifoEngine.calculateWeightedAverageCost(data.branchId, productId);

      auditItems.push({
        tenantId,
        productId,
        productName: product?.name || '',
        systemQuantity,
        physicalCount: null,
        variance: 0,
        averageCost,
        varianceValue: 0,
      });
    }

    // Create audit with items
    const audit = await prisma.stockAudit.create({
      data: {
        tenantId,
        branchId: data.branchId,
        auditNumber,
        auditType: data.auditType,
        categoryId: data.categoryId,
        status: 'in_progress',
        startedAt: new Date(),
        totalVarianceValue: 0,
        totalShrinkageValue: 0,
        notes: data.notes,
        createdBy: userId,
        items: {
          create: auditItems,
        },
      },
      include: {
        items: true,
      },
    });

    return serializeDecimals(audit) as unknown as StockAuditWithItems;
  }

  /**
   * Get a single audit by ID
   */
  async get(tenantId: string, id: string): Promise<StockAuditWithItems | null> {
    const audit = await prisma.stockAudit.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          orderBy: { productName: 'asc' },
        },
      },
    });

    return audit ? (serializeDecimals(audit) as unknown as StockAuditWithItems) : null;
  }

  /**
   * List audits with filtering
   */
  async list(
    tenantId: string,
    branchId: string,
    filters?: AuditFilters
  ): Promise<{ data: StockAuditWithItems[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const where: Prisma.StockAuditWhereInput = {
      tenantId,
      branchId,
    };

    // Status filter
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    // Audit type filter
    if (filters?.auditType) {
      where.auditType = filters.auditType;
    }

    // Date filters
    if (filters?.dateFrom || filters?.dateTo) {
      where.startedAt = {};
      if (filters.dateFrom) {
        where.startedAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.startedAt.lte = new Date(filters.dateTo);
      }
    }

    const total = await prisma.stockAudit.count({ where });

    const sortBy = filters?.sortBy ?? 'startedAt';
    const sortOrder = filters?.sortOrder ?? 'desc';

    const audits = await prisma.stockAudit.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: true,
      },
    });

    return {
      data: serializeDecimals(audits) as unknown as StockAuditWithItems[],
      total,
      page,
      limit,
    };
  }

  // ============================================
  // Counting Operations
  // Requirements: 22.1-22.5
  // ============================================

  /**
   * Update physical count for an audit item
   * Requirement 22.1: Enter physical count
   * Requirement 22.3: Calculate variance (physical - system)
   * Requirement 22.4: Calculate variance value
   */
  async updateCount(
    tenantId: string,
    auditId: string,
    itemId: string,
    data: UpdateCountInput,
    userId: string
  ): Promise<StockAuditItem> {
    const audit = await this.get(tenantId, auditId);

    if (!audit) {
      throw new Error('Audit not found');
    }

    if (audit.status !== 'in_progress') {
      throw new Error(`Cannot update counts for audit in ${audit.status} status`);
    }

    const item = audit.items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error('Audit item not found');
    }

    // Calculate variance
    const variance = data.physicalCount - item.systemQuantity;
    const varianceValue = variance * item.averageCost;

    const updated = await prisma.stockAuditItem.update({
      where: { id: itemId },
      data: {
        physicalCount: data.physicalCount,
        variance,
        varianceValue,
        notes: data.notes,
        countedAt: new Date(),
        countedBy: userId,
      },
    });

    // Update audit totals
    await this.recalculateTotals(auditId);

    return serializeDecimals(updated) as unknown as StockAuditItem;
  }

  /**
   * Recalculate audit totals
   */
  private async recalculateTotals(auditId: string): Promise<void> {
    const items = await prisma.stockAuditItem.findMany({
      where: { auditId },
    });

    let totalVarianceValue = 0;
    let totalShrinkageValue = 0;

    for (const item of items) {
      if (item.physicalCount !== null) {
        totalVarianceValue += Number(item.varianceValue);
        // Shrinkage is negative variance (physical < system)
        if (item.variance < 0) {
          totalShrinkageValue += Math.abs(Number(item.varianceValue));
        }
      }
    }

    await prisma.stockAudit.update({
      where: { id: auditId },
      data: {
        totalVarianceValue,
        totalShrinkageValue,
      },
    });
  }

  // ============================================
  // Completion and Posting
  // Requirements: 23.1-23.6
  // ============================================

  /**
   * Complete an audit
   * Requirement 23.1: in_progress → completed
   * Requirement 22.5: All items must be counted
   */
  async complete(tenantId: string, id: string, userId: string): Promise<StockAuditWithItems> {
    const audit = await this.get(tenantId, id);

    if (!audit) {
      throw new Error('Audit not found');
    }

    if (audit.status !== 'in_progress') {
      throw new Error(`Cannot complete audit in ${audit.status} status`);
    }

    // Check all items are counted
    const uncountedItems = audit.items.filter((i) => i.physicalCount === null);
    if (uncountedItems.length > 0) {
      throw new Error(
        `Cannot complete audit: ${uncountedItems.length} items have not been counted`
      );
    }

    const updated = await prisma.stockAudit.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId,
      },
      include: {
        items: true,
      },
    });

    return serializeDecimals(updated) as unknown as StockAuditWithItems;
  }

  /**
   * Post audit adjustments
   * Requirement 23.2: completed → posted
   * Requirement 23.3: Create stock adjustments for all variances
   * Requirement 23.5: Lock audit from further modifications
   */
  async postAdjustments(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<StockAuditWithItems> {
    const audit = await this.get(tenantId, id);

    if (!audit) {
      throw new Error('Audit not found');
    }

    if (audit.status !== 'completed') {
      throw new Error(`Cannot post adjustments for audit in ${audit.status} status`);
    }

    await prisma.$transaction(async (tx) => {
      // Create adjustments for all items with variance
      for (const item of audit.items) {
        if (item.variance === 0) continue;

        if (item.variance > 0) {
          // Positive variance: create new batch (found more than expected)
          await tx.stockBatch.create({
            data: {
              tenantId,
              branchId: audit.branchId,
              productId: item.productId,
              quantity: item.variance,
              availableQuantity: item.variance,
              unitCost: item.averageCost,
              totalValue: item.variance * item.averageCost,
              receiptDate: new Date(),
              isExpired: false,
              isDepleted: false,
              adjustmentId: `audit_${id}`,
            },
          });

          // Create movement record
          await tx.stockMovement.create({
            data: {
              tenantId,
              branchId: audit.branchId,
              productId: item.productId,
              movementType: 'audit',
              quantity: item.variance,
              quantityBefore: item.systemQuantity,
              quantityAfter: item.physicalCount!,
              referenceType: 'audit',
              referenceId: id,
              reason: `Audit adjustment: found ${item.variance} more than expected`,
              createdBy: userId,
            },
          });
        } else {
          // Negative variance: consume using FIFO (found less than expected)
          const consumeQty = Math.abs(item.variance);

          await fifoEngine.consume(
            tenantId,
            audit.branchId,
            item.productId,
            consumeQty,
            'adjustment',
            'audit',
            id,
            userId,
            `Audit adjustment: found ${consumeQty} less than expected`
          );
        }
      }

      // Update audit status to posted
      await tx.stockAudit.update({
        where: { id },
        data: {
          status: 'posted',
          postedAt: new Date(),
          postedBy: userId,
        },
      });
    });

    return (await this.get(tenantId, id))!;
  }
}

export const auditService = new AuditService();
