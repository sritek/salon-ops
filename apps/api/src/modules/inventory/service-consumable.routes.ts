/**
 * Service Consumable Routes
 * API endpoints for service-product mapping management
 */

import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware';
import {
  createMappingSchema,
  updateMappingSchema,
  mappingResponseSchema,
  mappingListResponseSchema,
} from './service-consumable.schema';
import {
  createMapping,
  updateMapping,
  deleteMapping,
  getMapping,
  getMappingsForService,
  getMappingsForProduct,
} from './service-consumable.controller';
import { z } from 'zod';

export default async function serviceConsumableRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // Service Consumable Mappings
  // ============================================

  // Create mapping
  fastify.post(
    '/inventory/service-consumables',
    {
      schema: {
        tags: ['Inventory - Service Consumables'],
        summary: 'Create mapping',
        description: 'Create a new service-product consumable mapping',
        body: createMappingSchema,
        response: {
          201: mappingResponseSchema,
        },
      },
    },
    createMapping
  );

  // Get mapping by ID
  fastify.get(
    '/inventory/service-consumables/:id',
    {
      schema: {
        tags: ['Inventory - Service Consumables'],
        summary: 'Get mapping',
        description: 'Get a single mapping by ID',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: mappingResponseSchema,
        },
      },
    },
    getMapping
  );

  // Update mapping
  fastify.patch(
    '/inventory/service-consumables/:id',
    {
      schema: {
        tags: ['Inventory - Service Consumables'],
        summary: 'Update mapping',
        description: 'Update a service-product mapping',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updateMappingSchema,
        response: {
          200: mappingResponseSchema,
        },
      },
    },
    updateMapping
  );

  // Delete mapping
  fastify.delete(
    '/inventory/service-consumables/:id',
    {
      schema: {
        tags: ['Inventory - Service Consumables'],
        summary: 'Delete mapping',
        description: 'Delete a service-product mapping',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          204: z.null(),
        },
      },
    },
    deleteMapping
  );

  // Get mappings for a service
  fastify.get(
    '/services/:serviceId/consumables',
    {
      schema: {
        tags: ['Inventory - Service Consumables'],
        summary: 'Get service consumables',
        description: 'Get all consumable product mappings for a service',
        params: z.object({
          serviceId: z.string().uuid(),
        }),
        response: {
          200: mappingListResponseSchema,
        },
      },
    },
    getMappingsForService
  );

  // Get mappings for a product
  fastify.get(
    '/inventory/products/:productId/services',
    {
      schema: {
        tags: ['Inventory - Service Consumables'],
        summary: 'Get product services',
        description: 'Get all services that use a product as consumable',
        params: z.object({
          productId: z.string().uuid(),
        }),
        response: {
          200: mappingListResponseSchema,
        },
      },
    },
    getMappingsForProduct
  );
}
