/**
 * Service Consumable Controller
 * Request handlers for service-product mapping endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { serviceConsumableService } from './service-consumable.service';
import { successResponse, errorResponse } from '@/lib/response';
import type { CreateMappingInput, UpdateMappingInput } from './service-consumable.schema';

// ============================================
// CRUD Operations
// ============================================

export async function createMapping(
  request: FastifyRequest<{ Body: CreateMappingInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const data = request.body;

  const mapping = await serviceConsumableService.create(tenantId, data, userId);

  return reply.status(201).send(successResponse(mapping));
}

export async function updateMapping(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateMappingInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user;
  const { id } = request.params;
  const data = request.body;

  const mapping = await serviceConsumableService.update(tenantId, id, data, userId);

  return reply.send(successResponse(mapping));
}

export async function deleteMapping(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { id } = request.params;

  await serviceConsumableService.delete(tenantId, id);

  return reply.status(204).send();
}

export async function getMapping(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { id } = request.params;

  const mapping = await serviceConsumableService.get(tenantId, id);

  if (!mapping) {
    return reply.status(404).send(errorResponse('NOT_FOUND', 'Mapping not found'));
  }

  return reply.send(successResponse(mapping));
}

export async function getMappingsForService(
  request: FastifyRequest<{ Params: { serviceId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { serviceId } = request.params;

  const mappings = await serviceConsumableService.getForService(tenantId, serviceId);

  return reply.send(successResponse(mappings));
}

export async function getMappingsForProduct(
  request: FastifyRequest<{ Params: { productId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const { productId } = request.params;

  const mappings = await serviceConsumableService.getForProduct(tenantId, productId);

  return reply.send(successResponse(mappings));
}
