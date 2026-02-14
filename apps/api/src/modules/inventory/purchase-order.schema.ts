/**
 * Purchase Order Zod Schemas
 * Request/response validation for purchase order endpoints
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const poStatusSchema = z.enum([
  'draft',
  'sent',
  'partially_received',
  'fully_received',
  'cancelled',
]);

// ============================================
// Request Schemas
// ============================================

export const createPOItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  taxRate: z.number().min(0).max(100).optional(),
});

export const createPOSchema = z.object({
  branchId: z.string().uuid(),
  vendorId: z.string().uuid(),
  expectedDeliveryDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(createPOItemSchema).min(1, 'At least one item is required'),
});

export const updatePOSchema = z.object({
  vendorId: z.string().uuid().optional(),
  expectedDeliveryDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(createPOItemSchema).min(1).optional(),
});

export const cancelPOSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export const poFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.union([poStatusSchema, z.array(poStatusSchema)]).optional(),
  vendorId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['poNumber', 'orderDate', 'grandTotal', 'status']).default('orderDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// Response Schemas
// ============================================

export const purchaseOrderItemSchema = z.object({
  id: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  productSku: z.string().nullable(),
  quantity: z.number(),
  unitPrice: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  receivedQuantity: z.number(),
  pendingQuantity: z.number(),
});

export const purchaseOrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  branchId: z.string().uuid(),
  poNumber: z.string(),
  vendorId: z.string().uuid(),
  status: poStatusSchema,
  orderDate: z.string(),
  expectedDeliveryDate: z.string().nullable(),
  subtotal: z.number(),
  cgstAmount: z.number(),
  sgstAmount: z.number(),
  igstAmount: z.number(),
  grandTotal: z.number(),
  notes: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancelledBy: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().nullable(),
});

export const purchaseOrderWithItemsSchema = purchaseOrderSchema.extend({
  vendor: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      contactPerson: z.string(),
      phone: z.string(),
    })
    .optional(),
  items: z.array(purchaseOrderItemSchema),
});

export const reorderSuggestionSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productSku: z.string().nullable(),
  currentStock: z.number(),
  reorderLevel: z.number(),
  suggestedQuantity: z.number(),
  preferredVendorId: z.string().uuid().nullable(),
  preferredVendorName: z.string().nullable(),
  lastPurchasePrice: z.number().nullable(),
  hasPendingPO: z.boolean(),
});

// ============================================
// API Response Schemas
// ============================================

export const poResponseSchema = z.object({
  success: z.literal(true),
  data: purchaseOrderWithItemsSchema,
});

export const poListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(purchaseOrderWithItemsSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const reorderSuggestionsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(reorderSuggestionSchema),
});

// ============================================
// Type Exports
// ============================================

export type CreatePOInput = z.infer<typeof createPOSchema>;
export type UpdatePOInput = z.infer<typeof updatePOSchema>;
export type CancelPOInput = z.infer<typeof cancelPOSchema>;
export type POFilters = z.infer<typeof poFiltersSchema>;
