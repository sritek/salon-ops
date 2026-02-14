/**
 * Audit Controller
 * Request handlers for stock audit endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from './audit.service';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  buildPaginationMeta,
} from '../../lib/response';
import type { CreateAuditInput, UpdateCountInput, AuditFilters } from './audit.schema';

// ============================================
// CRUD Operations
// ============================================

export async function createAudit(
  request: FastifyRequest<{ Body: CreateAuditInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const data = request.body;

  const audit = await auditService.create(tenantId, data, userId);

  return reply.status(201).send(successResponse(audit));
}

export async function getAudit(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { id } = request.params;

  const audit = await auditService.get(tenantId, id);

  if (!audit) {
    return reply.status(404).send(errorResponse('NOT_FOUND', 'Audit not found'));
  }

  return reply.send(successResponse(audit));
}

export async function listAudits(
  request: FastifyRequest<{ Querystring: AuditFilters & { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { branchId, ...filters } = request.query;

  if (!branchId) {
    return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'branchId is required'));
  }

  const result = await auditService.list(tenantId, branchId, filters);
  const meta = buildPaginationMeta(result.page, result.limit, result.total);

  return reply.send(paginatedResponse(result.data, meta));
}

// ============================================
// Counting Operations
// ============================================

export async function updateCount(
  request: FastifyRequest<{
    Params: { id: string; itemId: string };
    Body: UpdateCountInput;
  }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id, itemId } = request.params;
  const data = request.body;

  const item = await auditService.updateCount(tenantId, id, itemId, data, userId);

  return reply.send(successResponse(item));
}

// ============================================
// Workflow Operations
// ============================================

export async function completeAudit(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;

  const audit = await auditService.complete(tenantId, id, userId);

  return reply.send(successResponse(audit));
}

export async function postAdjustments(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;

  const audit = await auditService.postAdjustments(tenantId, id, userId);

  return reply.send(successResponse(audit));
}
