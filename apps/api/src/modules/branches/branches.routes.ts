/**
 * Branch Routes
 * API endpoints for branch operations
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/permission.guard';
import { successResponse } from '../../lib/response';
import { branchesService } from './branches.service';
import { branchQuerySchema, updateBranchBodySchema } from './branches.schema';

export async function branchRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /branches
   * Get branches by IDs (filtered to user's accessible branches)
   */
  app.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Branches'],
        querystring: branchQuerySchema,
      },
    },
    async (request, reply) => {
      const { tenantId, branchIds: userBranchIds } = (request as any).user!;
      const { ids } = request.query;

      // Parse requested branch IDs
      let requestedIds = ids ? ids.split(',').filter(Boolean) : [];

      // If no specific IDs requested, return all user's branches
      if (requestedIds.length === 0) {
        requestedIds = userBranchIds;
      } else {
        // Filter to only branches the user has access to
        requestedIds = requestedIds.filter((id: string) => userBranchIds.includes(id));
      }

      const branches = await branchesService.getBranchesByIds(tenantId, requestedIds);
      return reply.send(successResponse(branches));
    }
  );

  /**
   * GET /branches/:id
   * Get a single branch by ID
   */
  app.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Branches'],
      },
    },
    async (request, reply) => {
      const { tenantId, branchIds: userBranchIds } = (request as any).user!;
      const { id } = request.params as { id: string };

      // Check if user has access to this branch
      if (!userBranchIds.includes(id)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this branch',
          },
        });
      }

      const branch = await branchesService.getBranchById(tenantId, id);

      if (!branch) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Branch not found',
          },
        });
      }

      return reply.send(successResponse(branch));
    }
  );

  /**
   * PATCH /branches/:id
   * Update a branch (super_owner or regional_manager only)
   */
  app.patch(
    '/:id',
    {
      preHandler: [authenticate, requireRole(['super_owner', 'regional_manager'])],
      schema: {
        tags: ['Branches'],
        description: 'Update a branch (super_owner or regional_manager only)',
        body: updateBranchBodySchema,
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const { id } = request.params as { id: string };

      const branch = await branchesService.updateBranch(tenantId, id, request.body, userId);
      return reply.send(successResponse(branch));
    }
  );
}
