/**
 * Goods Receipt Controller
 * Request handlers for goods receipt endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { goodsReceiptService } from './goods-receipt.service';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  buildPaginationMeta,
} from '@/lib/response';
import type { CreateGRNInput, UpdateGRNInput, GRNFilters } from './goods-receipt.schema';

// ============================================
// CRUD Operations
// ============================================

export async function createGoodsReceipt(
  request: FastifyRequest<{ Body: CreateGRNInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const data = request.body;

  const grn = await goodsReceiptService.create(tenantId, data, userId);

  return reply.status(201).send(successResponse(grn));
}

export async function updateGoodsReceipt(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateGRNInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;
  const data = request.body;

  const grn = await goodsReceiptService.update(tenantId, id, data, userId);

  return reply.send(successResponse(grn));
}

export async function getGoodsReceipt(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { id } = request.params;

  const grn = await goodsReceiptService.get(tenantId, id);

  if (!grn) {
    return reply.status(404).send(errorResponse('NOT_FOUND', 'Goods receipt not found'));
  }

  return reply.send(successResponse(grn));
}

export async function listGoodsReceipts(
  request: FastifyRequest<{ Querystring: GRNFilters & { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId, ...filters } = request.query;

  if (!branchId) {
    return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'branchId is required'));
  }

  const result = await goodsReceiptService.list(tenantId, branchId, filters);

  return reply.send(
    paginatedResponse(result.data, buildPaginationMeta(result.page, result.limit, result.total))
  );
}

export async function deleteGoodsReceipt(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { id } = request.params;

  await goodsReceiptService.delete(tenantId, id);

  return reply.status(204).send();
}

// ============================================
// Workflow Operations
// ============================================

export async function confirmGoodsReceipt(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;

  const grn = await goodsReceiptService.confirm(tenantId, id, userId);

  return reply.send(successResponse(grn));
}

export async function createGRNFromPO(
  request: FastifyRequest<{ Params: { poId: string }; Querystring: { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { poId } = request.params;
  const { branchId } = request.query;

  if (!branchId) {
    return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'branchId is required'));
  }

  const grn = await goodsReceiptService.createFromPO(tenantId, poId, branchId, userId);

  return reply.status(201).send(successResponse(grn));
}
