/**
 * Services Module Routes
 * All route definitions for the services module
 * Protected with authentication and role-based permission guards
 */

import type { FastifyInstance } from 'fastify';

import { PERMISSIONS } from '@salon-ops/shared';

import {
  authenticate,
  requirePermission,
  requireBranchAccess,
} from '../../middleware';
import { addOnsController } from './addons.controller';
import { branchPricingController } from './branch-pricing.controller';
import { categoriesController } from './categories.controller';
import { combosController } from './combos.controller';
import { priceEngine } from './price-engine';
import { servicesController } from './services.controller';
import { variantsController } from './variants.controller';

import {
  bulkUpdateBranchPricesBodySchema,
  calculatePriceBodySchema,
  catalogQuerySchema,
  categoryQuerySchema,
  createAddOnBodySchema,
  createCategoryBodySchema,
  createComboBodySchema,
  createServiceBodySchema,
  createVariantBodySchema,
  mapAddOnsToServiceBodySchema,
  reorderCategoriesBodySchema,
  serviceQuerySchema,
  updateAddOnBodySchema,
  updateBranchPriceBodySchema,
  updateCategoryBodySchema,
  updateComboBodySchema,
  updateServiceBodySchema,
  updateVariantBodySchema,
} from './services.schema';

import type {
  BulkUpdateBranchPricesBody,
  CalculatePriceBody,
  CatalogQuery,
  CategoryQuery,
  CreateAddOnBody,
  CreateCategoryBody,
  CreateComboBody,
  CreateServiceBody,
  CreateVariantBody,
  MapAddOnsToServiceBody,
  ReorderCategoriesBody,
  ServiceQuery,
  UpdateAddOnBody,
  UpdateBranchPriceBody,
  UpdateCategoryBody,
  UpdateComboBody,
  UpdateServiceBody,
  UpdateVariantBody,
} from './services.schema';

// Validation preHandler factory
function createValidationHandler<T>(schema: { safeParse: (data: unknown) => { success: boolean; error?: { errors: unknown[] } } }) {
  return async (request: { body: T }, reply: { code: (n: number) => { send: (d: unknown) => void } }) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: result.error?.errors,
        },
      });
    }
  };
}

// Query validation preHandler factory
function createQueryValidationHandler<T>(schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { errors: unknown[] } } }) {
  return async (request: { query: T }, reply: { code: (n: number) => { send: (d: unknown) => void } }) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: result.error?.errors,
        },
      });
    }
    request.query = result.data as T;
  };
}

