/**
 * Goods Receipt Service
 * Business logic for goods receipt note (GRN) management
 * Requirements: 9.1-9.7, 10.1-10.5, 11.1-11.7
 */

import { prisma, serializeDecimals } from '../../lib/prisma';

import type { Prisma } from '@prisma/client';
import type {
  GoodsReceiptNoteWithItems,
  CreateGRNInput,
  UpdateGRNInput,
  GRNFilters,
} from './inventory.types';
import { purchaseOrderService } from './purchase-order.service';
import { vendorService } from './vendor.service';

export class GoodsReceiptService {
  // ============================================
  // GRN Number Generation
  // Requirement 9.1: Format GRN/{BRANCH_CODE}/{YEAR}/{SEQUENCE}
  // ============================================

  /**
   * Generate a unique GRN number for a branch
   * Format: GRN/{BRANCH_CODE}/{YEAR}/{SEQUENCE}
   */
  async generateGRNNumber(branchId: string): Promise<string> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { slug: true },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    const branchCode = branch.slug.toUpperCase().slice(0, 4);
    const year = new Date().getFullYear();

    // Get the latest GRN number for this branch and year
    const latestGRN = await prisma.goodsReceiptNote.findFirst({
      where: {
        branchId,
        grnNumber: {
          startsWith: `GRN/${branchCode}/${year}/`,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { grnNumber: true },
    });

    let sequence = 1;
    if (latestGRN) {
      const parts = latestGRN.grnNumber.split('/');
      const lastSequence = parseInt(parts[3], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `GRN/${branchCode}/${year}/${sequence.toString().padStart(5, '0')}`;
  }

  // ============================================
  // CRUD Operations
  // Requirements: 9.1-9.7
  // ============================================

  /**
   * Create a new goods receipt note
   * Requirement 9.2: GRN starts in draft status
   * Requirement 9.3: Can be linked to PO or standalone
   */
  async create(
    tenantId: string,
    data: CreateGRNInput,
    createdBy?: string
  ): Promise<GoodsReceiptNoteWithItems> {
    // Validate vendor exists
    const vendor = await prisma.vendor.findFirst({
      where: { id: data.vendorId, tenantId, deletedAt: null },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Validate items
    if (!data.items || data.items.length === 0) {
      throw new Error('Goods receipt must have at least one item');
    }

    // If linked to PO, validate PO exists and is in valid status
    if (data.purchaseOrderId) {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: data.purchaseOrderId, tenantId },
      });

      if (!po) {
        throw new Error('Purchase order not found');
      }

      if (po.status === 'cancelled') {
        throw new Error('Cannot create GRN for cancelled purchase order');
      }

      if (po.status === 'draft') {
        throw new Error('Cannot create GRN for draft purchase order');
      }

      // Validate vendor matches PO vendor
      if (po.vendorId !== data.vendorId) {
        throw new Error('Vendor must match purchase order vendor');
      }
    }

    // Validate all products exist
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

    // Generate GRN number
    const grnNumber = await this.generateGRNNumber(data.branchId);

    // Calculate totals
    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    let totalTax = 0;

    const itemsData = data.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const taxRate = item.taxRate ?? Number(product.taxRate);
      const lineTotal = item.receivedQuantity * item.unitCost;
      const taxAmount = lineTotal * (taxRate / 100);

      subtotal += lineTotal;
      totalTax += taxAmount;

      // Validate quality check status
      const acceptedQty = item.acceptedQuantity;
      const rejectedQty = item.rejectedQuantity ?? 0;
      const totalQty = item.receivedQuantity + (item.focQuantity ?? 0);

      if (acceptedQty + rejectedQty !== totalQty) {
        throw new Error(
          `Accepted + rejected quantities must equal total received for product ${product.name}`
        );
      }

      // Requirement 10.3: Rejection reason required for rejected items
      if (rejectedQty > 0 && !item.rejectionReason) {
        throw new Error(`Rejection reason required for product ${product.name}`);
      }

      return {
        tenantId,
        productId: item.productId,
        productName: product.name,
        purchaseOrderItemId: item.purchaseOrderItemId,
        receivedQuantity: item.receivedQuantity,
        focQuantity: item.focQuantity ?? 0,
        unitCost: item.unitCost,
        taxRate,
        taxAmount,
        totalAmount: lineTotal + taxAmount,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        qualityCheckStatus: item.qualityCheckStatus ?? 'accepted',
        acceptedQuantity: acceptedQty,
        rejectedQuantity: rejectedQty,
        rejectionReason: item.rejectionReason,
      };
    });

    const grandTotal = subtotal + totalTax;

    // Create GRN with items in a transaction
    const grn = await prisma.goodsReceiptNote.create({
      data: {
        tenantId,
        branchId: data.branchId,
        grnNumber,
        purchaseOrderId: data.purchaseOrderId,
        vendorId: data.vendorId,
        status: 'draft',
        receiptDate: data.receiptDate ? new Date(data.receiptDate) : new Date(),
        subtotal,
        taxAmount: totalTax,
        grandTotal,
        notes: data.notes,
        createdBy,
        items: {
          create: itemsData,
        },
      },
      include: {
        vendor: true,
        purchaseOrder: true,
        items: true,
      },
    });

    return serializeDecimals(grn) as unknown as GoodsReceiptNoteWithItems;
  }

