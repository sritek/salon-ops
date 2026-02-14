/**
 * Audit Routes
 * API endpoints for stock audit management
 */

import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware';
import {
  createAuditSchema,
  updateCountSchema,
  auditFiltersSchema,
  auditResponseSchema,
  auditListResponseSchema,
  auditItemResponseSchema,
} from './audit.schema';
import {
  createAudit,
  getAudit,
  listAudits,
  updateCount,
  completeAudit,
  postAdjustments,
} from './audit.controller';
import { z } from 'zod';

export default async function auditRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // Audit CRUD
  // ============================================

  // List audits
  fastify.get(
    '/inventory/audits',
    {
      schema: {
        tags: ['Inventory - Audits'],
        summary: 'List audits',
        description: 'Get a paginated list of stock audits for a branch',
        querystring: auditFiltersSchema.extend({
          branchId: z.string().uuid(),
        }),
        response: {
          200: auditListResponseSchema,
        },
      },
    },
    listAudits
  );

  // Create audit
  fastify.post(
    '/inventory/audits',
    {
      schema: {
        tags: ['Inventory - Audits'],
        summary: 'Create audit',
        description: 'Create a new stock audit (full, partial, or category)',
        body: createAuditSchema,
        response: {
          201: auditResponseSchema,
        },
      },
    },
    createAudit
  );

  // Get audit by ID
  fastify.get(
    '/inventory/audits/:id',
    {
      schema: {
        tags: ['Inventory - Audits'],
        summary: 'Get audit',
        description: 'Get a single audit by ID with all items',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: auditResponseSchema,
        },
      },
    },
    getAudit
  );

  // ============================================
  // Counting Operations
  // ============================================

  // Update physical count for an item
  fastify.patch(
    '/inventory/audits/:id/items/:itemId',
    {
      schema: {
        tags: ['Inventory - Audits'],
        summary: 'Update count',
        description: 'Update physical count for an audit item',
        params: z.object({
          id: z.string().uuid(),
          itemId: z.string().uuid(),
        }),
        body: updateCountSchema,
        response: {
          200: auditItemResponseSchema,
        },
      },
    },
    updateCount
  );

  // ============================================
  // Workflow Operations
  // ============================================

  // Complete audit
  fastify.post(
    '/inventory/audits/:id/complete',
    {
      schema: {
        tags: ['Inventory - Audits'],
        summary: 'Complete audit',
        description: 'Complete an audit (all items must be counted)',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: auditResponseSchema,
        },
      },
    },
    completeAudit
  );

  // Post adjustments
  fastify.post(
    '/inventory/audits/:id/post',
    {
      schema: {
        tags: ['Inventory - Audits'],
        summary: 'Post adjustments',
        description: 'Post audit adjustments to stock (creates stock movements)',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: auditResponseSchema,
        },
      },
    },
    postAdjustments
  );
}
