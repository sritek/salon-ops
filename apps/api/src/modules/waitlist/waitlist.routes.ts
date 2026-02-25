/**
 * Waitlist Routes
 * API route definitions for waitlist management using Zod type provider
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { WaitlistService } from './waitlist.service';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.guard';
import { prisma } from '../../lib/prisma';
import { successResponse, paginatedResponse, deleteResponse } from '../../lib/response';

import {
  createWaitlistEntrySchema,
  updateWaitlistEntrySchema,
  listWaitlistQuerySchema,
  matchWaitlistQuerySchema,
  convertWaitlistSchema,
  idParamSchema,
  successResponseSchema,
  paginatedResponseSchema,
  errorResponseSchema,
} from './waitlist.schema';

export async function waitlistRoutes(fastify: FastifyInstance) {
  const waitlistService = new WaitlistService(prisma);

  // Cast to ZodTypeProvider for type inference
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Apply auth middleware to all routes
  app.addHook('preHandler', authenticate);

  // =====================================================
  // WAITLIST CRUD
  // =====================================================

  /**
   * List waitlist entries
   */
  app.get(
    '/',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Waitlist'],
        summary: 'List waitlist entries',
        description: 'Get a paginated list of waitlist entries with optional filters.',
        querystring: listWaitlistQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user!;
      const result = await waitlistService.list(tenantId, request.query);
      return reply.send(paginatedResponse(result.data as any[], result.meta));
    }
  );

  /**
   * Get waitlist entry by ID
   */
  app.get(
    '/:id',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Waitlist'],
        summary: 'Get waitlist entry by ID',
        description: 'Get detailed information about a specific waitlist entry.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user!;
      const { id } = request.params;
      const result = await waitlistService.getById(tenantId, id);
      return reply.send(successResponse(result));
    }
  );

  /**
   * Create a new waitlist entry
   */
  app.post(
    '/',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Waitlist'],
        summary: 'Create a new waitlist entry',
        description: 'Add a customer to the waitlist with their preferences.',
        body: createWaitlistEntrySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const result = await waitlistService.create(tenantId, request.body, userId);
      return reply.status(201).send(successResponse(result));
    }
  );

  /**
   * Update a waitlist entry
   */
  app.patch(
    '/:id',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Waitlist'],
        summary: 'Update a waitlist entry',
        description: 'Update waitlist entry details. Only active entries can be updated.',
        params: idParamSchema,
        body: updateWaitlistEntrySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const { id } = request.params;
      const result = await waitlistService.update(tenantId, id, request.body, userId);
      return reply.send(successResponse(result));
    }
  );

  /**
   * Delete (remove) a waitlist entry
   */
  app.delete(
    '/:id',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Waitlist'],
        summary: 'Remove a waitlist entry',
        description: 'Remove a waitlist entry. Converted entries cannot be removed.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const { id } = request.params;
      await waitlistService.remove(tenantId, id, userId);
      return reply.send(deleteResponse('Waitlist entry removed successfully'));
    }
  );

  // =====================================================
  // WAITLIST ACTIONS
  // =====================================================

  /**
   * Convert waitlist entry to appointment
   */
  app.post(
    '/:id/convert',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Waitlist'],
        summary: 'Convert waitlist entry to appointment',
        description:
          'Get appointment data from waitlist entry for creating an appointment. Returns data to be used with appointment creation endpoint.',
        params: idParamSchema,
        body: convertWaitlistSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const { id } = request.params;
      const result = await waitlistService.convert(tenantId, id, request.body, userId);
      // Return the appointment data without the markConverted function
      return reply.send(
        successResponse({
          waitlistEntry: result.waitlistEntry,
          appointmentData: result.appointmentData,
        })
      );
    }
  );

  /**
   * Find matching waitlist entries for a time slot
   */
  app.get(
    '/match',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Waitlist'],
        summary: 'Find matching waitlist entries',
        description:
          'Find waitlist entries that match a given time slot. Used for smart matching in the new appointment panel.',
        querystring: matchWaitlistQuerySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user!;
      const result = await waitlistService.findMatches(tenantId, request.query);
      return reply.send(successResponse(result));
    }
  );

  /**
   * Get active waitlist count for a branch
   */
  app.get(
    '/count',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Waitlist'],
        summary: 'Get active waitlist count',
        description: 'Get the count of active waitlist entries for a branch.',
        querystring: listWaitlistQuerySchema.pick({ branchId: true }),
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user!;
      const { branchId } = request.query as { branchId?: string };
      if (!branchId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_BRANCH_ID', message: 'branchId is required' },
        });
      }
      const count = await waitlistService.getActiveCount(tenantId, branchId);
      return reply.send(successResponse({ count }));
    }
  );
}
