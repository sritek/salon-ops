/**
 * Package Schema
 * Zod validation schemas for package API endpoints
 * Requirements: 2.1, 2.2
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const packageTypeSchema = z.enum(['service_package', 'value_package', 'combo_package']);
export const validityUnitSchema = z.enum(['days', 'months', 'years']);
export const branchScopeSchema = z.enum(['all_branches', 'specific_branches']);
export const commissionTypeSchema = z.enum(['percentage', 'flat']);

// ============================================
// Package Service Schemas
// ============================================

export const packageServiceSchema = z.object({
  serviceId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  creditCount: z.number().int().min(1),
});

// ============================================
// Package Schemas
// ============================================

export const createPackageBodySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(20).nullable().optional(),
  description: z.string().nullable().optional(),
  packageType: packageTypeSchema,
  price: z.number().min(0),
  mrp: z.number().min(0).nullable().optional(),
  gstRate: z.number().min(0).max(100).optional().default(18),
  creditValue: z.number().min(0).nullable().optional(), // For value packages
  validityValue: z.number().int().min(1),
  validityUnit: validityUnitSchema,
  branchScope: branchScopeSchema.optional().default('all_branches'),
  branchIds: z.array(z.string().uuid()).optional(),
  allowRollover: z.boolean().optional().default(false),
  termsAndConditions: z.string().nullable().optional(),
  saleCommissionType: commissionTypeSchema.nullable().optional(),
  saleCommissionValue: z.number().min(0).nullable().optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  services: z.array(packageServiceSchema).optional(), // For service/combo packages
});

export const updatePackageBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(20).nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().min(0).optional(),
  mrp: z.number().min(0).nullable().optional(),
  gstRate: z.number().min(0).max(100).optional(),
  creditValue: z.number().min(0).nullable().optional(),
  validityValue: z.number().int().min(1).optional(),
  validityUnit: validityUnitSchema.optional(),
  branchScope: branchScopeSchema.optional(),
  branchIds: z.array(z.string().uuid()).optional(),
  allowRollover: z.boolean().optional(),
  termsAndConditions: z.string().nullable().optional(),
  saleCommissionType: commissionTypeSchema.nullable().optional(),
  saleCommissionValue: z.number().min(0).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  services: z.array(packageServiceSchema).optional(),
});

export const packageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  packageType: packageTypeSchema.optional(),
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

export type PackageServiceInput = z.infer<typeof packageServiceSchema>;
export type CreatePackageBody = z.infer<typeof createPackageBodySchema>;
export type UpdatePackageBody = z.infer<typeof updatePackageBodySchema>;
export type PackageQuery = z.infer<typeof packageQuerySchema>;
