/**
 * Transfer Routes
 * API endpoints for stock transfer management
 */

import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware';
import {
  createTransferSchema,
  dispatchTransferSchema,
  receiveTransferSchema,
  rejectTransferSchema,
  cancelTransferSchema,
  transferFiltersSchema,
  transferDirectionSchema,
  transferResponseSchema,
  transferListResponseSchema,
} from './transfer.schema';
import {
  createTransfer,
  getTransfer,
  listTransfers,
  approveTransfer,
  rejectTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
} from './transfer.controller';
import { z } from 'zod';

export default async function transferRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // Transfer CRUD
  // ============================================

  // List transfers
  fastify.get(
    '/inventory/transfers',
    {
      schema: {
        tags: ['Inventory - Transfers'],
        summary: 'List transfers',
        description: 'Get a paginated list of transfers for a branch',
        querystring: transferFiltersSchema.extend({
          branchId: z.string().uuid(),
          direction: transferDirectionSchema.default('all'),
        }),
        response: {
          200: transferListResponseSchema,
        },
      },
    },
    listTransfers
  );

  // Create transfer request
  fastify.post(
    '/inventory/transfers',
    {
      schema: {
        tags: ['Inventory - Transfers'],
        summary: 'Create transfer request',
        description: 'Create a new inter-branch transfer request',
        body: createTransferSchema,
        response: {
          201: transferResponseSchema,
        },
      },
    },
    createTransfer
  );

  // Get transfer by ID
  fastify.get(
    '/inventory/transfers/:id',
    {
      schema: {
        tags: ['Inventory - Transfers'],
        summary: 'Get transfer',
        description: 'Get a single transfer by ID',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: transferResponseSchema,
        },
      },
    },
    getTransfer
  );

  // ============================================
  // Transfer Workflow
  // ============================================

  // Approve transfer
  fastify.post(
    '/inventory/transfers/:id/approve',
    {
      schema: {
        tags: ['Inventory - Transfers'],
        summary: 'Approve transfer',
        description: 'Approve a transfer request (requested → approved)',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: transferResponseSchema,
        },
      },
    },
    approveTransfer
  );

  // Reject transfer
  fastify.post(
    '/inventory/transfers/:id/reject',
    {
      schema: {
        tags: ['Inventory - Transfers'],
        summary: 'Reject transfer',
        description: 'Reject a transfer request with reason',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: rejectTransferSchema,
        response: {
          200: transferResponseSchema,
        },
      },
    },
    rejectTransfer
  );

  // Dispatch transfer
  fastify.post(
    '/inventory/transfers/:id/dispatch',
    {
      schema: {
        tags: ['Inventory - Transfers'],
        summary: 'Dispatch transfer',
        description: 'Dispatch a transfer (approved → in_transit). Deducts stock from source.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: dispatchTransferSchema,
        response: {
          200: transferResponseSchema,
        },
      },
    },
    dispatchTransfer
  );

  // Receive transfer
  fastify.post(
    '/inventory/transfers/:id/receive',
    {
      schema: {
        tags: ['Inventory - Transfers'],
        summary: 'Receive transfer',
        description:
          'Receive a transfer at destination (in_transit → received). Creates stock batches.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: receiveTransferSchema,
        response: {
          200: transferResponseSchema,
        },
      },
    },
    receiveTransfer
  );

  // Cancel transfer
  fastify.post(
    '/inventory/transfers/:id/cancel',
    {
      schema: {
        tags: ['Inventory - Transfers'],
        summary: 'Cancel transfer',
        description: 'Cancel a transfer (only for requested or approved status)',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: cancelTransferSchema,
        response: {
          200: transferResponseSchema,
        },
      },
    },
    cancelTransfer
  );
}
