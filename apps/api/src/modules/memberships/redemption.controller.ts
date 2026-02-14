/**
 * Redemption Controller
 * Request handlers for checking and applying membership/package benefits
 * Requirements: 5.1, 5.2, 5.3
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { successResponse } from '../../lib/response';
import { redemptionService } from './redemption.service';
import type {
  CheckBenefitsBody,
  ApplyMembershipDiscountBody,
  RedeemPackageCreditsBody,
} from './redemption.schema';

export async function checkBenefits(
  request: FastifyRequest<{ Body: CheckBenefitsBody }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await redemptionService.checkBenefits(tenantId, request.body);
  return reply.send(successResponse(result));
}

export async function applyMembershipDiscount(
  request: FastifyRequest<{ Body: ApplyMembershipDiscountBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await redemptionService.applyMembershipDiscount(tenantId, request.body, userId);
  return reply.send(successResponse(result));
}

export async function redeemPackageCredits(
  request: FastifyRequest<{ Body: RedeemPackageCreditsBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await redemptionService.redeemPackageCredits(tenantId, request.body, userId);
  return reply.send(successResponse(result));
}

export async function getCustomerBenefitsSummary(
  request: FastifyRequest<{ Params: { customerId: string }; Querystring: { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await redemptionService.getCustomerBenefitsSummary(
    tenantId,
    request.params.customerId,
    request.query.branchId
  );
  return reply.send(successResponse(result));
}
