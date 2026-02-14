/**
 * Membership Config Controller
 * Request handlers for membership configuration
 * Requirements: 7.1
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { successResponse } from '../../lib/response';
import { membershipConfigService } from './membership-config.service';
import type { UpdateMembershipConfigBody } from './membership-config.schema';

export async function getMembershipConfig(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const result = await membershipConfigService.get(tenantId);
  return reply.send(successResponse(result));
}

export async function updateMembershipConfig(
  request: FastifyRequest<{ Body: UpdateMembershipConfigBody }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await membershipConfigService.update(tenantId, request.body);
  return reply.send(successResponse(result));
}

export async function resetMembershipConfig(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const result = await membershipConfigService.reset(tenantId);
  return reply.send(successResponse(result));
}
