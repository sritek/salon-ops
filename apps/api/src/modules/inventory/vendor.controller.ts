/**
 * Vendor Controller
 * Request handlers for vendor management
 * Requirements: 4.1-4.5, 5.1-5.5
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
import { vendorService } from './vendor.service';

import type {
  VendorQuery,
  CreateVendorBody,
  UpdateVendorBody,
  CreateVendorProductBody,
  UpdateVendorProductBody,
} from './vendor.schema';

export class VendorController {
  // ============================================
  // Vendor Handlers
  // ============================================

  /**
   * Get all vendors
   */
  async getVendors(request: FastifyRequest<{ Querystring: VendorQuery }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const result = await vendorService.listVendors(tenantId, request.query);

    return reply.send(
      paginatedResponse(result.data, buildPaginationMeta(result.page, result.limit, result.total))
    );
  }

  /**
   * Get a single vendor by ID
   */
  async getVendorById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const vendor = await vendorService.getVendor(tenantId, request.params.id);

    if (!vendor) {
      return reply.code(404).send(errorResponse('VENDOR_NOT_FOUND', 'Vendor not found'));
    }

    return reply.send(successResponse(vendor));
  }

  /**
   * Create a new vendor
   */
  async createVendor(request: FastifyRequest<{ Body: CreateVendorBody }>, reply: FastifyReply) {
    try {
      const { tenantId, sub } = request.user;

      const vendor = await vendorService.createVendor(tenantId, request.body, sub);

      return reply.code(201).send(successResponse(vendor));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create vendor';

      if (message.includes('required')) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', message));
      }

      return reply.code(400).send(errorResponse('CREATE_FAILED', message));
    }
  }

  /**
   * Update a vendor
   */
  async updateVendor(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateVendorBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const vendor = await vendorService.updateVendor(
        tenantId,
        request.params.id,
        request.body,
        sub
      );

      return reply.send(successResponse(vendor));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update vendor';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('VENDOR_NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }

  /**
   * Delete a vendor
   */
  async deleteVendor(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { tenantId } = request.user;

      await vendorService.deleteVendor(tenantId, request.params.id);

      return reply.send(deleteResponse('Vendor deleted successfully'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete vendor';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('VENDOR_NOT_FOUND', message));
      }

      if (message.includes('active purchase orders')) {
        return reply.code(400).send(errorResponse('VENDOR_HAS_ACTIVE_POS', message));
      }

      return reply.code(400).send(errorResponse('DELETE_FAILED', message));
    }
  }

  // ============================================
  // Vendor-Product Mapping Handlers
  // ============================================

  /**
   * Get all products for a vendor
   */
  async getVendorProducts(
    request: FastifyRequest<{ Params: { vendorId: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    // Verify vendor exists
    const vendor = await vendorService.getVendor(tenantId, request.params.vendorId);
    if (!vendor) {
      return reply.code(404).send(errorResponse('VENDOR_NOT_FOUND', 'Vendor not found'));
    }

    const products = await vendorService.getProductsForVendor(tenantId, request.params.vendorId);

    return reply.send(successResponse(products));
  }

  /**
   * Get all vendors for a product
   */
  async getProductVendors(
    request: FastifyRequest<{ Params: { productId: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const vendors = await vendorService.getVendorsForProduct(tenantId, request.params.productId);

    return reply.send(successResponse(vendors));
  }

  /**
   * Map a product to a vendor
   */
  async createVendorProduct(
    request: FastifyRequest<{ Body: CreateVendorProductBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      const mapping = await vendorService.mapProductToVendor(tenantId, request.body);

      return reply.code(201).send(successResponse(mapping));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create mapping';

      if (message.includes('Vendor not found')) {
        return reply.code(404).send(errorResponse('VENDOR_NOT_FOUND', message));
      }

      if (message.includes('Product not found')) {
        return reply.code(404).send(errorResponse('PRODUCT_NOT_FOUND', message));
      }

      if (message.includes('already mapped')) {
        return reply.code(409).send(errorResponse('DUPLICATE_MAPPING', message));
      }

      return reply.code(400).send(errorResponse('CREATE_FAILED', message));
    }
  }

  /**
   * Update a vendor-product mapping
   */
  async updateVendorProduct(
    request: FastifyRequest<{ Params: { mappingId: string }; Body: UpdateVendorProductBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      const mapping = await vendorService.updateVendorProduct(
        tenantId,
        request.params.mappingId,
        request.body
      );

      return reply.send(successResponse(mapping));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update mapping';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('MAPPING_NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }

  /**
   * Delete a vendor-product mapping
   */
  async deleteVendorProduct(
    request: FastifyRequest<{ Params: { mappingId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      await vendorService.deleteVendorProduct(tenantId, request.params.mappingId);

      return reply.send(deleteResponse('Vendor-product mapping deleted successfully'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete mapping';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('MAPPING_NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('DELETE_FAILED', message));
    }
  }
}

export const vendorController = new VendorController();
