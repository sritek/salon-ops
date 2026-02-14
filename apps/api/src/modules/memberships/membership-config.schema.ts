/**
 * Membership Config Schema
 * Zod validation schemas for membership configuration API endpoints
 * Requirements: 7.1
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const validityUnitSchema = z.enum(['days', 'months', 'years']);
export const refundPolicySchema = z.enum(['refundable', 'non_refundable', 'partial']);
export const branchScopeSchema = z.enum(['all_branches', 'specific_branches']);
export const precedenceSchema = z.enum(['package_first', 'membership_only', 'customer_choice']);

// ============================================
// Config Schemas
// ============================================

export const updateMembershipConfigBodySchema = z.object({
  membershipsEnabled: z.boolean().optional(),
  packagesEnabled: z.boolean().optional(),
  defaultValidityUnit: validityUnitSchema.optional(),
  defaultValidityValue: z.number().int().min(1).optional(),
  refundPolicy: refundPolicySchema.optional(),
  cancellationFeePercentage: z.number().min(0).max(100).optional(),
  defaultBranchScope: branchScopeSchema.optional(),
  membershipPackagePrecedence: precedenceSchema.optional(),
  gracePeriodDays: z.number().int().min(0).optional(),
  maxFreezeDaysPerYear: z.number().int().min(0).optional(),
  expiryReminderDays: z.number().int().min(1).optional(),
  lowBalanceThreshold: z.number().int().min(1).optional(),
});

// ============================================
// Response Schemas
// ============================================

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
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

export type UpdateMembershipConfigBody = z.infer<typeof updateMembershipConfigBodySchema>;
