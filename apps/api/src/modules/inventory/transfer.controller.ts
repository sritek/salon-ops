/**
 * Transfer Controller
 * Request handlers for stock transfer endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { transferService } from './transfer.service';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  buildPaginationMeta,
} from '../../lib/response';
import type {
  CreateTransferInput,
  DispatchTransferInput,
  ReceiveTransferInput,
  RejectTransferInput,
  CancelTransferInput,
  TransferFilters,
  TransferDirection,
} from './transfer.schema';

// ============================================
// CRUD Operations
// ============================================

export async function createTransfer(
  request: FastifyRequest<{ Body: CreateTransferInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const data = request.body;

  const transfer = await transferService.create(tenantId, data, userId);

  return reply.status(201).send(successResponse(transfer));
}

export async function getTransfer(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { id } = request.params;

  const transfer = await transferService.get(tenantId, id);

  if (!transfer) {
    return reply.status(404).send(errorResponse('NOT_FOUND', 'Transfer not found'));
  }

  return reply.send(successResponse(transfer));
}

export async function listTransfers(
  request: FastifyRequest<{
    Querystring: TransferFilters & { branchId: string; direction?: TransferDirection };
  }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId, direction, ...filters } = request.query;

  if (!branchId) {
    return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'branchId is required'));
  }

  const result = await transferService.list(tenantId, branchId, direction || 'all', filters);
  const meta = buildPaginationMeta(result.page, result.limit, result.total);

  return reply.send(paginatedResponse(result.data, meta));
}

// ============================================
// Workflow Operations
// ============================================

export async function approveTransfer(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;

  const transfer = await transferService.approve(tenantId, id, userId);

  return reply.send(successResponse(transfer));
}

export async function rejectTransfer(
  request: FastifyRequest<{ Params: { id: string }; Body: RejectTransferInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;
  const { reason } = request.body;

  const transfer = await transferService.reject(tenantId, id, reason, userId);

  return reply.send(successResponse(transfer));
}

export async function dispatchTransfer(
  request: FastifyRequest<{ Params: { id: string }; Body: DispatchTransferInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;
  const { items } = request.body;

  const transfer = await transferService.dispatch(tenantId, id, items, userId);

  return reply.send(successResponse(transfer));
}

export async function receiveTransfer(
  request: FastifyRequest<{ Params: { id: string }; Body: ReceiveTransferInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;
  const { items } = request.body;

  const transfer = await transferService.receive(tenantId, id, items, userId);

  return reply.send(successResponse(transfer));
}

export async function cancelTransfer(
  request: FastifyRequest<{ Params: { id: string }; Body: CancelTransferInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;
  const { reason } = request.body;

  const transfer = await transferService.cancel(tenantId, id, reason, userId);

  return reply.send(successResponse(transfer));
}
