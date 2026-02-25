/**
 * Users Routes
 * API endpoints for user management operations
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/permission.guard';
import { successResponse, paginatedResponse, deleteResponse } from '../../lib/response';
import { usersService } from './users.service';
import {
  createUserBodySchema,
  updateUserBodySchema,
  listUsersQuerySchema,
  changePasswordBodySchema,
} from './users.schema';

export async function usersRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /users
   * List users with pagination (super_owner or regional_manager only)
   */
  app.get(
    '/',
    {
      preHandler: [authenticate, requireRole(['super_owner', 'regional_manager'])],
      schema: {
        tags: ['Users'],
        description: 'List users with pagination',
        querystring: listUsersQuerySchema,
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user!;
      const result = await usersService.listUsers(tenantId, request.query);
      return reply.send(paginatedResponse(result.data, result.meta));
    }
  );

  /**
   * POST /users
   * Create a new user (super_owner or regional_manager only)
   */
  app.post(
    '/',
    {
      preHandler: [authenticate, requireRole(['super_owner', 'regional_manager'])],
      schema: {
        tags: ['Users'],
        description: 'Create a new user',
        body: createUserBodySchema,
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const user = await usersService.createUser(tenantId, request.body, userId);
      return reply.status(201).send(successResponse(user));
    }
  );

  /**
   * PATCH /users/me/password
   * Change own password (all authenticated users)
   * NOTE: This route must be defined BEFORE /:id to avoid conflict
   */
  app.patch(
    '/me/password',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        description: 'Change own password',
        body: changePasswordBodySchema,
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      await usersService.changePassword(tenantId, userId, request.body);
      return reply.send(successResponse({ message: 'Password changed successfully' }));
    }
  );

  /**
   * GET /users/:id
   * Get a single user by ID (super_owner or regional_manager only)
   */
  app.get(
    '/:id',
    {
      preHandler: [authenticate, requireRole(['super_owner', 'regional_manager'])],
      schema: {
        tags: ['Users'],
        description: 'Get a single user by ID',
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user!;
      const { id } = request.params as { id: string };
      const user = await usersService.getUserById(tenantId, id);
      return reply.send(successResponse(user));
    }
  );

  /**
   * PATCH /users/:id
   * Update a user (super_owner or regional_manager only)
   */
  app.patch(
    '/:id',
    {
      preHandler: [authenticate, requireRole(['super_owner', 'regional_manager'])],
      schema: {
        tags: ['Users'],
        description: 'Update a user',
        body: updateUserBodySchema,
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const { id } = request.params as { id: string };
      const user = await usersService.updateUser(tenantId, id, request.body, userId);
      return reply.send(successResponse(user));
    }
  );

  /**
   * DELETE /users/:id
   * Delete a user (super_owner or regional_manager only)
   */
  app.delete(
    '/:id',
    {
      preHandler: [authenticate, requireRole(['super_owner', 'regional_manager'])],
      schema: {
        tags: ['Users'],
        description: 'Delete a user',
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const { id } = request.params as { id: string };
      await usersService.deleteUser(tenantId, id, userId);
      return reply.send(deleteResponse('User deleted successfully'));
    }
  );
}
