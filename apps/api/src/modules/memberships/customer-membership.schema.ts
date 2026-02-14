/**
 * Customer Membership Schema
 * Zod validation schemas for customer membership API endpoints
 * Requirements: 3.1, 3.2, 6.1
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const membershipStatusSchema = z.enum([
  'pending',
  'active',
  'frozen',
  'expired',
  'cancelled',
  'transferred',
]);

export const freezeReasonCodeSchema = z.enum(['travel', 'medical', 'personal', 'other']);
export const freezeStatusSchema = z.enum(['requested', 'active', 'completed', 'cancelled']);

// ============================================
// Customer Membership Schemas
// ============================================

export const sellMembershipBodySchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
  branchId: z.string().uuid(),
  activationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD, defaults to today
  staffId: z.string().uuid().optional(), // For commission attribution
});

export const freezeMembershipBodySchema = z.object({
  freezeStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  freezeEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reasonCode: freezeReasonCodeSchema,
  reasonDescription: z.string().max(500).optional(),
});

export const cancelMembershipBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export const customerMembershipQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  customerId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: membershipStatusSchema.optional(),
  expiringWithinDays: z.coerce.number().int().min(1).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['purchaseDate', 'currentExpiryDate', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const membershipUsageQuerySchema = z.object({
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

export type SellMembershipBody = z.infer<typeof sellMembershipBodySchema>;
export type FreezeMembershipBody = z.infer<typeof freezeMembershipBodySchema>;
export type CancelMembershipBody = z.infer<typeof cancelMembershipBodySchema>;
export type CustomerMembershipQuery = z.infer<typeof customerMembershipQuerySchema>;
export type MembershipUsageQuery = z.infer<typeof membershipUsageQuerySchema>;
