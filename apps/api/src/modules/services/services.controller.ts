/**
 * Services Controller
 * Request handlers for service management
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { servicesService } from './services.service';

import type {
  CatalogQuery,
  CreateServiceBody,
  ServiceQuery,
  UpdateServiceBody,
} from './services.schema';

export class ServicesController {
  /**
   * Get all services
   */
  async getServices(
    request: FastifyRequest<{ Querystring: ServiceQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const result = await servicesService.getServices(tenantId, request.query);

    return reply.send({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  }

  /**
   * Get a single service
   */
  async getServiceById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const service = await servicesService.getServiceById(
      tenantId,
      request.params.id
    );

    if (!service) {
      return reply.code(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Service not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: service,
    });
  }

  /**
   * Create a new service
   */
  async createService(
    request: FastifyRequest<{ Body: CreateServiceBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const service = await servicesService.createService(
        tenantId,
        request.body,
        sub
      );

      return reply.code(201).send({
        success: true,
        data: service,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create service';

      if (message.includes('already exists')) {
        return reply.code(409).send({
          success: false,
          error: {
            code: 'DUPLICATE',
            message,
          },
        });
      }

      if (message.includes('not found')) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_REFERENCE',
            message,
          },
        });
      }

      return reply.code(400).send({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message,
        },
      });
    }
  }

  /**
   * Update a service
   */
  async updateService(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateServiceBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const service = await servicesService.updateService(
        tenantId,
        request.params.id,
        request.body,
        sub
      );

      return reply.send({
        success: true,
        data: service,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update service';

      if (message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message,
          },
        });
      }

      if (message.includes('already exists')) {
        return reply.code(409).send({
          success: false,
          error: {
            code: 'DUPLICATE',
            message,
          },
        });
      }

      return reply.code(400).send({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message,
        },
      });
    }
  }

  /**
   * Delete a service
   */
  async deleteService(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      await servicesService.deleteService(tenantId, request.params.id);

      return reply.send({
        success: true,
        data: { message: 'Service deleted successfully' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete service';

      if (message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message,
          },
        });
      }

      return reply.code(400).send({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message,
        },
      });
    }
  }

  /**
   * Duplicate a service
   */
  async duplicateService(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const service = await servicesService.duplicateService(
        tenantId,
        request.params.id,
        sub
      );

      return reply.code(201).send({
        success: true,
        data: service,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate service';

      if (message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message,
          },
        });
      }

      return reply.code(400).send({
        success: false,
        error: {
          code: 'DUPLICATE_FAILED',
          message,
        },
      });
    }
  }

  /**
   * Get service catalog
   */
  async getServiceCatalog(
    request: FastifyRequest<{ Querystring: CatalogQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const catalog = await servicesService.getServiceCatalog(
      tenantId,
      request.query
    );

    return reply.send({
      success: true,
      data: catalog,
    });
  }
}

export const servicesController = new ServicesController();
