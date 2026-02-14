/**
 * Redemption Schema
 * Zod validation schemas for redemption API endpoints
 * Requirements: 5.1, 5.2, 5.3
 */

import { z } from 'zod';

// ============================================
// Check Benefits Schemas
// ============================================

export const checkBenefitsServiceSchema = z.object({
  serviceId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).optional().default(1),
  originalPrice: z.number().min(0),
});

export const checkBenefitsBodySchema = z.object({
  customerId: z.string().uuid(),
  branchId: z.string().uuid(),
  services: z.array(checkBenefitsServiceSchema).min(1),
});

// ============================================
// Apply Benefits Schemas
// ============================================

export const applyMembershipDiscountBodySchema = z.object({
  membershipId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  invoiceItemId: z.string().uuid(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  originalAmount: z.number().min(0),
  discountAmount: z.number().min(0),
  benefitType: z.string(),
  isComplimentary: z.boolean().optional().default(false),
  complimentaryBenefitId: z.string().uuid().nullable().optional(),
});

export const redeemPackageCreditsBodySchema = z.object({
  customerPackageId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  invoiceItemId: z.string().uuid().nullable().optional(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  creditsToUse: z.number().int().min(1).optional(), // For service packages
  valueToUse: z.number().min(0).optional(), // For value packages
  stylistId: z.string().uuid().nullable().optional(),
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

export type CheckBenefitsService = z.infer<typeof checkBenefitsServiceSchema>;
export type CheckBenefitsBody = z.infer<typeof checkBenefitsBodySchema>;
export type ApplyMembershipDiscountBody = z.infer<typeof applyMembershipDiscountBodySchema>;
export type RedeemPackageCreditsBody = z.infer<typeof redeemPackageCreditsBodySchema>;
