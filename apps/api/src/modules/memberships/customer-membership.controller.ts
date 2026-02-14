/**
 * Customer Membership Controller
 * Request handlers for customer membership management
 * Requirements: 3.1, 3.2, 6.1
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { successResponse, paginatedResponse } from '../../lib/response';
import { customerMembershipService } from './customer-membership.service';
import type {
  SellMembershipBody,
  FreezeMembershipBody,
  CancelMembershipBody,
  CustomerMembershipQuery,
  MembershipUsageQuery,
} from './customer-membership.schema';

export async function sellMembership(
  request: FastifyRequest<{ Body: SellMembershipBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await customerMembershipService.sell(tenantId, request.body, userId);
  return reply.status(201).send(successResponse(result));
}

export async function getMembershipById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await customerMembershipService.getById(tenantId, request.params.id);
  return reply.send(successResponse(result));
}

export async function listMemberships(
  request: FastifyRequest<{ Querystring: CustomerMembershipQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await customerMembershipService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function freezeMembership(
  request: FastifyRequest<{ Params: { id: string }; Body: FreezeMembershipBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await customerMembershipService.freeze(
    tenantId,
    request.params.id,
    request.body,
    userId
  );
  return reply.send(successResponse(result));
}

export async function unfreezeMembership(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await customerMembershipService.unfreeze(tenantId, request.params.id, userId);
  return reply.send(successResponse(result));
}

export async function cancelMembership(
  request: FastifyRequest<{ Params: { id: string }; Body: CancelMembershipBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await customerMembershipService.cancel(
    tenantId,
    request.params.id,
    request.body,
    userId
  );
  return reply.send(successResponse(result));
}

export async function getMembershipUsage(
  request: FastifyRequest<{ Params: { id: string }; Querystring: MembershipUsageQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await customerMembershipService.getUsage(
    tenantId,
    request.params.id,
    request.query
  );
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function getCustomerMemberships(
  request: FastifyRequest<{ Params: { customerId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await customerMembershipService.getCustomerMemberships(
    tenantId,
    request.params.customerId
  );
  return reply.send(successResponse(result));
}
