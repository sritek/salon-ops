/**
 * Package Controller
 * Request handlers for package management
 * Requirements: 2.1, 2.2
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { successResponse, paginatedResponse, deleteResponse } from '../../lib/response';
import { packageService } from './package.service';
import type { CreatePackageBody, UpdatePackageBody, PackageQuery } from './package.schema';

export async function createPackage(
  request: FastifyRequest<{ Body: CreatePackageBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await packageService.create(tenantId, request.body, userId);
  return reply.status(201).send(successResponse(result));
}

export async function getPackageById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await packageService.getById(tenantId, request.params.id);
  return reply.send(successResponse(result));
}

export async function listPackages(
  request: FastifyRequest<{ Querystring: PackageQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await packageService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function updatePackage(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdatePackageBody }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await packageService.update(tenantId, request.params.id, request.body, userId);
  return reply.send(successResponse(result));
}

export async function deletePackage(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  await packageService.delete(tenantId, request.params.id);
  return reply.send(deleteResponse('Package deactivated successfully'));
}

export async function getPackagesForBranch(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await packageService.getPackagesForBranch(tenantId, request.params.branchId);
  return reply.send(successResponse(result));
}