  /**
   * Update a goods receipt note (only in draft status)
   * Requirement 11.6: Confirmed GRNs cannot be edited
   */
  async update(
    tenantId: string,
    grnId: string,
    data: UpdateGRNInput,
    _updatedBy?: string
  ): Promise<GoodsReceiptNoteWithItems> {
    const existing = await prisma.goodsReceiptNote.findFirst({
      where: { id: grnId, tenantId },
      include: { items: true },
    });

    if (!existing) {
      throw new Error('Goods receipt not found');
    }

    // Requirement 11.6: Confirmed GRNs cannot be edited
    if (existing.status !== 'draft') {
      throw new Error('Only draft goods receipts can be edited');
    }

    let updateData: Prisma.GoodsReceiptNoteUpdateInput = {
      ...(data.receiptDate && { receiptDate: new Date(data.receiptDate) }),
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

      // Calculate new totals
      const productMap = new Map(products.map((p) => [p.id, p]));
      let subtotal = 0;
      let totalTax = 0;

      const itemsData = data.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const taxRate = item.taxRate ?? Number(product.taxRate);
        const lineTotal = item.receivedQuantity * item.unitCost;
        const taxAmount = lineTotal * (taxRate / 100);

        subtotal += lineTotal;
        totalTax += taxAmount;

        const acceptedQty = item.acceptedQuantity;
        const rejectedQty = item.rejectedQuantity ?? 0;
        const totalQty = item.receivedQuantity + (item.focQuantity ?? 0);

        if (acceptedQty + rejectedQty !== totalQty) {
          throw new Error(
            `Accepted + rejected quantities must equal total received for product ${product.name}`
          );
        }

        if (rejectedQty > 0 && !item.rejectionReason) {
          throw new Error(`Rejection reason required for product ${product.name}`);
        }

        return {
          tenantId,
          productId: item.productId,
          productName: product.name,
          purchaseOrderItemId: item.purchaseOrderItemId,
          receivedQuantity: item.receivedQuantity,
          focQuantity: item.focQuantity ?? 0,
          unitCost: item.unitCost,
          taxRate,
          taxAmount,
          totalAmount: lineTotal + taxAmount,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          qualityCheckStatus: item.qualityCheckStatus ?? 'accepted',
          acceptedQuantity: acceptedQty,
          rejectedQuantity: rejectedQty,
          rejectionReason: item.rejectionReason,
        };
      });

      const grandTotal = subtotal + totalTax;

      // Delete existing items and create new ones
      await prisma.goodsReceiptItem.deleteMany({
        where: { goodsReceiptId: grnId },
      });

      await prisma.goodsReceiptItem.createMany({
        data: itemsData.map((item) => ({
          ...item,
          goodsReceiptId: grnId,
        })),
      });

