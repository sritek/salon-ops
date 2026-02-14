/**
 * Customer Package Schema
 * Zod validation schemas for customer package API endpoints
 * Requirements: 4.1, 5.3
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const packageStatusSchema = z.enum([
  'pending',
  'active',
  'expired',
  'exhausted',
  'cancelled',
  'transferred',
]);

// ============================================
// Customer Package Schemas
// ============================================

export const sellPackageBodySchema = z.object({
  customerId: z.string().uuid(),
  packageId: z.string().uuid(),
  branchId: z.string().uuid(),
  activationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD, defaults to today
  staffId: z.string().uuid().optional(), // For commission attribution
});

export const cancelPackageBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export const customerPackageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  customerId: z.string().uuid().optional(),
  packageId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: packageStatusSchema.optional(),
  packageType: z.enum(['service_package', 'value_package', 'combo_package']).optional(),
  expiringWithinDays: z.coerce.number().int().min(1).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['purchaseDate', 'expiryDate', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const packageRedemptionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ============================================
// Param Schemas
// ============================================

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const customerIdParamSchema = z.object({
  customerId: z.string().uuid(),
});

// ============================================
// Response Schemas
// ============================================

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

export const paginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export const messageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.any()).optional(),
  }),
});

// ============================================
// Type Exports
// ============================================

export type SellPackageBody = z.infer<typeof sellPackageBodySchema>;
export type CancelPackageBody = z.infer<typeof cancelPackageBodySchema>;
export type CustomerPackageQuery = z.infer<typeof customerPackageQuerySchema>;
export type PackageRedemptionQuery = z.infer<typeof packageRedemptionQuerySchema>;
