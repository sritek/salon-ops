/**
 * Audit Zod Schemas
 * Request/response validation for stock audit endpoints
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const auditStatusSchema = z.enum(['in_progress', 'completed', 'posted']);

export const auditTypeSchema = z.enum(['full', 'partial', 'category']);

// ============================================
// Request Schemas
// ============================================

export const createAuditSchema = z.object({
  branchId: z.string().uuid(),
  auditType: auditTypeSchema,
  categoryId: z.string().uuid().optional().nullable(),
  productIds: z.array(z.string().uuid()).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateCountSchema = z.object({
  physicalCount: z.number().int().min(0),
  notes: z.string().max(500).optional().nullable(),
});

export const auditFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.union([auditStatusSchema, z.array(auditStatusSchema)]).optional(),
  auditType: auditTypeSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['auditNumber', 'startedAt', 'status']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// Response Schemas
// ============================================

export const auditItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  auditId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  systemQuantity: z.number(),
  physicalCount: z.number().nullable(),
  variance: z.number(),
  averageCost: z.number(),
  varianceValue: z.number(),
  notes: z.string().nullable(),
  countedAt: z.string().nullable(),
  countedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const stockAuditSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  branchId: z.string().uuid(),
  auditNumber: z.string(),
  auditType: auditTypeSchema,
  categoryId: z.string().uuid().nullable(),
  status: auditStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  completedBy: z.string().nullable(),
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  totalVarianceValue: z.number(),
  totalShrinkageValue: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().nullable(),
});

export const stockAuditWithItemsSchema = stockAuditSchema.extend({
  items: z.array(auditItemSchema),
  category: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .nullable()
    .optional(),
});

// ============================================
// API Response Schemas
// ============================================

export const auditResponseSchema = z.object({
  success: z.literal(true),
  data: stockAuditWithItemsSchema,
});

export const auditListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(stockAuditWithItemsSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const auditItemResponseSchema = z.object({
  success: z.literal(true),
  data: auditItemSchema,
});

// ============================================
// Type Exports
// ============================================

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type UpdateCountInput = z.infer<typeof updateCountSchema>;
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
