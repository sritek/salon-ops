/**
 * Goods Receipt Zod Schemas
 * Request/response validation for goods receipt endpoints
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const grnStatusSchema = z.enum(['draft', 'confirmed']);

export const qualityCheckStatusSchema = z.enum(['accepted', 'rejected', 'partial']);

// ============================================
// Request Schemas
// ============================================

export const createGRNItemSchema = z.object({
  productId: z.string().uuid(),
  purchaseOrderItemId: z.string().uuid().optional().nullable(),
  receivedQuantity: z.number().int().positive(),
  focQuantity: z.number().int().min(0).default(0),
  unitCost: z.number().positive(),
  taxRate: z.number().min(0).max(100).optional(),
  batchNumber: z.string().max(50).optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  qualityCheckStatus: qualityCheckStatusSchema.default('accepted'),
  acceptedQuantity: z.number().int().min(0),
  rejectedQuantity: z.number().int().min(0).default(0),
  rejectionReason: z.string().max(255).optional().nullable(),
});

export const createGRNSchema = z.object({
  branchId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid(),
  receiptDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(createGRNItemSchema).min(1, 'At least one item is required'),
});

export const updateGRNSchema = z.object({
  receiptDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(createGRNItemSchema).min(1).optional(),
});

export const grnFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: grnStatusSchema.optional(),
  vendorId: z.string().uuid().optional(),
  purchaseOrderId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['grnNumber', 'receiptDate', 'grandTotal', 'status']).default('receiptDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// Response Schemas
// ============================================

export const goodsReceiptItemSchema = z.object({
  id: z.string().uuid(),
  goodsReceiptId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  purchaseOrderItemId: z.string().uuid().nullable(),
  receivedQuantity: z.number(),
  focQuantity: z.number(),
  unitCost: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  batchNumber: z.string().nullable(),
  expiryDate: z.string().nullable(),
  qualityCheckStatus: qualityCheckStatusSchema,
  acceptedQuantity: z.number(),
  rejectedQuantity: z.number(),
  rejectionReason: z.string().nullable(),
});

export const goodsReceiptNoteSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  branchId: z.string().uuid(),
  grnNumber: z.string(),
  purchaseOrderId: z.string().uuid().nullable(),
  vendorId: z.string().uuid(),
  status: grnStatusSchema,
  receiptDate: z.string(),
  subtotal: z.number(),
  taxAmount: z.number(),
  grandTotal: z.number(),
  notes: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  confirmedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().nullable(),
});

export const goodsReceiptWithItemsSchema = goodsReceiptNoteSchema.extend({
  vendor: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      contactPerson: z.string(),
      phone: z.string(),
    })
    .optional(),
  purchaseOrder: z
    .object({
      id: z.string().uuid(),
      poNumber: z.string(),
      status: z.string(),
    })
    .nullable()
    .optional(),
  items: z.array(goodsReceiptItemSchema),
});

// ============================================
// API Response Schemas
// ============================================

export const grnResponseSchema = z.object({
  success: z.literal(true),
  data: goodsReceiptWithItemsSchema,
});

export const grnListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(goodsReceiptWithItemsSchema),
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

export type CreateGRNInput = z.infer<typeof createGRNSchema>;
export type UpdateGRNInput = z.infer<typeof updateGRNSchema>;
export type GRNFilters = z.infer<typeof grnFiltersSchema>;
