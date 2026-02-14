/**
 * Membership Plan Controller
 * Request handlers for membership plan management
 * Requirements: 1.1, 1.2
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { successResponse, paginatedResponse, deleteResponse } from '../../lib/response';
import { membershipPlanService } from './membership-plan.service';
import type {
  CreateMembershipPlanBody,
  UpdateMembershipPlanBody,
  MembershipPlanQuery,
  CreateBenefitBody,
  UpdateBenefitBody,
} from './membership-plan.schema';

// ============================================
// Membership Plan Handlers
// ============================================

export async function createMembershipPlan(
  request: FastifyRequest<{ Body: CreateMembershipPlanBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await membershipPlanService.create(tenantId, request.body, userId);
  return reply.status(201).send(successResponse(result));
}

export async function getMembershipPlanById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await membershipPlanService.getById(tenantId, request.params.id);
  return reply.send(successResponse(result));
}

export async function listMembershipPlans(
  request: FastifyRequest<{ Querystring: MembershipPlanQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await membershipPlanService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function updateMembershipPlan(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateMembershipPlanBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await membershipPlanService.update(
    tenantId,
    request.params.id,
    request.body,
    userId
  );
  return reply.send(successResponse(result));
}

export async function deleteMembershipPlan(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  await membershipPlanService.delete(tenantId, request.params.id);
  return reply.send(deleteResponse('Membership plan deactivated successfully'));
}

export async function getPlansForBranch(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await membershipPlanService.getPlansForBranch(tenantId, request.params.branchId);
  return reply.send(successResponse(result));
}

// ============================================
// Benefit Handlers
// ============================================

export async function addBenefit(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateBenefitBody }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await membershipPlanService.addBenefit(tenantId, request.params.id, request.body);
  return reply.status(201).send(successResponse(result));
}

export async function updateBenefit(
  request: FastifyRequest<{
    Params: { id: string; benefitId: string };
    Body: UpdateBenefitBody;
  }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await membershipPlanService.updateBenefit(
    tenantId,
    request.params.id,
    request.params.benefitId,
    request.body
  );
  return reply.send(successResponse(result));
}

export async function removeBenefit(
  request: FastifyRequest<{ Params: { id: string; benefitId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  await membershipPlanService.removeBenefit(tenantId, request.params.id, request.params.benefitId);
  return reply.send(deleteResponse('Benefit removed successfully'));
}
