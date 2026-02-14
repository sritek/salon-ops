/**
 * Variants Controller
 * Request handlers for service variant management
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { variantsService } from './variants.service';
import { successResponse, deleteResponse, errorResponse } from '@/lib/response';

import type { CreateVariantBody, UpdateVariantBody } from './services.schema';

export class VariantsController {
  /**
   * Get all variants for a service
   */
  async getVariants(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { tenantId } = request.user;

      const variants = await variantsService.getVariants(tenantId, request.params.id);

      return reply.send(successResponse(variants));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get variants';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('FETCH_FAILED', message));
    }
  }

  /**
   * Create a new variant
   */
  async createVariant(
    request: FastifyRequest<{
      Params: { id: string };
      Body: CreateVariantBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      const variant = await variantsService.createVariant(
        tenantId,
        request.params.id,
        request.body
      );

      return reply.code(201).send(successResponse(variant));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create variant';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('CREATE_FAILED', message));
    }
  }

  /**
   * Update a variant
   */
  async updateVariant(
    request: FastifyRequest<{
      Params: { id: string; vid: string };
      Body: UpdateVariantBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      const variant = await variantsService.updateVariant(
        tenantId,
        request.params.id,
        request.params.vid,
        request.body
      );

      return reply.send(successResponse(variant));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update variant';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }

  /**
   * Delete a variant
   */
  async deleteVariant(
    request: FastifyRequest<{ Params: { id: string; vid: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      await variantsService.deleteVariant(tenantId, request.params.id, request.params.vid);

      return reply.send(deleteResponse('Variant deleted successfully'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete variant';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('DELETE_FAILED', message));
    }
  }
}

export const variantsController = new VariantsController();
