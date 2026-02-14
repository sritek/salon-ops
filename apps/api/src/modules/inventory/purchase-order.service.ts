/**
 * Purchase Order Service
 * Business logic for purchase order management
 * Requirements: 6.1-6.7, 7.1-7.7, 8.1-8.5
 */

import { prisma, serializeDecimals } from '../../lib/prisma';

import type { Prisma } from '@prisma/client';
import type {
  PurchaseOrder,
  PurchaseOrderWithItems,
  CreatePOInput,
  UpdatePOInput,
  POFilters,
  ReorderSuggestion,
  POStatus,
} from './inventory.types';

export class PurchaseOrderService {
  // ============================================
  // PO Number Generation
  // Requirement 6.1: Format PO/{BRANCH_CODE}/{YEAR}/{SEQUENCE}
  // ============================================

  /**
   * Generate a unique PO number for a branch
   * Format: PO/{BRANCH_CODE}/{YEAR}/{SEQUENCE}
   */
  async generatePONumber(branchId: string): Promise<string> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { slug: true },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    const branchCode = branch.slug.toUpperCase().slice(0, 4);
    const year = new Date().getFullYear();

    // Get the latest PO number for this branch and year
    const latestPO = await prisma.purchaseOrder.findFirst({
      where: {
        branchId,
        poNumber: {
          startsWith: `PO/${branchCode}/${year}/`,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { poNumber: true },
    });

    let sequence = 1;
    if (latestPO) {
      const parts = latestPO.poNumber.split('/');
      const lastSequence = parseInt(parts[3], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `PO/${branchCode}/${year}/${sequence.toString().padStart(5, '0')}`;
  }

  // ============================================
  // CRUD Operations
  // Requirements: 6.1-6.7
  // ============================================

  /**
   * Create a new purchase order
   * Requirement 6.2: PO starts in draft status
   * Requirement 6.3: Requires vendor, branch, at least one item
   */
  async create(
    tenantId: string,
    data: CreatePOInput,
    createdBy?: string
  ): Promise<PurchaseOrderWithItems> {
    // Validate vendor exists and is active (Requirement 4.4)
    const vendor = await prisma.vendor.findFirst({
      where: { id: data.vendorId, tenantId, deletedAt: null },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    if (!vendor.isActive) {
      throw new Error('Cannot create PO for inactive vendor');
    }

    // Validate items
    if (!data.items || data.items.length === 0) {
      throw new Error('Purchase order must have at least one item');
    }

    // Validate all products exist and are active
    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
        deletedAt: null,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error('One or more products not found');
    }

    const inactiveProducts = products.filter((p) => !p.isActive);
    if (inactiveProducts.length > 0) {
      throw new Error(
        `Cannot add inactive products to PO: ${inactiveProducts.map((p) => p.name).join(', ')}`
      );
    }

    // Generate PO number
    const poNumber = await this.generatePONumber(data.branchId);

    // Calculate line items and totals
    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    let totalTax = 0;

    const itemsData = data.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const taxRate = item.taxRate ?? Number(product.taxRate);
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = lineTotal * (taxRate / 100);

      subtotal += lineTotal;
      totalTax += taxAmount;

      return {
        tenantId,
        productId: item.productId,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate,
        taxAmount,
        totalAmount: lineTotal + taxAmount,
        receivedQuantity: 0,
        pendingQuantity: item.quantity,
      };
    });

    // For now, assume intra-state (CGST + SGST split)
    // In production, this would be determined by vendor and branch GST states
    const cgstAmount = totalTax / 2;
    const sgstAmount = totalTax / 2;
    const igstAmount = 0;
    const grandTotal = subtotal + totalTax;

    // Create PO with items in a transaction
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        branchId: data.branchId,
        poNumber,
        vendorId: data.vendorId,
        status: 'draft',
        orderDate: new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : null,
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal,
        notes: data.notes,
        createdBy,
        items: {
          create: itemsData,
        },
      },
      include: {
        vendor: true,
        items: true,
      },
    });

