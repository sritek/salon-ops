/**
 * Stock Routes
 * API endpoints for stock management
 */

import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware';
import {
  stockFiltersSchema,
  movementFiltersSchema,
  consumeStockSchema,
  adjustStockSchema,
  stockSummaryListResponseSchema,
  stockSummaryResponseSchema,
  stockBatchListResponseSchema,
  stockMovementListResponseSchema,
  stockMovementResponseSchema,
  consumptionResultSchema,
  stockAvailabilityResponseSchema,
} from './stock.schema';
import {
  getStockSummary,
  getProductStock,
  getProductBatches,
  getAvailableBatches,
  getStockMovements,
  consumeStock,
  adjustStock,
  getLowStockAlerts,
  getNearExpiryAlerts,
  getExpiredStock,
  checkStockAvailability,
} from './stock.controller';
import { z } from 'zod';

export default async function stockRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // Stock Summary (Branch-scoped routes)
  // ============================================

  // Get stock summary for all products at a branch
  fastify.get(
    '/inventory/branches/:branchId/stock',
    {
      schema: {
        tags: ['Inventory - Stock'],
        summary: 'Get stock summary',
        description: 'Get stock summary for all products at a branch',
        params: z.object({
          branchId: z.string().uuid(),
        }),
        querystring: stockFiltersSchema,
        response: {
          200: stockSummaryListResponseSchema,
        },
      },
    },
    getStockSummary
  );

  // Get stock for a single product at a branch
  fastify.get(
    '/inventory/branches/:branchId/stock/:productId',
    {
      schema: {
        tags: ['Inventory - Stock'],
        summary: 'Get product stock',
        description: 'Get stock summary for a single product',
        params: z.object({
          branchId: z.string().uuid(),
          productId: z.string().uuid(),
        }),
        response: {
          200: stockSummaryResponseSchema,
        },
      },
    },
    getProductStock
  );

  // ============================================
  // Batches (Branch-scoped)
  // ============================================

  // Get all batches for a product
  fastify.get(
    '/inventory/branches/:branchId/stock/:productId/batches',
    {
      schema: {
        tags: ['Inventory - Stock'],
        summary: 'Get product batches',
        description: 'Get all stock batches for a product (FIFO order)',
        params: z.object({
          branchId: z.string().uuid(),
          productId: z.string().uuid(),
        }),
        response: {
          200: stockBatchListResponseSchema,
        },
      },
    },
    getProductBatches
  );

  // Get available batches for a product
  fastify.get(
    '/inventory/branches/:branchId/stock/:productId/batches/available',
    {
      schema: {
        tags: ['Inventory - Stock'],
        summary: 'Get available batches',
        description: 'Get available (non-depleted, non-expired) batches in FIFO order',
        params: z.object({
          branchId: z.string().uuid(),
          productId: z.string().uuid(),
        }),
        response: {
          200: stockBatchListResponseSchema,
        },
      },
    },
    getAvailableBatches
  );

  // ============================================
  // Movements (Branch-scoped)
  // ============================================

  // Get stock movements
  fastify.get(
    '/inventory/branches/:branchId/stock/movements',
    {
      schema: {
        tags: ['Inventory - Stock'],
        summary: 'Get stock movements',
        description: 'Get stock movement history with filters',
        params: z.object({
          branchId: z.string().uuid(),
        }),
        querystring: movementFiltersSchema,
        response: {
          200: stockMovementListResponseSchema,
        },
      },
    },
    getStockMovements
  );

  // ============================================
  // Consumption (Branch-scoped)
  // ============================================

  // Consume stock manually
  fastify.post(
    '/inventory/branches/:branchId/stock/consume',
    {
      schema: {
        tags: ['Inventory - Stock'],
        summary: 'Consume stock',
        description: 'Manually consume stock with reason code (uses FIFO)',
        params: z.object({
          branchId: z.string().uuid(),
        }),
        body: consumeStockSchema,
        response: {
          200: consumptionResultSchema,
        },
      },
    },
    consumeStock
  );

  // ============================================
  // Adjustments (Branch-scoped)
  // ============================================

  // Adjust stock
  fastify.post(
    '/inventory/branches/:branchId/stock/adjust',
    {
      schema: {
        tags: ['Inventory - Stock'],
        summary: 'Adjust stock',
        description: 'Increase or decrease stock with reason',
        params: z.object({
          branchId: z.string().uuid(),
        }),
        body: adjustStockSchema,
        response: {
          200: stockMovementResponseSchema,
        },
      },
    },
    adjustStock
  );

  // ============================================
  // Alerts (Branch-scoped)
  // ============================================

  // Get all alerts for a branch
  fastify.get(
    '/inventory/branches/:branchId/stock/alerts',
    {
      schema: {
        tags: ['Inventory - Alerts'],
        summary: 'Get stock alerts',
        description: 'Get low stock and near-expiry alerts for a branch',
        params: z.object({
          branchId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
          }),
        },
      },
    },
    getLowStockAlerts
  );

  // Get low stock alerts
  fastify.get(
    '/inventory/branches/:branchId/alerts/low-stock',
    {
      schema: {
        tags: ['Inventory - Alerts'],
        summary: 'Get low stock alerts',
        description: 'Get products below reorder level',
        params: z.object({
          branchId: z.string().uuid(),
        }),
        response: {
          200: stockSummaryListResponseSchema.omit({ meta: true }).extend({
            data: z.array(z.any()),
          }),
        },
      },
    },
    getLowStockAlerts
  );

  // Get near-expiry alerts
  fastify.get(
    '/inventory/branches/:branchId/alerts/near-expiry',
    {
      schema: {
        tags: ['Inventory - Alerts'],
        summary: 'Get near-expiry alerts',
        description: 'Get batches expiring within threshold days',
        params: z.object({
          branchId: z.string().uuid(),
        }),
        querystring: z.object({
          days: z.coerce.number().int().positive().default(30).optional(),
        }),
        response: {
          200: stockBatchListResponseSchema,
        },
      },
    },
    getNearExpiryAlerts
  );

  // Get expired stock
  fastify.get(
    '/inventory/branches/:branchId/alerts/expired',
    {
      schema: {
        tags: ['Inventory - Alerts'],
        summary: 'Get expired stock',
        description: 'Get expired batches with remaining quantity',
        params: z.object({
          branchId: z.string().uuid(),
        }),
        response: {
          200: stockBatchListResponseSchema,
        },
      },
    },
    getExpiredStock
  );

  // ============================================
  // Availability Check (Branch-scoped)
  // ============================================

  // Check stock availability
  fastify.get(
    '/inventory/branches/:branchId/stock/:productId/availability',
    {
      schema: {
        tags: ['Inventory - Stock'],
        summary: 'Check stock availability',
        description: 'Check if sufficient stock is available for a quantity',
        params: z.object({
          branchId: z.string().uuid(),
          productId: z.string().uuid(),
        }),
        querystring: z.object({
          quantity: z.coerce.number().positive(),
        }),
        response: {
          200: stockAvailabilityResponseSchema,
        },
      },
    },
    checkStockAvailability
  );
}