      updateData = {
        ...updateData,
        subtotal,
        taxAmount: totalTax,
        grandTotal,
      };
    }

    const grn = await prisma.goodsReceiptNote.update({
      where: { id: grnId },
      data: updateData,
      include: {
        vendor: true,
        purchaseOrder: true,
        items: true,
      },
    });

    return serializeDecimals(grn) as unknown as GoodsReceiptNoteWithItems;
  }

  /**
   * Get a single goods receipt by ID
   */
  async get(tenantId: string, grnId: string): Promise<GoodsReceiptNoteWithItems | null> {
    const grn = await prisma.goodsReceiptNote.findFirst({
      where: { id: grnId, tenantId },
      include: {
        vendor: true,
        purchaseOrder: true,
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return grn ? (serializeDecimals(grn) as unknown as GoodsReceiptNoteWithItems) : null;
  }

  /**
   * List goods receipts with filtering and pagination
   */
  async list(
    tenantId: string,
    branchId: string,
    filters?: GRNFilters
  ): Promise<{ data: GoodsReceiptNoteWithItems[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const where: Prisma.GoodsReceiptNoteWhereInput = {
      tenantId,
      branchId,
    };

    // Apply filters
    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.purchaseOrderId) {
      where.purchaseOrderId = filters.purchaseOrderId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.receiptDate = {};
      if (filters.dateFrom) {
        where.receiptDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.receiptDate.lte = new Date(filters.dateTo);
      }
    }

    if (filters?.search) {
      where.OR = [
        { grnNumber: { contains: filters.search, mode: 'insensitive' } },
        { vendor: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // Get total count
    const total = await prisma.goodsReceiptNote.count({ where });

    // Determine sort field and order
    const sortBy = filters?.sortBy ?? 'receiptDate';
    const sortOrder = filters?.sortOrder ?? 'desc';

    // Get paginated data
    const grns = await prisma.goodsReceiptNote.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        vendor: true,
        purchaseOrder: true,
        items: true,
      },
    });

    return {
      data: serializeDecimals(grns) as unknown as GoodsReceiptNoteWithItems[],
      total,
      page,
      limit,
    };
  }

  // ============================================
  // GRN Confirmation
  // Requirements: 11.1-11.7
  // ============================================

  /**
   * Confirm a goods receipt note
   * Requirement 11.1: Creates stock batches for accepted quantities
   * Requirement 11.3: Stock batch created with unit cost from GRN
   * Requirement 11.4: Updates PO received quantities
   * Requirement 11.5: Updates vendor-product last purchase price
   * Requirement 11.6: Locks GRN from further edits
   * Requirement 11.7: Creates stock movement records
   */
  async confirm(
    tenantId: string,
    grnId: string,
    userId: string
  ): Promise<GoodsReceiptNoteWithItems> {
    const grn = await prisma.goodsReceiptNote.findFirst({
      where: { id: grnId, tenantId },
      include: {
        items: true,
        purchaseOrder: {
          include: { items: true },
        },
      },
    });

    if (!grn) {
      throw new Error('Goods receipt not found');
    }

    if (grn.status !== 'draft') {
      throw new Error('Goods receipt is already confirmed');
    }

    // Validate expiry dates for products that require them
    for (const item of grn.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { category: true },
      });

      if (product) {
        const requiresExpiry =
          product.expiryTrackingEnabled || product.category?.expiryTrackingEnabled;
        if (requiresExpiry && !item.expiryDate && item.acceptedQuantity > 0) {
          throw new Error(`Expiry date required for product: ${item.productName}`);
        }
      }
    }

    // Use transaction for all updates
    const result = await prisma.$transaction(async (tx) => {
      const stockBatches = [];
      const stockMovements = [];

      for (const item of grn.items) {
        // Only create batches for accepted quantities
        if (item.acceptedQuantity > 0) {
          // Requirement 11.1, 11.3: Create stock batch
          const totalQuantity = item.acceptedQuantity;
          const totalValue = totalQuantity * Number(item.unitCost);

          const batch = await tx.stockBatch.create({
            data: {
              tenantId,
              branchId: grn.branchId,
              productId: item.productId,
              batchNumber: item.batchNumber,
              quantity: totalQuantity,
              availableQuantity: totalQuantity,
              unitCost: item.unitCost,
              totalValue,
              receiptDate: grn.receiptDate,
              expiryDate: item.expiryDate,
              isExpired: false,
              isDepleted: false,
              goodsReceiptItemId: item.id,
            },
          });

          stockBatches.push(batch);

          // Requirement 11.7: Create stock movement record
          const movement = await tx.stockMovement.create({
            data: {
              tenantId,
              branchId: grn.branchId,
              productId: item.productId,
              batchId: batch.id,
              movementType: 'receipt',
              quantity: totalQuantity,
              quantityBefore: 0,
              quantityAfter: totalQuantity,
              referenceType: 'goods_receipt',
              referenceId: grn.id,
              notes: `GRN: ${grn.grnNumber}`,
              createdBy: userId,
            },
          });

          stockMovements.push(movement);
        }

        // Requirement 11.5: Update vendor-product last purchase price
        await vendorService.updateLastPurchasePrice(
          tenantId,
          grn.vendorId,
          item.productId,
          Number(item.unitCost)
        );
      }

      // Requirement 11.4: Update PO received quantities if linked
      if (grn.purchaseOrderId && grn.purchaseOrder) {
        for (const grnItem of grn.items) {
          if (grnItem.purchaseOrderItemId) {
            const poItem = grn.purchaseOrder.items.find(
              (poi) => poi.id === grnItem.purchaseOrderItemId
            );

            if (poItem) {
              const newReceivedQty = poItem.receivedQuantity + grnItem.acceptedQuantity;
              const newPendingQty = Math.max(0, poItem.quantity - newReceivedQty);

              await tx.purchaseOrderItem.update({
                where: { id: poItem.id },
                data: {
                  receivedQuantity: newReceivedQty,
                  pendingQuantity: newPendingQty,
                },
              });
            }
          }
        }

        // Update PO status based on received quantities
        await purchaseOrderService.updateStatusFromReceipts(tenantId, grn.purchaseOrderId);
      }

      // Update vendor last purchase date
      await vendorService.updateLastPurchaseDate(tenantId, grn.vendorId, grn.receiptDate);

      // Requirement 11.6: Mark GRN as confirmed (locks from further edits)
      const confirmedGRN = await tx.goodsReceiptNote.update({
        where: { id: grnId },
        data: {
          status: 'confirmed',
          confirmedAt: new Date(),
          confirmedBy: userId,
        },
        include: {
          vendor: true,
          purchaseOrder: true,
          items: true,
        },
      });

      return confirmedGRN;
    });

    return serializeDecimals(result) as unknown as GoodsReceiptNoteWithItems;
  }

  /**
   * Create a GRN from a purchase order
   * Pre-populates items from PO pending quantities
   */
  async createFromPO(
    tenantId: string,
    purchaseOrderId: string,
    branchId: string,
    createdBy?: string
  ): Promise<GoodsReceiptNoteWithItems> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
      include: {
        items: {
          where: { pendingQuantity: { gt: 0 } },
        },
      },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status === 'cancelled') {
      throw new Error('Cannot create GRN for cancelled purchase order');
    }

    if (po.status === 'draft') {
      throw new Error('Cannot create GRN for draft purchase order');
    }

    if (po.items.length === 0) {
      throw new Error('No pending items in purchase order');
    }

    // Create GRN with PO items
    const grnInput: CreateGRNInput = {
      branchId,
      purchaseOrderId,
      vendorId: po.vendorId,
      items: po.items.map((item) => ({
        productId: item.productId,
        purchaseOrderItemId: item.id,
        receivedQuantity: item.pendingQuantity,
        focQuantity: 0,
        unitCost: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        qualityCheckStatus: 'accepted',
        acceptedQuantity: item.pendingQuantity,
        rejectedQuantity: 0,
      })),
    };

    return this.create(tenantId, grnInput, createdBy);
  }

  /**
   * Delete a goods receipt (only draft status)
   */
  async delete(tenantId: string, grnId: string): Promise<void> {
    const grn = await prisma.goodsReceiptNote.findFirst({
      where: { id: grnId, tenantId },
    });

    if (!grn) {
      throw new Error('Goods receipt not found');
    }

    if (grn.status !== 'draft') {
      throw new Error('Only draft goods receipts can be deleted');
    }

    await prisma.$transaction([
      prisma.goodsReceiptItem.deleteMany({ where: { goodsReceiptId: grnId } }),
      prisma.goodsReceiptNote.delete({ where: { id: grnId } }),
    ]);
  }
}

export const goodsReceiptService = new GoodsReceiptService();
