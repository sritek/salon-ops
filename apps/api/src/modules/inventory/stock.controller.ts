/**
 * Stock Controller
 * Request handlers for stock management endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { stockService } from './stock.service';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  buildPaginationMeta,
} from '../../lib/response';
import type {
  StockFilters,
  MovementFilters,
  ConsumeStockInput,
  AdjustStockInput,
} from './stock.schema';

// ============================================
// Stock Summary
// ============================================

export async function getStockSummary(
  request: FastifyRequest<{ Params: { branchId: string }; Querystring: StockFilters }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId } = request.params;
  const filters = request.query;

  const result = await stockService.getStockSummary(tenantId, branchId, filters);
  const meta = buildPaginationMeta(result.page, result.limit, result.total);

  return reply.send(paginatedResponse(result.data, meta));
}

export async function getProductStock(
  request: FastifyRequest<{ Params: { branchId: string; productId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId, productId } = request.params;

  const stock = await stockService.getProductStock(tenantId, branchId, productId);

  if (!stock) {
    return reply.status(404).send(errorResponse('NOT_FOUND', 'Product not found'));
  }

  return reply.send(successResponse(stock));
}

// ============================================
// Batches
// ============================================

export async function getProductBatches(
  request: FastifyRequest<{ Params: { branchId: string; productId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId, productId } = request.params;

  const batches = await stockService.getBatches(tenantId, branchId, productId);

  return reply.send(successResponse(batches));
}

export async function getAvailableBatches(
  request: FastifyRequest<{ Params: { branchId: string; productId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId, productId } = request.params;

  const batches = await stockService.getAvailableBatches(tenantId, branchId, productId);

  return reply.send(successResponse(batches));
}

// ============================================
// Movements
// ============================================

export async function getStockMovements(
  request: FastifyRequest<{ Params: { branchId: string }; Querystring: MovementFilters }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId } = request.params;
  const filters = request.query;

  const result = await stockService.getMovements(tenantId, branchId, filters);
  const meta = buildPaginationMeta(result.page, result.limit, result.total);

  return reply.send(paginatedResponse(result.data, meta));
}

// ============================================
// Consumption
// ============================================

export async function consumeStock(
  request: FastifyRequest<{ Params: { branchId: string }; Body: ConsumeStockInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { branchId } = request.params;
  const { productId, quantity, reason, description } = request.body;

  const result = await stockService.consumeStock(
    tenantId,
    branchId,
    productId,
    quantity,
    reason,
    description,
    userId
  );

  return reply.send(
    successResponse({
      success: result.success,
      totalConsumed: result.totalConsumed,
      shortfall: result.shortfall,
      consumedBatches: result.consumedBatches,
    })
  );
}

// ============================================
// Adjustments
// ============================================

export async function adjustStock(
  request: FastifyRequest<{ Params: { branchId: string }; Body: AdjustStockInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { branchId } = request.params;
  const { productId, adjustmentType, quantity, reason } = request.body;

  const movement = await stockService.adjustStock(
    tenantId,
    branchId,
    productId,
    adjustmentType,
    quantity,
    reason,
    userId
  );

  return reply.send(successResponse(movement));
}

// ============================================
// Alerts
// ============================================

export async function getLowStockAlerts(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId } = request.params;

  const alerts = await stockService.getLowStockAlerts(tenantId, branchId);

  return reply.send(successResponse(alerts));
}

export async function getNearExpiryAlerts(
  request: FastifyRequest<{ Params: { branchId: string }; Querystring: { days?: number } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId } = request.params;
  const { days } = request.query;

  const alerts = await stockService.getNearExpiryAlerts(tenantId, branchId, days ?? 30);

  return reply.send(successResponse(alerts));
}

export async function getExpiredStock(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId } = request.params;

  const expired = await stockService.getExpiredStock(tenantId, branchId);

  return reply.send(successResponse(expired));
}

// ============================================
// Availability Check
// ============================================

export async function checkStockAvailability(
  request: FastifyRequest<{
    Params: { branchId: string; productId: string };
    Querystring: { quantity: number };
  }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId, productId } = request.params;
  const { quantity } = request.query;

  const available = await stockService.checkStockAvailability(
    tenantId,
    branchId,
    productId,
    quantity
  );

  // Get current stock for response
  const stock = await stockService.getProductStock(tenantId, branchId, productId);
  const currentStock = stock?.availableQuantity ?? 0;

  return reply.send(
    successResponse({
      available,
      currentStock,
      shortfall: available ? 0 : quantity - currentStock,
    })
  );
}