    return serializeDecimals(po) as unknown as PurchaseOrderWithItems;
  }

  /**
   * Update a purchase order (only in draft status)
   * Requirement 7.1: Only draft POs can be edited
   */
  async update(
    tenantId: string,
    poId: string,
    data: UpdatePOInput,
    _updatedBy?: string
  ): Promise<PurchaseOrderWithItems> {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: { items: true },
    });

    if (!existing) {
      throw new Error('Purchase order not found');
    }

    // Requirement 7.1: Only draft POs can be edited
    if (existing.status !== 'draft') {
      throw new Error('Only draft purchase orders can be edited');
    }

    // Validate vendor if changed
    if (data.vendorId && data.vendorId !== existing.vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { id: data.vendorId, tenantId, deletedAt: null },
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      if (!vendor.isActive) {
        throw new Error('Cannot assign inactive vendor to PO');
      }
    }

    // If items are being updated, recalculate totals
    let updateData: Prisma.PurchaseOrderUpdateInput = {
      ...(data.vendorId && { vendorId: data.vendorId }),
      ...(data.expectedDeliveryDate !== undefined && {
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    };

    if (data.items && data.items.length > 0) {
      // Validate all products
      const productIds = data.items.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          deletedAt: null,
        },
      });

      if (products.length !== productIds.length) {
        throw new Error('One or more products not found');
      }

      const inactiveProducts = products.filter((p) => !p.isActive);
      if (inactiveProducts.length > 0) {
        throw new Error(
          `Cannot add inactive products to PO: ${inactiveProducts.map((p) => p.name).join(', ')}`
        );
      }

      // Calculate new totals
      const productMap = new Map(products.map((p) => [p.id, p]));
      let subtotal = 0;
      let totalTax = 0;

      const itemsData = data.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const taxRate = item.taxRate ?? Number(product.taxRate);
        const lineTotal = item.quantity * item.unitPrice;
        const taxAmount = lineTotal * (taxRate / 100);

        subtotal += lineTotal;
        totalTax += taxAmount;

        return {
          tenantId,
          productId: item.productId,
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate,
          taxAmount,
          totalAmount: lineTotal + taxAmount,
          receivedQuantity: 0,
          pendingQuantity: item.quantity,
        };
      });

      const cgstAmount = totalTax / 2;
      const sgstAmount = totalTax / 2;
      const grandTotal = subtotal + totalTax;

      // Delete existing items and create new ones
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: poId },
      });

      await prisma.purchaseOrderItem.createMany({
        data: itemsData.map((item) => ({
          ...item,
          purchaseOrderId: poId,
        })),
      });

      updateData = {
        ...updateData,
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount: 0,
        grandTotal,
      };
    }

    const po = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: updateData,
      include: {
        vendor: true,
        items: true,
      },
    });

    return serializeDecimals(po) as unknown as PurchaseOrderWithItems;
  }

  /**
   * Get a single purchase order by ID
   */
  async get(tenantId: string, poId: string): Promise<PurchaseOrderWithItems | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: {
        vendor: true,
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return po ? (serializeDecimals(po) as unknown as PurchaseOrderWithItems) : null;
  }

  /**
   * List purchase orders with filtering and pagination
   */
  async list(
    tenantId: string,
    branchId: string,
    filters?: POFilters
  ): Promise<{ data: PurchaseOrderWithItems[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId,
      branchId,
    };

    // Apply filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.orderDate = {};
      if (filters.dateFrom) {
        where.orderDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.orderDate.lte = new Date(filters.dateTo);
      }
    }

    if (filters?.search) {
      where.OR = [
        { poNumber: { contains: filters.search, mode: 'insensitive' } },
        { vendor: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // Get total count
    const total = await prisma.purchaseOrder.count({ where });

    // Determine sort field and order
    const sortBy = filters?.sortBy ?? 'orderDate';
    const sortOrder = filters?.sortOrder ?? 'desc';

    // Get paginated data
    const pos = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        vendor: true,
        items: true,
      },
    });

    return {
      data: serializeDecimals(pos) as unknown as PurchaseOrderWithItems[],
      total,
      page,
      limit,
    };
  }

  // ============================================
  // Workflow Methods
  // Requirements: 7.1-7.7
  // ============================================

  /**
   * Send a purchase order to vendor
   * Requirement 7.2: Changes status from draft to sent
   */
  async send(tenantId: string, poId: string, _userId: string): Promise<PurchaseOrder> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    // Requirement 7.2: Only draft POs can be sent
    if (po.status !== 'draft') {
      throw new Error('Only draft purchase orders can be sent');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'sent' },
    });

    return serializeDecimals(updated) as unknown as PurchaseOrder;
  }

  /**
   * Cancel a purchase order
   * Requirement 7.6: Cannot cancel if any GRN exists
   * Requirement 7.7: Requires cancellation reason
   */
  async cancel(
    tenantId: string,
    poId: string,
    reason: string,
    userId: string
  ): Promise<PurchaseOrder> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Cancellation reason is required');
    }

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: {
        goodsReceipts: {
          take: 1,
        },
      },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    // Requirement 7.6: Cannot cancel if any GRN exists
    if (po.goodsReceipts.length > 0) {
      throw new Error('Cannot cancel purchase order with goods receipts');
    }

    // Cannot cancel already cancelled or fully received POs
    if (po.status === 'cancelled') {
      throw new Error('Purchase order is already cancelled');
    }

    if (po.status === 'fully_received') {
      throw new Error('Cannot cancel fully received purchase order');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason,
      },
    });

    return serializeDecimals(updated) as unknown as PurchaseOrder;
  }

  /**
   * Update PO status based on received quantities
   * Called after GRN confirmation
   */
  async updateStatusFromReceipts(tenantId: string, poId: string): Promise<PurchaseOrder> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: { items: true },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    // Calculate total ordered and received
    const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceived = po.items.reduce((sum, item) => sum + item.receivedQuantity, 0);

    let newStatus: POStatus = po.status as POStatus;

    if (totalReceived === 0) {
      // No receipts yet, keep current status
      newStatus = po.status as POStatus;
    } else if (totalReceived >= totalOrdered) {
      // All items received
      newStatus = 'fully_received';
    } else {
      // Partial receipt
      newStatus = 'partially_received';
    }

    if (newStatus !== po.status) {
      const updated = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: newStatus },
      });
      return serializeDecimals(updated) as unknown as PurchaseOrder;
    }

    return serializeDecimals(po) as unknown as PurchaseOrder;
  }

  // ============================================
  // Reorder Suggestions
  // Requirements: 8.1-8.5
  // ============================================

  /**
   * Get reorder suggestions for products below reorder level
   * Requirement 8.1: Show products below reorder level
   * Requirement 8.2: Calculate suggested quantity
   * Requirement 8.3: Show preferred vendor
   * Requirement 8.4: Show last purchase price
   * Requirement 8.5: Exclude products with pending POs
   */
  async getReorderSuggestions(tenantId: string, branchId: string): Promise<ReorderSuggestion[]> {
    // Get all products with branch settings that have reorder levels
    const branchSettings = await prisma.branchProductSettings.findMany({
      where: {
        tenantId,
        branchId,
        isEnabled: true,
        reorderLevel: { not: null },
      },
      include: {
        product: {
          include: {
            vendorMappings: {
              where: { isPreferred: true },
              include: { vendor: true },
              take: 1,
            },
          },
        },
      },
    });

    // Get current stock levels for these products
    const productIds = branchSettings.map((bs) => bs.productId);

    // Aggregate stock by product
    const stockAggregates = await prisma.stockBatch.groupBy({
      by: ['productId'],
      where: {
        branchId,
        productId: { in: productIds },
        isDepleted: false,
        isExpired: false,
      },
      _sum: {
        availableQuantity: true,
      },
    });

    const stockMap = new Map(
      stockAggregates.map((s) => [s.productId, s._sum.availableQuantity ?? 0])
    );

    // Get products with pending POs (Requirement 8.5)
    const pendingPOItems = await prisma.purchaseOrderItem.findMany({
      where: {
        tenantId,
        productId: { in: productIds },
        purchaseOrder: {
          branchId,
          status: { in: ['draft', 'sent', 'partially_received'] },
        },
        pendingQuantity: { gt: 0 },
      },
      select: { productId: true },
    });

    const productsWithPendingPO = new Set(pendingPOItems.map((item) => item.productId));

    // Build suggestions
    const suggestions: ReorderSuggestion[] = [];

    for (const bs of branchSettings) {
      const currentStock = stockMap.get(bs.productId) ?? 0;
      const reorderLevel = bs.reorderLevel ?? 0;

      // Only suggest if below reorder level
      if (currentStock < reorderLevel) {
        const preferredVendor = bs.product.vendorMappings[0];

        suggestions.push({
          productId: bs.productId,
          productName: bs.product.name,
          productSku: bs.product.sku,
          currentStock,
          reorderLevel,
          // Suggest enough to reach 2x reorder level
          suggestedQuantity: Math.max(reorderLevel * 2 - currentStock, reorderLevel),
          preferredVendorId: preferredVendor?.vendorId ?? null,
          preferredVendorName: preferredVendor?.vendor?.name ?? null,
          lastPurchasePrice: preferredVendor?.lastPurchasePrice
            ? Number(preferredVendor.lastPurchasePrice)
            : null,
          hasPendingPO: productsWithPendingPO.has(bs.productId),
        });
      }
    }

    // Sort by urgency (lowest stock relative to reorder level first)
    suggestions.sort((a, b) => {
      const urgencyA = a.currentStock / a.reorderLevel;
      const urgencyB = b.currentStock / b.reorderLevel;
      return urgencyA - urgencyB;
    });

    return suggestions;
  }

  /**
   * Delete a purchase order (only draft status)
   */
  async delete(tenantId: string, poId: string): Promise<void> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status !== 'draft') {
      throw new Error('Only draft purchase orders can be deleted');
    }

    await prisma.$transaction([
      prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: poId } }),
      prisma.purchaseOrder.delete({ where: { id: poId } }),
    ]);
  }
}

export const purchaseOrderService = new PurchaseOrderService();
