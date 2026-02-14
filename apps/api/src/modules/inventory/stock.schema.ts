/**
 * Stock Zod Schemas
 * Request/response validation for stock management endpoints
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const movementTypeSchema = z.enum([
  'receipt',
  'sale',
  'consumption',
  'adjustment',
  'transfer_out',
  'transfer_in',
  'return',
  'audit',
]);

export const consumptionReasonSchema = z.enum([
  'sample',
  'demo',
  'wastage',
  'damaged',
  'expired',
  'other',
]);

export const adjustmentTypeSchema = z.enum(['increase', 'decrease']);

export const alertTypeSchema = z.enum(['low_stock', 'near_expiry', 'expired']);

// ============================================
// Request Schemas
// ============================================

export const stockFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  categoryId: z.string().uuid().optional(),
  productType: z.enum(['retail', 'consumable', 'both']).optional(),
  search: z.string().optional(),
  alertType: alertTypeSchema.optional(),
  sortBy: z
    .enum(['productName', 'quantityOnHand', 'availableQuantity', 'totalValue', 'averageCost'])
    .default('productName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const movementFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  productId: z.string().uuid().optional(),
  movementType: z.union([movementTypeSchema, z.array(movementTypeSchema)]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const consumeStockSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  reason: consumptionReasonSchema,
  description: z.string().max(500).optional(),
});

export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  adjustmentType: adjustmentTypeSchema,
  quantity: z.number().positive(),
  reason: z.string().min(1).max(500),
});

// ============================================
// Response Schemas
// ============================================

export const stockBatchSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number(),
  availableQuantity: z.number(),
  unitCost: z.number(),
  totalValue: z.number(),
  batchNumber: z.string().nullable(),
  expiryDate: z.string().nullable(),
  receiptDate: z.string(),
  isExpired: z.boolean(),
  isDepleted: z.boolean(),
  goodsReceiptId: z.string().uuid().nullable(),
  transferId: z.string().uuid().nullable(),
  adjustmentId: z.string().nullable(),
  createdAt: z.string(),
  product: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      sku: z.string(),
    })
    .optional(),
});

export const stockSummarySchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productSku: z.string(),
  categoryName: z.string(),
  unitOfMeasure: z.string(),
  quantityOnHand: z.number(),
  reservedQuantity: z.number(),
  availableQuantity: z.number(),
  averageCost: z.number(),
  totalValue: z.number(),
  reorderLevel: z.number().nullable(),
  isLowStock: z.boolean(),
  hasNearExpiry: z.boolean(),
  hasExpired: z.boolean(),
});

export const stockMovementSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  batchId: z.string().uuid().nullable(),
  movementType: movementTypeSchema,
  quantity: z.number(),
  quantityBefore: z.number(),
  quantityAfter: z.number(),
  referenceType: z.string().nullable(),
  referenceId: z.string().uuid().nullable(),
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  product: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      sku: z.string(),
    })
    .optional(),
  batch: stockBatchSchema.optional().nullable(),
});

export const stockAvailabilitySchema = z.object({
  available: z.boolean(),
  currentStock: z.number(),
  shortfall: z.number(),
});

// ============================================
// API Response Schemas
// ============================================

export const stockSummaryListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(stockSummarySchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const stockSummaryResponseSchema = z.object({
  success: z.literal(true),
  data: stockSummarySchema,
});

export const stockBatchListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(stockBatchSchema),
});

export const stockMovementListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(stockMovementSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const stockMovementResponseSchema = z.object({
  success: z.literal(true),
  data: stockMovementSchema,
});

export const consumptionResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    success: z.boolean(),
    totalConsumed: z.number(),
    shortfall: z.number(),
    consumedBatches: z.array(
      z.object({
        batchId: z.string().uuid(),
        quantity: z.number(),
        unitCost: z.number(),
      })
    ),
  }),
});

export const stockAvailabilityResponseSchema = z.object({
  success: z.literal(true),
  data: stockAvailabilitySchema,
});

// ============================================
// Type Exports
// ============================================

export type StockFilters = z.infer<typeof stockFiltersSchema>;
export type MovementFilters = z.infer<typeof movementFiltersSchema>;
export type ConsumeStockInput = z.infer<typeof consumeStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
