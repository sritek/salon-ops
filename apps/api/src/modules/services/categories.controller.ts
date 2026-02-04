/**
 * Categories Controller
 * Request handlers for service categories
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { categoriesService } from './categories.service';

import type {
  CategoryQuery,
  CreateCategoryBody,
  ReorderCategoriesBody,
  UpdateCategoryBody,
} from './services.schema';

export class CategoriesController {
  /**
   * Get all categories
   */
  async getCategories(
    request: FastifyRequest<{ Querystring: CategoryQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const categories = await categoriesService.getCategories(
      tenantId,
      request.query
    );

    return reply.send({
      success: true,
      data: categories,
    });
  }

  /**
   * Get a single category
   */
  async getCategoryById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const category = await categoriesService.getCategoryById(
      tenantId,
      request.params.id
    );

    if (!category) {
      return reply.code(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: category,
    });
  }

  /**
   * Create a new category
   */
  async createCategory(
    request: FastifyRequest<{ Body: CreateCategoryBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const category = await categoriesService.createCategory(
        tenantId,
        request.body,
        sub
      );

      return reply.code(201).send({
        success: true,
        data: category,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category';

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
          code: 'CREATE_FAILED',
          message,
        },
      });
    }
  }

  /**
   * Update a category
   */
  async updateCategory(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCategoryBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      const category = await categoriesService.updateCategory(
        tenantId,
        request.params.id,
        request.body
      );

      return reply.send({
        success: true,
        data: category,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category';

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
   * Delete a category
   */
  async deleteCategory(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      await categoriesService.deleteCategory(tenantId, request.params.id);

      return reply.send({
        success: true,
        data: { message: 'Category deleted successfully' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category';

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
   * Reorder categories
   */
  async reorderCategories(
    request: FastifyRequest<{ Body: ReorderCategoriesBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      await categoriesService.reorderCategories(tenantId, request.body);

      return reply.send({
        success: true,
        data: { message: 'Categories reordered successfully' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder categories';

      return reply.code(400).send({
        success: false,
        error: {
          code: 'REORDER_FAILED',
          message,
        },
      });
    }
  }
}

export const categoriesController = new CategoriesController();
