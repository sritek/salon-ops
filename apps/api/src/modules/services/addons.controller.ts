/**
 * Add-Ons Controller
 * Request handlers for service add-on management
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { addOnsService } from './addons.service';
import { successResponse, deleteResponse, errorResponse } from '@/lib/response';

import type { CreateAddOnBody, MapAddOnsToServiceBody, UpdateAddOnBody } from './services.schema';

export class AddOnsController {
  /**
   * Get all add-ons
   */
  async getAddOns(
    request: FastifyRequest<{ Querystring: { includeInactive?: boolean } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const addOns = await addOnsService.getAddOns(tenantId, request.query.includeInactive);

    return reply.send(successResponse(addOns));
  }

  /**
   * Create a new add-on
   */
  async createAddOn(request: FastifyRequest<{ Body: CreateAddOnBody }>, reply: FastifyReply) {
    try {
      const { tenantId } = request.user;

      const addOn = await addOnsService.createAddOn(tenantId, request.body);

      return reply.code(201).send(successResponse(addOn));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create add-on';

      if (message.includes('not found')) {
        return reply.code(400).send(errorResponse('INVALID_REFERENCE', message));
      }

      return reply.code(400).send(errorResponse('CREATE_FAILED', message));
    }
  }

  /**
   * Update an add-on
   */
  async updateAddOn(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateAddOnBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      const addOn = await addOnsService.updateAddOn(tenantId, request.params.id, request.body);

      return reply.send(successResponse(addOn));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update add-on';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }

  /**
   * Delete an add-on
   */
  async deleteAddOn(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { tenantId } = request.user;

      await addOnsService.deleteAddOn(tenantId, request.params.id);

      return reply.send(deleteResponse('Add-on deleted successfully'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete add-on';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('DELETE_FAILED', message));
    }
  }

  /**
   * Map add-ons to a service
   */
  async mapAddOnsToService(
    request: FastifyRequest<{
      Params: { id: string };
      Body: MapAddOnsToServiceBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      const result = await addOnsService.mapAddOnsToService(
        tenantId,
        request.params.id,
        request.body
      );

      return reply.send(successResponse(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to map add-ons';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('MAP_FAILED', message));
    }
  }
}

export const addOnsController = new AddOnsController();
