/**
 * Purchase Order Controller
 * Request handlers for purchase order endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { purchaseOrderService } from './purchase-order.service';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  buildPaginationMeta,
} from '@/lib/response';
import type {
  CreatePOInput,
  UpdatePOInput,
  CancelPOInput,
  POFilters,
} from './purchase-order.schema';

// ============================================
// CRUD Operations
// ============================================

export async function createPurchaseOrder(
  request: FastifyRequest<{ Body: CreatePOInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const data = request.body;

  const po = await purchaseOrderService.create(tenantId, data, userId);

  return reply.status(201).send(successResponse(po));
}

export async function updatePurchaseOrder(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdatePOInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;
  const data = request.body;

  const po = await purchaseOrderService.update(tenantId, id, data, userId);

  return reply.send(successResponse(po));
}

export async function getPurchaseOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { id } = request.params;

  const po = await purchaseOrderService.get(tenantId, id);

  if (!po) {
    return reply.status(404).send(errorResponse('NOT_FOUND', 'Purchase order not found'));
  }

  return reply.send(successResponse(po));
}

export async function listPurchaseOrders(
  request: FastifyRequest<{ Querystring: POFilters & { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId, ...filters } = request.query;

  if (!branchId) {
    return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'branchId is required'));
  }

  const result = await purchaseOrderService.list(tenantId, branchId, filters);

  return reply.send(
    paginatedResponse(result.data, buildPaginationMeta(result.page, result.limit, result.total))
  );
}

export async function deletePurchaseOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { id } = request.params;

  await purchaseOrderService.delete(tenantId, id);

  return reply.status(204).send();
}

// ============================================
// Workflow Operations
// ============================================

export async function sendPurchaseOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;

  const po = await purchaseOrderService.send(tenantId, id, userId);

  return reply.send(successResponse(po));
}

export async function cancelPurchaseOrder(
  request: FastifyRequest<{ Params: { id: string }; Body: CancelPOInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;
  const { reason } = request.body;

  const po = await purchaseOrderService.cancel(tenantId, id, reason, userId);

  return reply.send(successResponse(po));
}

// ============================================
// Reorder Suggestions
// ============================================

export async function getReorderSuggestions(
  request: FastifyRequest<{ Querystring: { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId } = request.query;

  if (!branchId) {
    return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'branchId is required'));
  }

  const suggestions = await purchaseOrderService.getReorderSuggestions(tenantId, branchId);

  return reply.send(successResponse(suggestions));
}
