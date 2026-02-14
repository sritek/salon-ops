/**
 * Membership Plan Schema
 * Zod validation schemas for membership plan API endpoints
 * Requirements: 1.1, 1.2
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const validityUnitSchema = z.enum(['days', 'months', 'years']);
export const branchScopeSchema = z.enum(['all_branches', 'specific_branches']);
export const membershipTierSchema = z.enum(['silver', 'gold', 'platinum']);
export const discountTypeSchema = z.enum(['percentage', 'flat']);
export const commissionTypeSchema = z.enum(['percentage', 'flat']);

export const benefitTypeSchema = z.enum([
  'flat_discount',
  'service_discount',
  'product_discount',
  'complimentary_service',
  'priority_booking',
  'visit_limit',
  'cooldown_period',
  'benefit_cap',
  'fallback_discount',
]);

export const complimentaryPeriodSchema = z.enum(['per_visit', 'per_month', 'per_year', 'total']);
export const benefitCapPeriodSchema = z.enum(['per_month', 'per_year']);

// ============================================
// Benefit Schemas
// ============================================

export const createBenefitBodySchema = z.object({
  benefitType: benefitTypeSchema,
  serviceId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  discountType: discountTypeSchema.nullable().optional(),
  discountValue: z.number().min(0).nullable().optional(),
  complimentaryCount: z.number().int().min(1).nullable().optional(),
  complimentaryPeriod: complimentaryPeriodSchema.nullable().optional(),
  maxServicesPerVisit: z.number().int().min(1).nullable().optional(),
  cooldownDays: z.number().int().min(0).nullable().optional(),
  benefitCapAmount: z.number().min(0).nullable().optional(),
  benefitCapPeriod: benefitCapPeriodSchema.nullable().optional(),
  priorityLevel: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateBenefitBodySchema = createBenefitBodySchema.partial();

// ============================================
// Membership Plan Schemas
// ============================================

export const createMembershipPlanBodySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(20).nullable().optional(),
  description: z.string().nullable().optional(),
  tier: membershipTierSchema.nullable().optional(),
  price: z.number().min(0),
  gstRate: z.number().min(0).max(100).optional().default(18),
  validityValue: z.number().int().min(1),
  validityUnit: validityUnitSchema,
  branchScope: branchScopeSchema.optional().default('all_branches'),
  branchIds: z.array(z.string().uuid()).optional(),
  termsAndConditions: z.string().nullable().optional(),
  saleCommissionType: commissionTypeSchema.nullable().optional(),
  saleCommissionValue: z.number().min(0).nullable().optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  benefits: z.array(createBenefitBodySchema).optional(),
});

export const updateMembershipPlanBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(20).nullable().optional(),
  description: z.string().nullable().optional(),
  tier: membershipTierSchema.nullable().optional(),
  price: z.number().min(0).optional(),
  gstRate: z.number().min(0).max(100).optional(),
  validityValue: z.number().int().min(1).optional(),
  validityUnit: validityUnitSchema.optional(),
  branchScope: branchScopeSchema.optional(),
  branchIds: z.array(z.string().uuid()).optional(),
  termsAndConditions: z.string().nullable().optional(),
  saleCommissionType: commissionTypeSchema.nullable().optional(),
  saleCommissionValue: z.number().min(0).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const membershipPlanQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  tier: membershipTierSchema.optional(),
  branchId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'displayOrder']).optional().default('displayOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ============================================
// Param Schemas
// ============================================

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const planBenefitParamsSchema = z.object({
  id: z.string().uuid(),
  benefitId: z.string().uuid(),
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

export type CreateBenefitBody = z.infer<typeof createBenefitBodySchema>;
export type UpdateBenefitBody = z.infer<typeof updateBenefitBodySchema>;
export type CreateMembershipPlanBody = z.infer<typeof createMembershipPlanBodySchema>;
export type UpdateMembershipPlanBody = z.infer<typeof updateMembershipPlanBodySchema>;
export type MembershipPlanQuery = z.infer<typeof membershipPlanQuerySchema>;
