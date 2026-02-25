/**
 * FIFO Consumption Engine
 * Implements First In First Out stock consumption algorithm
 * Requirements: 12.5, 15.4, 16.4, 17.4, 24.2, 25.2
 */

import { MovementType as PrismaMovementType } from '@prisma/client';
import { prisma, serializeDecimals } from '../../lib/prisma';

import type { StockBatch, StockMovement, FIFOConsumptionResult } from './inventory.types';

export class FIFOEngine {
  /**
   * Get batches in FIFO order (oldest first, excluding expired and depleted)
   * Requirement 12.5: FIFO based on receipt date
   * Requirement 25.2: Skip expired batches
   */
  async getBatchesInFIFOOrder(branchId: string, productId: string): Promise<StockBatch[]> {
    // First, mark any expired batches
    await this.markExpiredBatches(branchId, productId);

    const batches = await prisma.stockBatch.findMany({
      where: {
        branchId,
        productId,
        isDepleted: false,
        isExpired: false,
        availableQuantity: { gt: 0 },
      },
      orderBy: [
        { receiptDate: 'asc' }, // Oldest first (FIFO)
        { createdAt: 'asc' }, // Tie-breaker
      ],
    });

    return serializeDecimals(batches) as unknown as StockBatch[];
  }

  /**
   * Mark batches as expired based on expiry date
   */
  async markExpiredBatches(branchId: string, productId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.stockBatch.updateMany({
      where: {
        branchId,
        productId,
        isExpired: false,
        expiryDate: {
          lt: today,
        },
      },
      data: {
        isExpired: true,
      },
    });
  }

  /**
   * Consume stock using FIFO (First In First Out)
   * - Selects oldest non-expired batches first
   * - Skips expired batches
   * - Returns consumed batches and any shortfall
   *
   * Requirements: 12.5, 15.4, 16.4, 17.4, 24.2, 25.2
   */
  async consume(
    tenantId: string,
    branchId: string,
    productId: string,
    quantity: number,
    movementType: PrismaMovementType,
    referenceType?: string,
    referenceId?: string,
    userId?: string,
    notes?: string
  ): Promise<FIFOConsumptionResult> {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // Get available batches in FIFO order
    const batches = await this.getBatchesInFIFOOrder(branchId, productId);

    if (batches.length === 0) {
      return {
        success: false,
        consumedBatches: [],
        totalConsumed: 0,
        shortfall: quantity,
        movements: [],
      };
    }

    let remainingQuantity = quantity;
    const consumedBatches: Array<{ batchId: string; quantity: number; unitCost: number }> = [];
    const movements: StockMovement[] = [];

    // Use transaction for atomic updates
    await prisma.$transaction(async (tx) => {
      for (const batch of batches) {
        if (remainingQuantity <= 0) break;

        const availableQty = batch.availableQuantity;
        const consumeQty = Math.min(availableQty, remainingQuantity);

        if (consumeQty > 0) {
          const newAvailableQty = availableQty - consumeQty;
          const isDepleted = newAvailableQty === 0;

          // Update batch
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: {
              availableQuantity: newAvailableQty,
              isDepleted,
            },
          });

          // Create movement record
          const movement = await tx.stockMovement.create({
            data: {
              tenantId,
              branchId,
              productId,
              batchId: batch.id,
              movementType,
              quantity: -consumeQty, // Negative for consumption
              quantityBefore: availableQty,
              quantityAfter: newAvailableQty,
              referenceType,
              referenceId,
              notes,
              createdBy: userId,
            },
          });

          consumedBatches.push({
            batchId: batch.id,
            quantity: consumeQty,
            unitCost: batch.unitCost,
          });

          movements.push(serializeDecimals(movement) as StockMovement);
          remainingQuantity -= consumeQty;
        }
      }
    });

    const totalConsumed = quantity - remainingQuantity;
    const shortfall = remainingQuantity;

    return {
      success: shortfall === 0,
      consumedBatches,
      totalConsumed,
      shortfall,
      movements,
    };
  }

  /**
   * Calculate weighted average cost from available batches
   * Used for transfer valuation and reporting
   */
  async calculateWeightedAverageCost(branchId: string, productId: string): Promise<number> {
    const batches = await prisma.stockBatch.findMany({
      where: {
        branchId,
        productId,
        isDepleted: false,
        isExpired: false,
        availableQuantity: { gt: 0 },
      },
    });

    if (batches.length === 0) {
      return 0;
    }

    let totalValue = 0;
    let totalQuantity = 0;

    for (const batch of batches) {
      totalValue += batch.availableQuantity * Number(batch.unitCost);
      totalQuantity += batch.availableQuantity;
    }

    return totalQuantity > 0 ? totalValue / totalQuantity : 0;
  }

  /**
   * Check if sufficient stock is available
   */
  async checkAvailability(
    branchId: string,
    productId: string,
    quantity: number
  ): Promise<{ available: boolean; currentStock: number; shortfall: number }> {
    const batches = await this.getBatchesInFIFOOrder(branchId, productId);

    const currentStock = batches.reduce((sum, b) => sum + b.availableQuantity, 0);
    const shortfall = Math.max(0, quantity - currentStock);

    return {
      available: currentStock >= quantity,
      currentStock,
      shortfall,
    };
  }

  /**
   * Get total available quantity for a product at a branch
   */
  async getAvailableQuantity(branchId: string, productId: string): Promise<number> {
    const result = await prisma.stockBatch.aggregate({
      where: {
        branchId,
        productId,
        isDepleted: false,
        isExpired: false,
      },
      _sum: {
        availableQuantity: true,
      },
    });

    return result._sum.availableQuantity ?? 0;
  }
}

export const fifoEngine = new FIFOEngine();
