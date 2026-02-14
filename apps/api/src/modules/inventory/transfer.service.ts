/**
 * Transfer Service
 * Business logic for inter-branch stock transfers
 * Requirements: 18.1-18.6, 19.1-19.7, 20.1-20.3
 */

import { prisma, serializeDecimals } from '../../lib/prisma';

import type { Prisma } from '@prisma/client';
import type {
  StockTransferWithItems,
  CreateTransferInput,
  DispatchItemInput,
  ReceiveItemInput,
  TransferFilters,
} from './inventory.types';
import { fifoEngine } from './fifo-engine';

// Helper type for Prisma transfer with items
type PrismaTransferWithItems = Prisma.StockTransferGetPayload<{
  include: { items: true };
}>;

export class TransferService {
  /**
   * Helper to add branch names to transfer result
   */
  private async addBranchNames(transfer: PrismaTransferWithItems): Promise<StockTransferWithItems> {
    const [sourceBranch, destinationBranch] = await Promise.all([
      prisma.branch.findUnique({
        where: { id: transfer.sourceBranchId },
        select: { id: true, name: true },
      }),
      prisma.branch.findUnique({
        where: { id: transfer.destinationBranchId },
        select: { id: true, name: true },
      }),
    ]);

    return serializeDecimals({
      ...transfer,
      sourceBranch: sourceBranch || undefined,
      destinationBranch: destinationBranch || undefined,
    }) as unknown as StockTransferWithItems;
  }

  /**
   * Helper to add branch names to multiple transfers
   */
  private async addBranchNamesToList(
    transfers: PrismaTransferWithItems[]
  ): Promise<StockTransferWithItems[]> {
    // Collect unique branch IDs
    const branchIds = new Set<string>();
    for (const t of transfers) {
      branchIds.add(t.sourceBranchId);
      branchIds.add(t.destinationBranchId);
    }

    // Fetch all branches in one query
    const branches = await prisma.branch.findMany({
      where: { id: { in: Array.from(branchIds) } },
      select: { id: true, name: true },
    });

    const branchMap = new Map(branches.map((b) => [b.id, b]));

    return transfers.map(
      (transfer) =>
        serializeDecimals({
          ...transfer,
          sourceBranch: branchMap.get(transfer.sourceBranchId) || undefined,
          destinationBranch: branchMap.get(transfer.destinationBranchId) || undefined,
        }) as unknown as StockTransferWithItems
    );
  }
  // ============================================
  // Transfer Number Generation
  // Requirement 18.1: Format TRF/{SOURCE_BRANCH}/{YEAR}/{SEQUENCE}
  // ============================================

  /**
   * Generate unique transfer number
   */
  async generateTransferNumber(tenantId: string, sourceBranchId: string): Promise<string> {
    const branch = await prisma.branch.findUnique({
      where: { id: sourceBranchId },
      select: { name: true },
    });

    const branchCode = branch?.name?.substring(0, 3).toUpperCase() || 'XXX';
    const year = new Date().getFullYear();

    // Get the last transfer number for this branch and year
    const lastTransfer = await prisma.stockTransfer.findFirst({
      where: {
        tenantId,
        sourceBranchId,
        transferNumber: {
          startsWith: `TRF/${branchCode}/${year}/`,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { transferNumber: true },
    });

    let sequence = 1;
    if (lastTransfer) {
      const parts = lastTransfer.transferNumber.split('/');
      const lastSeq = parseInt(parts[3], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `TRF/${branchCode}/${year}/${sequence.toString().padStart(4, '0')}`;
  }

  // ============================================
  // CRUD Operations
  // Requirements: 18.1-18.5
  // ============================================

  /**
   * Create a new transfer request
   * Requirement 18.4: Validate source branch has sufficient stock
   */
  async create(
    tenantId: string,
    data: CreateTransferInput,
    userId: string
  ): Promise<StockTransferWithItems> {
    // Validate source and destination branches are different
    if (data.sourceBranchId === data.destinationBranchId) {
      throw new Error('Source and destination branches must be different');
    }

    // Validate stock availability at source branch
    const stockErrors: Array<{
      productId: string;
      productName: string;
      requestedQuantity: number;
      availableQuantity: number;
    }> = [];

    for (const item of data.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, tenantId, deletedAt: null },
        select: { id: true, name: true },
      });

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const availability = await fifoEngine.checkAvailability(
        data.sourceBranchId,
        item.productId,
        item.requestedQuantity
      );

      if (!availability.available) {
        stockErrors.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.requestedQuantity,
          availableQuantity: availability.currentStock,
        });
      }
    }

    if (stockErrors.length > 0) {
      throw new Error(
        `Insufficient stock for transfer: ${stockErrors.map((e) => `${e.productName} (need ${e.requestedQuantity}, have ${e.availableQuantity})`).join(', ')}`
      );
    }

