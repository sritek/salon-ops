/**
 * Tenant Routes
 * API endpoints for tenant operations
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/permission.guard';
import { successResponse } from '../../lib/response';
import { tenantService } from './tenant.service';
import { updateTenantBodySchema } from './tenant.schema';

export async function tenantRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /tenant
   * Get current tenant details with usage statistics
   */
  app.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Tenant'],
        description: 'Get current tenant details with usage statistics',
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user!;
      const tenant = await tenantService.getTenant(tenantId);
      return reply.send(successResponse(tenant));
    }
  );

  /**
   * PATCH /tenant
   * Update tenant details (super_owner only)
   */
  app.patch(
    '/',
    {
      preHandler: [authenticate, requireRole(['super_owner'])],
      schema: {
        tags: ['Tenant'],
        description: 'Update tenant details (super_owner only)',
        body: updateTenantBodySchema,
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const tenant = await tenantService.updateTenant(tenantId, request.body, userId);
      return reply.send(successResponse(tenant));
    }
  );
}
