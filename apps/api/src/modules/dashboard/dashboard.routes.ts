/**
 * Dashboard Routes
 * API routes for Command Center dashboard
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permission.guard';
import { successResponse } from '@/lib/response';
import { dashboardService } from './dashboard.service';
import { commandCenterQuerySchema, ownerDashboardQuerySchema } from './dashboard.schema';

// Response schemas for OpenAPI
const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

export async function dashboardRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Apply auth middleware to all routes
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/dashboard/command-center
   * Get Command Center data for a branch
   */
  app.get(
    '/command-center',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Dashboard'],
        summary: 'Get Command Center data',
        description:
          'Get aggregated dashboard data including stats, stations, next up queue, attention items, and timeline.',
        querystring: commandCenterQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { branchId, date } = request.query;

      const data = await dashboardService.getCommandCenter(tenantId, branchId, date);

      return reply.send(successResponse(data));
    }
  );

  /**
   * GET /api/v1/dashboard/owner
   * Get Owner Dashboard data (revenue, appointments, inventory, staff)
   */
  app.get(
    '/owner',
    {
      preHandler: [requirePermission('reports:read')],
      schema: {
        tags: ['Dashboard'],
        summary: 'Get Owner Dashboard data',
        description:
          'Get owner/manager dashboard data including revenue metrics, appointment stats, inventory alerts, and staff summary.',
        querystring: ownerDashboardQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { branchId } = request.query;

      const data = await dashboardService.getOwnerDashboard(tenantId, branchId);

      return reply.send(successResponse(data));
    }
  );
}

export default dashboardRoutes;
