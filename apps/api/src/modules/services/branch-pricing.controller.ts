/**
 * Branch Pricing Controller
 * Request handlers for branch-specific service pricing
 *
 * Note: Authentication, authorization, and branch access are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { branchPricingService } from './branch-pricing.service';
import { successResponse, errorResponse } from '@/lib/response';

import type { BulkUpdateBranchPricesBody, UpdateBranchPriceBody } from './services.schema';

export class BranchPricingController {
  /**
   * Get all service prices for a branch
   */
  async getBranchServicePrices(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      const prices = await branchPricingService.getBranchServicePrices(tenantId, request.params.id);

      return reply.send(successResponse(prices));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get prices';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('FETCH_FAILED', message));
    }
  }

  /**
   * Bulk update service prices for a branch
   */
  async bulkUpdateBranchServicePrices(
    request: FastifyRequest<{
      Params: { id: string };
      Body: BulkUpdateBranchPricesBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const result = await branchPricingService.bulkUpdateBranchServicePrices(
        tenantId,
        request.params.id,
        request.body,
        sub
      );

      return reply.send(successResponse(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update prices';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }

  /**
   * Update a single service price for a branch
   */
  async updateBranchServicePrice(
    request: FastifyRequest<{
      Params: { id: string; sid: string };
      Body: UpdateBranchPriceBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const branchPrice = await branchPricingService.updateBranchServicePrice(
        tenantId,
        request.params.id,
        request.params.sid,
        request.body,
        sub
      );

      return reply.send(successResponse(branchPrice));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update price';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }
}

export const branchPricingController = new BranchPricingController();
