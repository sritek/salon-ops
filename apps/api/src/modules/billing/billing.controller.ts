/**
 * Billing Controller
 * Request handlers for billing operations
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { billingService } from './billing.service';
import {
  successResponse,
  paginatedResponse,
  deleteResponse,
  errorResponse,
} from '../../lib/response';

// ============================================
// Invoice CRUD
// ============================================

export async function createInvoice(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const invoice = await billingService.createInvoice(request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.status(201).send(successResponse(invoice));
}

export async function getInvoice(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const { id } = request.params as { id: string };
  const invoice = await billingService.getInvoice(id, tenantId);

  return reply.send(successResponse(invoice));
}

export async function listInvoices(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const result = await billingService.listInvoices(request.query as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function updateInvoice(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { id } = request.params as { id: string };
  const invoice = await billingService.updateInvoice(id, request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(successResponse(invoice));
}

export async function deleteInvoice(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { id } = request.params as { id: string };
  await billingService.deleteInvoice(id, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(deleteResponse('Invoice deleted successfully'));
}

// ============================================
// Invoice Items
// ============================================

export async function addItem(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { id } = request.params as { id: string };
  const invoice = await billingService.addItem(id, request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(successResponse(invoice));
}

export async function removeItem(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { id, itemId } = request.params as { id: string; itemId: string };
  const invoice = await billingService.removeItem(id, itemId, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(successResponse(invoice));
}

// ============================================
// Payments
// ============================================

export async function addPayment(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { id } = request.params as { id: string };
  const invoice = await billingService.addPayment(id, request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(successResponse(invoice));
}

// ============================================
// Invoice Actions
// ============================================

export async function finalizeInvoice(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { id } = request.params as { id: string };
  const invoice = await billingService.finalizeInvoice(id, request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(successResponse(invoice));
}

export async function cancelInvoice(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { id } = request.params as { id: string };
  const invoice = await billingService.cancelInvoice(id, request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(successResponse(invoice));
}

// ============================================
// Quick Actions
// ============================================

export async function quickBill(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const invoice = await billingService.quickBill(request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.status(201).send(successResponse(invoice));
}

export async function calculateTotals(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const calculation = await billingService.calculate(request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(successResponse(calculation));
}

export async function getNextInvoiceNumber(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { branchId } = request.query as { branchId?: string };
  const effectiveBranchId = branchId || branchIds?.[0];

  if (!effectiveBranchId) {
    return reply.status(400).send(errorResponse('BRANCH_REQUIRED', 'Branch ID is required'));
  }

  const invoiceNumber = await billingService.getNextInvoiceNumber(effectiveBranchId, {
    tenantId,
    userId,
    branchId: effectiveBranchId,
  });

  return reply.send(successResponse({ invoiceNumber }));
}

// ============================================
// Credit Notes
// ============================================

import { creditNoteService, dayClosureService, cashDrawerService } from './billing.service';

export async function createCreditNote(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const creditNote = await creditNoteService.createCreditNote(request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.status(201).send(successResponse(creditNote));
}

export async function getCreditNote(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const { id } = request.params as { id: string };
  const creditNote = await creditNoteService.getCreditNote(id, tenantId);

  return reply.send(successResponse(creditNote));
}

export async function listCreditNotes(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const result = await creditNoteService.listCreditNotes(request.query as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(paginatedResponse(result.data, result.meta));
}

// ============================================
// Day Closure
// ============================================

export async function openDay(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const dayClosure = await dayClosureService.openDay(request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.status(201).send(successResponse(dayClosure));
}

export async function closeDay(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { id } = request.params as { id: string };
  const dayClosure = await dayClosureService.closeDay(id, request.body as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(successResponse(dayClosure));
}

export async function getCurrentDay(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { branchId } = request.query as { branchId?: string };
  const effectiveBranchId = branchId || branchIds?.[0];

  if (!effectiveBranchId) {
    return reply.status(400).send(errorResponse('BRANCH_REQUIRED', 'Branch ID is required'));
  }

  const dayClosure = await dayClosureService.getCurrentDay(effectiveBranchId, {
    tenantId,
    userId,
    branchId: effectiveBranchId,
  });

  return reply.send(successResponse(dayClosure));
}

export async function listDayClosures(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const result = await dayClosureService.listDayClosures(request.query as any, {
    tenantId,
    userId,
    branchId: branchIds?.[0],
  });

  return reply.send(paginatedResponse(result.data, result.meta));
}

// ============================================
// Cash Drawer
// ============================================

export async function getCashBalance(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { branchId } = request.query as { branchId?: string };
  const effectiveBranchId = branchId || branchIds?.[0];

  if (!effectiveBranchId) {
    return reply.status(400).send(errorResponse('BRANCH_REQUIRED', 'Branch ID is required'));
  }

  const balance = await cashDrawerService.getBalance(effectiveBranchId, {
    tenantId,
    userId,
    branchId: effectiveBranchId,
  });

  return reply.send(successResponse(balance));
}

export async function getCashTransactions(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const query = request.query as any;
  const effectiveBranchId = query.branchId || branchIds?.[0];

  if (!effectiveBranchId) {
    return reply.status(400).send(errorResponse('BRANCH_REQUIRED', 'Branch ID is required'));
  }

  const result = await cashDrawerService.getTransactions(
    { ...query, branchId: effectiveBranchId },
    { tenantId, userId, branchId: effectiveBranchId }
  );

  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function makeCashAdjustment(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId, branchIds } = request.user!;
  const { branchId } = request.query as { branchId?: string };
  const effectiveBranchId = branchId || branchIds?.[0];

  if (!effectiveBranchId) {
    return reply.status(400).send(errorResponse('BRANCH_REQUIRED', 'Branch ID is required'));
  }

  const transaction = await cashDrawerService.makeAdjustment(
    effectiveBranchId,
    request.body as any,
    { tenantId, userId, branchId: effectiveBranchId }
  );

  return reply.status(201).send(successResponse(transaction));
}
