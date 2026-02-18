/**
 * Checkout Controller
 * HTTP request handlers for checkout operations
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { successResponse } from '../../lib/response';
import { checkoutService } from './checkout.service';

/**
 * Start a new checkout session
 * POST /api/v1/checkout/start
 */
export async function startCheckout(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const body = request.body as { branchId: string; appointmentId?: string; customerId?: string };
  const session = await checkoutService.startCheckout(body, {
    tenantId,
    userId,
    branchId: body.branchId,
  });
  return reply.status(201).send(successResponse(session));
}

/**
 * Get checkout session
 * GET /api/v1/checkout/:sessionId
 */
export async function getSession(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const { sessionId } = request.params as { sessionId: string };
  const session = await checkoutService.getSession(sessionId, tenantId);
  return reply.send(successResponse(session));
}

/**
 * Add item to checkout session
 * POST /api/v1/checkout/add-item
 */
export async function addItem(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const session = await checkoutService.addItem(request.body as any, {
    tenantId,
    userId,
  });
  return reply.send(successResponse(session));
}

/**
 * Remove item from checkout session
 * POST /api/v1/checkout/remove-item
 */
export async function removeItem(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const body = request.body as { sessionId: string; itemId: string };
  const session = await checkoutService.removeItem(body.sessionId, body.itemId, {
    tenantId,
    userId,
  });
  return reply.send(successResponse(session));
}

/**
 * Apply discount to checkout session
 * POST /api/v1/checkout/apply-discount
 */
export async function applyDiscount(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const session = await checkoutService.applyDiscount(request.body as any, {
    tenantId,
    userId,
  });
  return reply.send(successResponse(session));
}

/**
 * Remove discount from checkout session
 * POST /api/v1/checkout/remove-discount
 */
export async function removeDiscount(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const body = request.body as { sessionId: string; discountId: string };
  const session = await checkoutService.removeDiscount(body.sessionId, body.discountId, {
    tenantId,
    userId,
  });
  return reply.send(successResponse(session));
}

/**
 * Process payment for checkout session
 * POST /api/v1/checkout/process-payment
 */
export async function processPayment(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const session = await checkoutService.processPayment(request.body as any, {
    tenantId,
    userId,
  });
  return reply.send(successResponse(session));
}

/**
 * Complete checkout and generate invoice
 * POST /api/v1/checkout/complete
 */
export async function completeCheckout(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const result = await checkoutService.completeCheckout(request.body as any, {
    tenantId,
    userId,
  });
  return reply.send(successResponse(result));
}