export default async function servicesRoutes(fastify: FastifyInstance) {
  // ============================================
  // Categories Routes
  // ============================================

  // GET /service-categories - Read permission required
  fastify.get<{ Querystring: CategoryQuery }>(
    '/service-categories',
    {
      schema: {
        description: 'Get all service categories',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
        createQueryValidationHandler<CategoryQuery>(categoryQuerySchema),
      ],
    },
    categoriesController.getCategories.bind(categoriesController)
  );

  // POST /service-categories - Write permission required
  fastify.post<{ Body: CreateCategoryBody }>(
    '/service-categories',
    {
      schema: {
        description: 'Create a new service category',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<CreateCategoryBody>(createCategoryBodySchema),
      ],
    },
    categoriesController.createCategory.bind(categoriesController)
  );

  // GET /service-categories/:id - Read permission required
  fastify.get<{ Params: { id: string } }>(
    '/service-categories/:id',
    {
      schema: {
        description: 'Get a single service category',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
      ],
    },
    categoriesController.getCategoryById.bind(categoriesController)
  );

  // PATCH /service-categories/:id - Write permission required
  fastify.patch<{ Params: { id: string }; Body: UpdateCategoryBody }>(
    '/service-categories/:id',
    {
      schema: {
        description: 'Update a service category',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<UpdateCategoryBody>(updateCategoryBodySchema),
      ],
    },
    categoriesController.updateCategory.bind(categoriesController)
  );

  // DELETE /service-categories/:id - Write permission required
  fastify.delete<{ Params: { id: string } }>(
    '/service-categories/:id',
    {
      schema: {
        description: 'Delete a service category',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
      ],
    },
    categoriesController.deleteCategory.bind(categoriesController)
  );

  // PATCH /service-categories/reorder - Write permission required
  fastify.patch<{ Body: ReorderCategoriesBody }>(
    '/service-categories/reorder',
    {
      schema: {
        description: 'Reorder service categories',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<ReorderCategoriesBody>(reorderCategoriesBodySchema),
      ],
    },
    categoriesController.reorderCategories.bind(categoriesController)
  );

  // ============================================
  // Services Routes
  // ============================================

  // GET /services - Read permission required
  fastify.get<{ Querystring: ServiceQuery }>(
    '/services',
    {
      schema: {
        description: 'Get all services',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
        createQueryValidationHandler<ServiceQuery>(serviceQuerySchema),
      ],
    },
    servicesController.getServices.bind(servicesController)
  );

  // POST /services - Write permission required
  fastify.post<{ Body: CreateServiceBody }>(
    '/services',
    {
      schema: {
        description: 'Create a new service',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<CreateServiceBody>(createServiceBodySchema),
      ],
    },
    servicesController.createService.bind(servicesController)
  );

  // GET /services/catalog - Read permission required
  fastify.get<{ Querystring: CatalogQuery }>(
    '/services/catalog',
    {
      schema: {
        description: 'Get service catalog (hierarchical view)',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
        createQueryValidationHandler<CatalogQuery>(catalogQuerySchema),
      ],
    },
    servicesController.getServiceCatalog.bind(servicesController)
  );

  // POST /services/calculate-price - Read permission required (for billing/booking)
  fastify.post<{ Body: CalculatePriceBody }>(
    '/services/calculate-price',
    {
      schema: {
        description: 'Calculate price for services',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
        createValidationHandler<CalculatePriceBody>(calculatePriceBodySchema),
      ],
    },
    async (request, reply) => {
      try {
        const { tenantId } = request.user;

        const result = await priceEngine.calculatePrice(tenantId, request.body);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to calculate price';
        return reply.code(400).send({
          success: false,
          error: {
            code: 'CALCULATION_FAILED',
            message,
          },
        });
      }
    }
  );

  // GET /services/:id - Read permission required
  fastify.get<{ Params: { id: string } }>(
    '/services/:id',
    {
      schema: {
        description: 'Get a single service',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
      ],
    },
    servicesController.getServiceById.bind(servicesController)
  );

  // PATCH /services/:id - Write permission required
  fastify.patch<{ Params: { id: string }; Body: UpdateServiceBody }>(
    '/services/:id',
    {
      schema: {
        description: 'Update a service',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<UpdateServiceBody>(updateServiceBodySchema),
      ],
    },
    servicesController.updateService.bind(servicesController)
  );

  // DELETE /services/:id - Write permission required
  fastify.delete<{ Params: { id: string } }>(
    '/services/:id',
    {
      schema: {
        description: 'Delete a service',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
      ],
    },
    servicesController.deleteService.bind(servicesController)
  );

  // POST /services/:id/duplicate - Write permission required
  fastify.post<{ Params: { id: string } }>(
    '/services/:id/duplicate',
    {
      schema: {
        description: 'Duplicate a service',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
      ],
    },
    servicesController.duplicateService.bind(servicesController)
  );

  // ============================================
  // Variants Routes
  // ============================================

  // GET /services/:id/variants - Read permission required
  fastify.get<{ Params: { id: string } }>(
    '/services/:id/variants',
    {
      schema: {
        description: 'Get all variants for a service',
        tags: ['Service Variants'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
      ],
    },
    variantsController.getVariants.bind(variantsController)
  );

  // POST /services/:id/variants - Write permission required
  fastify.post<{ Params: { id: string }; Body: CreateVariantBody }>(
    '/services/:id/variants',
    {
      schema: {
        description: 'Create a new variant for a service',
        tags: ['Service Variants'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<CreateVariantBody>(createVariantBodySchema),
      ],
    },
    variantsController.createVariant.bind(variantsController)
  );

  // PATCH /services/:id/variants/:vid - Write permission required
  fastify.patch<{ Params: { id: string; vid: string }; Body: UpdateVariantBody }>(
    '/services/:id/variants/:vid',
    {
      schema: {
        description: 'Update a variant',
        tags: ['Service Variants'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<UpdateVariantBody>(updateVariantBodySchema),
      ],
    },
    variantsController.updateVariant.bind(variantsController)
  );

  // DELETE /services/:id/variants/:vid - Write permission required
  fastify.delete<{ Params: { id: string; vid: string } }>(
    '/services/:id/variants/:vid',
    {
      schema: {
        description: 'Delete a variant',
        tags: ['Service Variants'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
      ],
    },
    variantsController.deleteVariant.bind(variantsController)
  );

  // ============================================
  // Service Add-ons Routes (mapping to services)
  // ============================================

  // POST /services/:id/add-ons - Write permission required
  fastify.post<{ Params: { id: string }; Body: MapAddOnsToServiceBody }>(
    '/services/:id/add-ons',
    {
      schema: {
        description: 'Map add-ons to a service',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<MapAddOnsToServiceBody>(mapAddOnsToServiceBodySchema),
      ],
    },
    addOnsController.mapAddOnsToService.bind(addOnsController)
  );

  // ============================================
  // Branch Pricing Routes
  // ============================================

  // GET /branches/:id/service-prices - Read permission + Branch access required
  fastify.get<{ Params: { id: string } }>(
    '/branches/:id/service-prices',
    {
      schema: {
        description: 'Get all service prices for a branch',
        tags: ['Branch Pricing'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
        requireBranchAccess('id'),
      ],
    },
    branchPricingController.getBranchServicePrices.bind(branchPricingController)
  );

  // PATCH /branches/:id/service-prices - Write permission + Branch access required
  fastify.patch<{ Params: { id: string }; Body: BulkUpdateBranchPricesBody }>(
    '/branches/:id/service-prices',
    {
      schema: {
        description: 'Bulk update service prices for a branch',
        tags: ['Branch Pricing'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        requireBranchAccess('id'),
        createValidationHandler<BulkUpdateBranchPricesBody>(bulkUpdateBranchPricesBodySchema),
      ],
    },
    branchPricingController.bulkUpdateBranchServicePrices.bind(branchPricingController)
  );

  // PATCH /branches/:id/services/:sid/price - Write permission + Branch access required
  fastify.patch<{ Params: { id: string; sid: string }; Body: UpdateBranchPriceBody }>(
    '/branches/:id/services/:sid/price',
    {
      schema: {
        description: 'Update a single service price for a branch',
        tags: ['Branch Pricing'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        requireBranchAccess('id'),
        createValidationHandler<UpdateBranchPriceBody>(updateBranchPriceBodySchema),
      ],
    },
    branchPricingController.updateBranchServicePrice.bind(branchPricingController)
  );

  // ============================================
  // Add-ons Routes (CRUD)
  // ============================================

  // GET /service-add-ons - Read permission required
  fastify.get<{ Querystring: { includeInactive?: boolean } }>(
    '/service-add-ons',
    {
      schema: {
        description: 'Get all service add-ons',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
      ],
    },
    addOnsController.getAddOns.bind(addOnsController)
  );

  // POST /service-add-ons - Write permission required
  fastify.post<{ Body: CreateAddOnBody }>(
    '/service-add-ons',
    {
      schema: {
        description: 'Create a new service add-on',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<CreateAddOnBody>(createAddOnBodySchema),
      ],
    },
    addOnsController.createAddOn.bind(addOnsController)
  );

  // PATCH /service-add-ons/:id - Write permission required
  fastify.patch<{ Params: { id: string }; Body: UpdateAddOnBody }>(
    '/service-add-ons/:id',
    {
      schema: {
        description: 'Update a service add-on',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<UpdateAddOnBody>(updateAddOnBodySchema),
      ],
    },
    addOnsController.updateAddOn.bind(addOnsController)
  );

  // DELETE /service-add-ons/:id - Write permission required
  fastify.delete<{ Params: { id: string } }>(
    '/service-add-ons/:id',
    {
      schema: {
        description: 'Delete a service add-on',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
      ],
    },
    addOnsController.deleteAddOn.bind(addOnsController)
  );

  // ============================================
  // Combo Services Routes
  // ============================================

  // GET /combo-services - Read permission required
  fastify.get<{ Querystring: { includeInactive?: boolean } }>(
    '/combo-services',
    {
      schema: {
        description: 'Get all combo services',
        tags: ['Combo Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
      ],
    },
    combosController.getCombos.bind(combosController)
  );

  // POST /combo-services - Write permission required
  fastify.post<{ Body: CreateComboBody }>(
    '/combo-services',
    {
      schema: {
        description: 'Create a new combo service',
        tags: ['Combo Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<CreateComboBody>(createComboBodySchema),
      ],
    },
    combosController.createCombo.bind(combosController)
  );

  // GET /combo-services/:id - Read permission required
  fastify.get<{ Params: { id: string } }>(
    '/combo-services/:id',
    {
      schema: {
        description: 'Get a single combo service',
        tags: ['Combo Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
      ],
    },
    combosController.getComboById.bind(combosController)
  );

  // PATCH /combo-services/:id - Write permission required
  fastify.patch<{ Params: { id: string }; Body: UpdateComboBody }>(
    '/combo-services/:id',
    {
      schema: {
        description: 'Update a combo service',
        tags: ['Combo Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        createValidationHandler<UpdateComboBody>(updateComboBodySchema),
      ],
    },
    combosController.updateCombo.bind(combosController)
  );

  // DELETE /combo-services/:id - Write permission required
  fastify.delete<{ Params: { id: string } }>(
    '/combo-services/:id',
    {
      schema: {
        description: 'Delete a combo service',
        tags: ['Combo Services'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
      ],
    },
    combosController.deleteCombo.bind(combosController)
  );
}
