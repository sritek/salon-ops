/**
 * Product Controller
 * Request handlers for product catalog management
 * Requirements: 1.1-1.7, 2.1-2.10, 3.1-3.6
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  successResponse,
  paginatedResponse,
  deleteResponse,
  errorResponse,
  buildPaginationMeta,
} from '../../lib/response';
import { productService } from './product.service';

import type {
  CategoryQuery,
  CreateCategoryBody,
  UpdateCategoryBody,
  ProductQuery,
  CreateProductBody,
  UpdateProductBody,
  UpdateBranchSettingsBody,
  BulkUpdateBranchSettingsBody,
} from './product.schema';

export class ProductController {
  // ============================================
  // Category Handlers
  // ============================================

  /**
   * Get all product categories
   */
  async getCategories(
    request: FastifyRequest<{ Querystring: CategoryQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const categories = await productService.listCategories(tenantId, request.query);

    return reply.send(successResponse(categories));
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const category = await productService.getCategoryById(tenantId, request.params.id);

    if (!category) {
      return reply.code(404).send(errorResponse('CATEGORY_NOT_FOUND', 'Category not found'));
    }

    return reply.send(successResponse(category));
  }

  /**
   * Create a new product category
   */
  async createCategory(request: FastifyRequest<{ Body: CreateCategoryBody }>, reply: FastifyReply) {
    try {
      const { tenantId, sub } = request.user;

      const category = await productService.createCategory(tenantId, request.body, sub);

      return reply.code(201).send(successResponse(category));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category';

      if (message.includes('already exists')) {
        return reply.code(409).send(errorResponse('DUPLICATE', message));
      }

      if (message.includes('not found')) {
        return reply.code(400).send(errorResponse('INVALID_REFERENCE', message));
      }

      if (message.includes('maximum hierarchy depth')) {
        return reply.code(400).send(errorResponse('CATEGORY_HIERARCHY_EXCEEDED', message));
      }

      return reply.code(400).send(errorResponse('CREATE_FAILED', message));
    }
  }

  /**
   * Update a product category
   */
  async updateCategory(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCategoryBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const category = await productService.updateCategory(
        tenantId,
        request.params.id,
        request.body,
        sub
      );

      return reply.send(successResponse(category));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('CATEGORY_NOT_FOUND', message));
      }

      if (message.includes('already exists')) {
        return reply.code(409).send(errorResponse('DUPLICATE', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }

  /**
   * Delete a product category
   */
  async deleteCategory(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { tenantId } = request.user;

      await productService.deleteCategory(tenantId, request.params.id);

      return reply.send(deleteResponse('Category deleted successfully'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('CATEGORY_NOT_FOUND', message));
      }

      if (message.includes('with products') || message.includes('with sub-categories')) {
        return reply.code(400).send(errorResponse('CATEGORY_HAS_DEPENDENCIES', message));
      }

      return reply.code(400).send(errorResponse('DELETE_FAILED', message));
    }
  }

  // ============================================
  // Product Handlers
  // ============================================

  /**
   * Get all products
   */
  async getProducts(request: FastifyRequest<{ Querystring: ProductQuery }>, reply: FastifyReply) {
    const { tenantId } = request.user;
    const { branchId, ...filters } = request.query;

    const result = await productService.listProducts(tenantId, filters, branchId);

    return reply.send(
      paginatedResponse(result.data, buildPaginationMeta(result.page, result.limit, result.total))
    );
  }

  /**
   * Get a single product by ID
   */
  async getProductById(
    request: FastifyRequest<{ Params: { id: string }; Querystring: { branchId?: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;
    const { branchId } = request.query;

    const product = await productService.getProduct(tenantId, request.params.id, branchId);

    if (!product) {
      return reply.code(404).send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found'));
    }

    return reply.send(successResponse(product));
  }

  /**
   * Create a new product
   */
  async createProduct(request: FastifyRequest<{ Body: CreateProductBody }>, reply: FastifyReply) {
    try {
      const { tenantId, sub } = request.user;

      const product = await productService.createProduct(tenantId, request.body, sub);

      return reply.code(201).send(successResponse(product));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product';

      if (message.includes('SKU already exists')) {
        return reply.code(409).send(errorResponse('DUPLICATE_SKU', message));
      }

      if (message.includes('barcode already exists')) {
        return reply.code(409).send(errorResponse('DUPLICATE_BARCODE', message));
      }

      if (message.includes('Category not found')) {
        return reply.code(400).send(errorResponse('CATEGORY_NOT_FOUND', message));
      }

      if (message.includes('inactive category')) {
        return reply.code(400).send(errorResponse('CATEGORY_INACTIVE', message));
      }

      if (message.includes('required')) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', message));
      }

      return reply.code(400).send(errorResponse('CREATE_FAILED', message));
    }
  }

  /**
   * Update a product
   */
  async updateProduct(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateProductBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const product = await productService.updateProduct(
        tenantId,
        request.params.id,
        request.body,
        sub
      );

      return reply.send(successResponse(product));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update product';

      if (message.includes('Product not found')) {
        return reply.code(404).send(errorResponse('PRODUCT_NOT_FOUND', message));
      }

      if (message.includes('SKU already exists')) {
        return reply.code(409).send(errorResponse('DUPLICATE_SKU', message));
      }

      if (message.includes('barcode already exists')) {
        return reply.code(409).send(errorResponse('DUPLICATE_BARCODE', message));
      }

      if (message.includes('Category not found')) {
        return reply.code(400).send(errorResponse('CATEGORY_NOT_FOUND', message));
      }

      if (message.includes('inactive category')) {
        return reply.code(400).send(errorResponse('CATEGORY_INACTIVE', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { tenantId } = request.user;

      await productService.deleteProduct(tenantId, request.params.id);

      return reply.send(deleteResponse('Product deleted successfully'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('PRODUCT_NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('DELETE_FAILED', message));
    }
  }

  // ============================================
  // Branch Product Settings Handlers
  // ============================================

  /**
   * Get branch-specific settings for a product
   */
  async getBranchSettings(
    request: FastifyRequest<{ Params: { id: string; branchId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;
      const { id: productId, branchId } = request.params;

      const settings = await productService.getBranchSettings(tenantId, branchId, productId);

      // If no settings exist, return default values
      if (!settings) {
        return reply.send(
          successResponse({
            productId,
            branchId,
            isEnabled: true,
            reorderLevel: null,
            sellingPriceOverride: null,
          })
        );
      }

      return reply.send(successResponse(settings));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get branch settings';

      if (message.includes('Product not found')) {
        return reply.code(404).send(errorResponse('PRODUCT_NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('GET_SETTINGS_FAILED', message));
    }
  }

  /**
   * Update branch-specific settings for a product
   */
  async updateBranchSettings(
    request: FastifyRequest<{
      Params: { id: string; branchId: string };
      Body: UpdateBranchSettingsBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;
      const { id: productId, branchId } = request.params;

      const settings = await productService.updateBranchSettings(
        tenantId,
        branchId,
        productId,
        request.body
      );

      return reply.send(successResponse(settings));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update branch settings';

      if (message.includes('Product not found')) {
        return reply.code(404).send(errorResponse('PRODUCT_NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_SETTINGS_FAILED', message));
    }
  }

  /**
   * Bulk update branch settings for multiple products
   */
  async bulkUpdateBranchSettings(
    request: FastifyRequest<{
      Params: { branchId: string };
      Body: BulkUpdateBranchSettingsBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;
      const { branchId } = request.params;

      const results = await productService.bulkUpdateBranchSettings(
        tenantId,
        branchId,
        request.body.updates
      );

      return reply.send(successResponse(results));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk update settings';

      return reply.code(400).send(errorResponse('BULK_UPDATE_FAILED', message));
    }
  }
}

export const productController = new ProductController();
