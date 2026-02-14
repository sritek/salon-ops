/**
 * Customer Package Controller
 * Request handlers for customer package management
 * Requirements: 4.1, 5.3
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { successResponse, paginatedResponse } from '../../lib/response';
import { customerPackageService } from './customer-package.service';
import type {
  SellPackageBody,
  CancelPackageBody,
  CustomerPackageQuery,
  PackageRedemptionQuery,
} from './customer-package.schema';

export async function sellPackage(
  request: FastifyRequest<{ Body: SellPackageBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await customerPackageService.sell(tenantId, request.body, userId);
  return reply.status(201).send(successResponse(result));
}

export async function getCustomerPackageById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await customerPackageService.getById(tenantId, request.params.id);
  return reply.send(successResponse(result));
}

export async function listCustomerPackages(
  request: FastifyRequest<{ Querystring: CustomerPackageQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await customerPackageService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function getPackageCredits(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await customerPackageService.getCredits(tenantId, request.params.id);
  return reply.send(successResponse(result));
}

export async function cancelCustomerPackage(
  request: FastifyRequest<{ Params: { id: string }; Body: CancelPackageBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await customerPackageService.cancel(
    tenantId,
    request.params.id,
    request.body,
    userId
  );
  return reply.send(successResponse(result));
}

export async function getPackageRedemptions(
  request: FastifyRequest<{ Params: { id: string }; Querystring: PackageRedemptionQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await customerPackageService.getRedemptions(
    tenantId,
    request.params.id,
    request.query
  );
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function getCustomerPackages(
  request: FastifyRequest<{ Params: { customerId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await customerPackageService.getCustomerPackages(
    tenantId,
    request.params.customerId
  );
  return reply.send(successResponse(result));
}
