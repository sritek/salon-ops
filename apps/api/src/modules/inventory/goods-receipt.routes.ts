/**
 * Goods Receipt Routes
 * API endpoints for goods receipt management
 */

import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware';
import {
  createGRNSchema,
  updateGRNSchema,
  grnFiltersSchema,
  grnResponseSchema,
  grnListResponseSchema,
} from './goods-receipt.schema';
import {
  createGoodsReceipt,
  updateGoodsReceipt,
  getGoodsReceipt,
  listGoodsReceipts,
  deleteGoodsReceipt,
  confirmGoodsReceipt,
  createGRNFromPO,
} from './goods-receipt.controller';
import { z } from 'zod';

export default async function goodsReceiptRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // Goods Receipt CRUD
  // ============================================

  // List goods receipts
  fastify.get(
    '/inventory/goods-receipts',
    {
      schema: {
        tags: ['Inventory - Goods Receipts'],
        summary: 'List goods receipts',
        description: 'Get a paginated list of goods receipts for a branch',
        querystring: grnFiltersSchema.extend({
          branchId: z.string().uuid(),
        }),
        response: {
          200: grnListResponseSchema,
        },
      },
    },
    listGoodsReceipts
  );

  // Create goods receipt
  fastify.post(
    '/inventory/goods-receipts',
    {
      schema: {
        tags: ['Inventory - Goods Receipts'],
        summary: 'Create goods receipt',
        description: 'Create a new goods receipt in draft status',
        body: createGRNSchema,
        response: {
          201: grnResponseSchema,
        },
      },
    },
    createGoodsReceipt
  );

  // Create GRN from PO
  fastify.post(
    '/inventory/goods-receipts/from-po/:poId',
    {
      schema: {
        tags: ['Inventory - Goods Receipts'],
        summary: 'Create GRN from purchase order',
        description: 'Create a goods receipt pre-populated from a purchase order',
        params: z.object({
          poId: z.string().uuid(),
        }),
        querystring: z.object({
          branchId: z.string().uuid(),
        }),
        response: {
          201: grnResponseSchema,
        },
      },
    },
    createGRNFromPO
  );

  // Get goods receipt by ID
  fastify.get(
    '/inventory/goods-receipts/:id',
    {
      schema: {
        tags: ['Inventory - Goods Receipts'],
        summary: 'Get goods receipt',
        description: 'Get a single goods receipt by ID',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: grnResponseSchema,
        },
      },
    },
    getGoodsReceipt
  );

  // Update goods receipt
  fastify.patch(
    '/inventory/goods-receipts/:id',
    {
      schema: {
        tags: ['Inventory - Goods Receipts'],
        summary: 'Update goods receipt',
        description: 'Update a goods receipt (only draft status)',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updateGRNSchema,
        response: {
          200: grnResponseSchema,
        },
      },
    },
    updateGoodsReceipt
  );

  // Delete goods receipt
  fastify.delete(
    '/inventory/goods-receipts/:id',
    {
      schema: {
        tags: ['Inventory - Goods Receipts'],
        summary: 'Delete goods receipt',
        description: 'Delete a goods receipt (only draft status)',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          204: z.null(),
        },
      },
    },
    deleteGoodsReceipt
  );

  // ============================================
  // Goods Receipt Workflow
  // ============================================

  // Confirm goods receipt
  fastify.post(
    '/inventory/goods-receipts/:id/confirm',
    {
      schema: {
        tags: ['Inventory - Goods Receipts'],
        summary: 'Confirm goods receipt',
        description: 'Confirm a goods receipt (creates stock batches, updates PO)',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: grnResponseSchema,
        },
      },
    },
    confirmGoodsReceipt
  );
}