    // Generate transfer number
    const transferNumber = await this.generateTransferNumber(tenantId, data.sourceBranchId);

    // Create transfer with items
    const transfer = await prisma.stockTransfer.create({
      data: {
        tenantId,
        transferNumber,
        sourceBranchId: data.sourceBranchId,
        destinationBranchId: data.destinationBranchId,
        status: 'requested',
        requestDate: new Date(),
        totalValue: 0, // Will be calculated on dispatch
        notes: data.notes,
        createdBy: userId,
        items: {
          create: await Promise.all(
            data.items.map(async (item) => {
              const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { name: true },
              });

              return {
                tenantId,
                productId: item.productId,
                productName: product?.name || '',
                requestedQuantity: item.requestedQuantity,
                dispatchedQuantity: 0,
                receivedQuantity: 0,
                discrepancy: 0,
                unitCost: 0, // Will be set on dispatch
                totalValue: 0,
              };
            })
          ),
        },
      },
      include: {
        items: true,
      },
    });

    return this.addBranchNames(transfer);
  }

  /**
   * Get a single transfer by ID
   */
  async get(tenantId: string, id: string): Promise<StockTransferWithItems | null> {
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
      },
    });

    return transfer ? this.addBranchNames(transfer) : null;
  }

  /**
   * List transfers with filtering
   * Supports filtering by source or destination branch
   */
  async list(
    tenantId: string,
    branchId: string,
    direction: 'outgoing' | 'incoming' | 'all',
    filters?: TransferFilters
  ): Promise<{ data: StockTransferWithItems[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const where: Prisma.StockTransferWhereInput = {
      tenantId,
    };

    // Filter by direction
    if (direction === 'outgoing') {
      where.sourceBranchId = branchId;
    } else if (direction === 'incoming') {
      where.destinationBranchId = branchId;
    } else {
      where.OR = [{ sourceBranchId: branchId }, { destinationBranchId: branchId }];
    }

    // Status filter
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    // Date filters
    if (filters?.dateFrom || filters?.dateTo) {
      where.requestDate = {};
      if (filters.dateFrom) {
        where.requestDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.requestDate.lte = new Date(filters.dateTo);
      }
    }

    // Search
    if (filters?.search) {
      where.transferNumber = { contains: filters.search, mode: 'insensitive' };
    }

    const total = await prisma.stockTransfer.count({ where });

    const sortBy = filters?.sortBy ?? 'requestDate';
    const sortOrder = filters?.sortOrder ?? 'desc';

    const transfers = await prisma.stockTransfer.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: true,
      },
    });

    return {
      data: await this.addBranchNamesToList(transfers),
      total,
      page,
      limit,
    };
  }

  // ============================================
  // Workflow Operations
  // Requirements: 19.1-19.7
  // ============================================

  /**
   * Approve a transfer request
   * Requirement 19.2: requested → approved
   */
  async approve(tenantId: string, id: string, userId: string): Promise<StockTransferWithItems> {
    const transfer = await this.get(tenantId, id);

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'requested') {
      throw new Error(`Cannot approve transfer in ${transfer.status} status`);
    }

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: userId,
      },
      include: {
        items: true,
      },
    });

    return this.addBranchNames(updated);
  }

  /**
   * Reject a transfer request
   * Requirement 19.3: requested → rejected
   */
  async reject(
    tenantId: string,
    id: string,
    reason: string,
    userId: string
  ): Promise<StockTransferWithItems> {
    const transfer = await this.get(tenantId, id);

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'requested') {
      throw new Error(`Cannot reject transfer in ${transfer.status} status`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: userId,
        rejectionReason: reason,
      },
      include: {
        items: true,
      },
    });

    return this.addBranchNames(updated);
  }

  /**
   * Dispatch a transfer
   * Requirement 19.4: approved → in_transit
   * Requirement 20.1: Deduct stock from source using FIFO, calculate weighted average cost
   */
  async dispatch(
    tenantId: string,
    id: string,
    items: DispatchItemInput[],
    userId: string
  ): Promise<StockTransferWithItems> {
    const transfer = await this.get(tenantId, id);

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'approved') {
      throw new Error(`Cannot dispatch transfer in ${transfer.status} status`);
    }

    // Validate and dispatch items
    let totalValue = 0;

    await prisma.$transaction(async (tx) => {
      for (const dispatchItem of items) {
        const transferItem = transfer.items.find((i) => i.productId === dispatchItem.productId);

        if (!transferItem) {
          throw new Error(`Product ${dispatchItem.productId} not in transfer`);
        }

        if (dispatchItem.dispatchedQuantity > transferItem.requestedQuantity) {
          throw new Error(
            `Dispatched quantity (${dispatchItem.dispatchedQuantity}) exceeds requested (${transferItem.requestedQuantity})`
          );
        }

        // Calculate weighted average cost for transfer valuation
        const avgCost = await fifoEngine.calculateWeightedAverageCost(
          transfer.sourceBranchId,
          dispatchItem.productId
        );

        // Consume stock from source branch using FIFO
        const consumeResult = await fifoEngine.consume(
          tenantId,
          transfer.sourceBranchId,
          dispatchItem.productId,
          dispatchItem.dispatchedQuantity,
          'transfer_out',
          'transfer',
          id,
          userId,
          `Transfer to ${transfer.destinationBranch?.name || transfer.destinationBranchId}`
        );

        if (consumeResult.shortfall > 0) {
          throw new Error(
            `Insufficient stock for ${transferItem.productName}: need ${dispatchItem.dispatchedQuantity}, available ${consumeResult.totalConsumed}`
          );
        }

        const itemValue = dispatchItem.dispatchedQuantity * avgCost;
        totalValue += itemValue;

        // Update transfer item
        await tx.stockTransferItem.update({
          where: { id: transferItem.id },
          data: {
            dispatchedQuantity: dispatchItem.dispatchedQuantity,
            unitCost: avgCost,
            totalValue: itemValue,
          },
        });
      }

      // Update transfer status
      await tx.stockTransfer.update({
        where: { id },
        data: {
          status: 'in_transit',
          dispatchedAt: new Date(),
          dispatchedBy: userId,
          totalValue,
        },
      });
    });

    return (await this.get(tenantId, id))!;
  }

  /**
   * Receive a transfer at destination
   * Requirement 19.5: in_transit → received
   * Requirement 19.6: Create stock batches at destination
   * Requirement 19.7: Calculate and record discrepancy
   * Requirement 20.2: Use transfer cost for new batches
   * Requirement 20.3: Record discrepancy
   */
  async receive(
    tenantId: string,
    id: string,
    items: ReceiveItemInput[],
    userId: string
  ): Promise<StockTransferWithItems> {
    const transfer = await this.get(tenantId, id);

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'in_transit') {
      throw new Error(`Cannot receive transfer in ${transfer.status} status`);
    }

    await prisma.$transaction(async (tx) => {
      for (const receiveItem of items) {
        const transferItem = transfer.items.find((i) => i.productId === receiveItem.productId);

        if (!transferItem) {
          throw new Error(`Product ${receiveItem.productId} not in transfer`);
        }

        const discrepancy = receiveItem.receivedQuantity - transferItem.dispatchedQuantity;

        // Create stock batch at destination branch
        if (receiveItem.receivedQuantity > 0) {
          await tx.stockBatch.create({
            data: {
              tenantId,
              branchId: transfer.destinationBranchId,
              productId: receiveItem.productId,
              quantity: receiveItem.receivedQuantity,
              availableQuantity: receiveItem.receivedQuantity,
              unitCost: transferItem.unitCost,
              totalValue: receiveItem.receivedQuantity * transferItem.unitCost,
              receiptDate: new Date(),
              isExpired: false,
              isDepleted: false,
              transferItemId: transferItem.id,
            },
          });

          // Create stock movement for receipt
          await tx.stockMovement.create({
            data: {
              tenantId,
              branchId: transfer.destinationBranchId,
              productId: receiveItem.productId,
              movementType: 'transfer_in',
              quantity: receiveItem.receivedQuantity,
              quantityBefore: 0,
              quantityAfter: receiveItem.receivedQuantity,
              referenceType: 'transfer',
              referenceId: id,
              notes: `Transfer from ${transfer.sourceBranch?.name || transfer.sourceBranchId}`,
              createdBy: userId,
            },
          });
        }

        // Update transfer item with received quantity and discrepancy
        await tx.stockTransferItem.update({
          where: { id: transferItem.id },
          data: {
            receivedQuantity: receiveItem.receivedQuantity,
            discrepancy,
          },
        });
      }

      // Update transfer status
      await tx.stockTransfer.update({
        where: { id },
        data: {
          status: 'received',
          receivedAt: new Date(),
          receivedBy: userId,
        },
      });
    });

    return (await this.get(tenantId, id))!;
  }

  /**
   * Cancel a transfer
   * Only allowed for requested or approved status
   */
  async cancel(
    tenantId: string,
    id: string,
    reason: string,
    userId: string
  ): Promise<StockTransferWithItems> {
    const transfer = await this.get(tenantId, id);

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (!['requested', 'approved'].includes(transfer.status)) {
      throw new Error(`Cannot cancel transfer in ${transfer.status} status`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Cancellation reason is required');
    }

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'cancelled',
        rejectedAt: new Date(),
        rejectedBy: userId,
        rejectionReason: reason,
      },
      include: {
        items: true,
      },
    });

    return this.addBranchNames(updated);
  }
}

export const transferService = new TransferService();
