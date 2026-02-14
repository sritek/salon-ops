/**
 * Transfer Zod Schemas
 * Request/response validation for stock transfer endpoints
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const transferStatusSchema = z.enum([
  'requested',
  'approved',
  'rejected',
  'in_transit',
  'received',
  'cancelled',
]);

export const transferDirectionSchema = z.enum(['outgoing', 'incoming', 'all']);

// ============================================
// Request Schemas
// ============================================

export const transferItemInputSchema = z.object({
  productId: z.string().uuid(),
  requestedQuantity: z.number().int().positive(),
});

export const createTransferSchema = z.object({
  sourceBranchId: z.string().uuid(),
  destinationBranchId: z.string().uuid(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(transferItemInputSchema).min(1, 'At least one item is required'),
});

export const dispatchItemSchema = z.object({
  productId: z.string().uuid(),
  dispatchedQuantity: z.number().int().min(0),
});

export const dispatchTransferSchema = z.object({
  items: z.array(dispatchItemSchema).min(1),
});

export const receiveItemSchema = z.object({
  productId: z.string().uuid(),
  receivedQuantity: z.number().int().min(0),
});

export const receiveTransferSchema = z.object({
  items: z.array(receiveItemSchema).min(1),
});

export const rejectTransferSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const cancelTransferSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const transferFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.union([transferStatusSchema, z.array(transferStatusSchema)]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['transferNumber', 'requestDate', 'totalValue', 'status']).default('requestDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// Response Schemas
// ============================================

export const transferItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  transferId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  requestedQuantity: z.number(),
  dispatchedQuantity: z.number(),
  receivedQuantity: z.number(),
  discrepancy: z.number(),
  unitCost: z.number(),
  totalValue: z.number(),
  createdAt: z.string(),
});

export const stockTransferSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  transferNumber: z.string(),
  sourceBranchId: z.string().uuid(),
  destinationBranchId: z.string().uuid(),
  status: transferStatusSchema,
  requestDate: z.string(),
  approvedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectedBy: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  dispatchedAt: z.string().nullable(),
  dispatchedBy: z.string().nullable(),
  receivedAt: z.string().nullable(),
  receivedBy: z.string().nullable(),
  totalValue: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().nullable(),
});

export const stockTransferWithItemsSchema = stockTransferSchema.extend({
  items: z.array(transferItemSchema),
  sourceBranch: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .optional(),
  destinationBranch: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .optional(),
});

// ============================================
// API Response Schemas
// ============================================

export const transferResponseSchema = z.object({
  success: z.literal(true),
  data: stockTransferWithItemsSchema,
});

export const transferListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(stockTransferWithItemsSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// ============================================
// Type Exports
// ============================================

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type DispatchTransferInput = z.infer<typeof dispatchTransferSchema>;
export type ReceiveTransferInput = z.infer<typeof receiveTransferSchema>;
export type RejectTransferInput = z.infer<typeof rejectTransferSchema>;
export type CancelTransferInput = z.infer<typeof cancelTransferSchema>;
export type TransferFilters = z.infer<typeof transferFiltersSchema>;
export type TransferDirection = z.infer<typeof transferDirectionSchema>;
