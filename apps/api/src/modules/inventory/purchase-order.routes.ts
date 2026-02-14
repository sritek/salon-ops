/**
 * Purchase Order Routes
 * API endpoints for purchase order management
 */

import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware';
import {
  createPOSchema,
  updatePOSchema,
  cancelPOSchema,
  poFiltersSchema,
  poResponseSchema,
  poListResponseSchema,
  reorderSuggestionsResponseSchema,
} from './purchase-order.schema';
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  deletePurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
  getReorderSuggestions,
} from './purchase-order.controller';
import { z } from 'zod';

export default async function purchaseOrderRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // Purchase Order CRUD
  // ============================================

  // List purchase orders
  fastify.get(
    '/inventory/purchase-orders',
    {
      schema: {
        tags: ['Inventory - Purchase Orders'],
        summary: 'List purchase orders',
        description: 'Get a paginated list of purchase orders for a branch',
        querystring: poFiltersSchema.extend({
          branchId: z.string().uuid(),
        }),
        response: {
          200: poListResponseSchema,
        },
      },
    },
    listPurchaseOrders
  );

  // Create purchase order
  fastify.post(
    '/inventory/purchase-orders',
    {
      schema: {
        tags: ['Inventory - Purchase Orders'],
        summary: 'Create purchase order',
        description: 'Create a new purchase order in draft status',
        body: createPOSchema,
        response: {
          201: poResponseSchema,
        },
      },
    },
    createPurchaseOrder
  );

  // Get purchase order by ID
  fastify.get(
    '/inventory/purchase-orders/:id',
    {
      schema: {
        tags: ['Inventory - Purchase Orders'],
        summary: 'Get purchase order',
        description: 'Get a single purchase order by ID',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: poResponseSchema,
        },
      },
    },
    getPurchaseOrder
  );

  // Update purchase order
  fastify.patch(
    '/inventory/purchase-orders/:id',
    {
      schema: {
        tags: ['Inventory - Purchase Orders'],
        summary: 'Update purchase order',
        description: 'Update a purchase order (only draft status)',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updatePOSchema,
        response: {
          200: poResponseSchema,
        },
      },
    },
    updatePurchaseOrder
  );

  // Delete purchase order
  fastify.delete(
    '/inventory/purchase-orders/:id',
    {
      schema: {
        tags: ['Inventory - Purchase Orders'],
        summary: 'Delete purchase order',
        description: 'Delete a purchase order (only draft status)',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          204: z.null(),
        },
      },
    },
    deletePurchaseOrder
  );

  // ============================================
  // Purchase Order Workflow
  // ============================================

  // Send purchase order
  fastify.post(
    '/inventory/purchase-orders/:id/send',
    {
      schema: {
        tags: ['Inventory - Purchase Orders'],
        summary: 'Send purchase order',
        description: 'Send a draft purchase order to vendor (changes status to sent)',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: poResponseSchema,
        },
      },
    },
    sendPurchaseOrder
  );

  // Cancel purchase order
  fastify.post(
    '/inventory/purchase-orders/:id/cancel',
    {
      schema: {
        tags: ['Inventory - Purchase Orders'],
        summary: 'Cancel purchase order',
        description: 'Cancel a purchase order (cannot cancel if GRNs exist)',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: cancelPOSchema,
        response: {
          200: poResponseSchema,
        },
      },
    },
    cancelPurchaseOrder
  );

  // ============================================
  // Reorder Suggestions
  // ============================================

  // Get reorder suggestions
  fastify.get(
    '/inventory/reorder-suggestions',
    {
      schema: {
        tags: ['Inventory - Purchase Orders'],
        summary: 'Get reorder suggestions',
        description: 'Get products below reorder level with suggested quantities',
        querystring: z.object({
          branchId: z.string().uuid(),
        }),
        response: {
          200: reorderSuggestionsResponseSchema,
        },
      },
    },
    getReorderSuggestions
  );
}
