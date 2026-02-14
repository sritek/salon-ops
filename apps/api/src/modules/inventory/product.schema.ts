/**
 * Product Schema
 * Zod validation schemas for product catalog API endpoints
 * Requirements: 1.1-1.7, 2.1-2.10, 3.1-3.6
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const productTypeSchema = z.enum(['consumable', 'retail', 'both']);
export const unitOfMeasureSchema = z.enum([
  'ml',
  'gm',
  'pieces',
  'bottles',
  'sachets',
  'tubes',
  'boxes',
]);

// ============================================
// Category Schemas
// ============================================

export const createCategoryBodySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  expiryTrackingEnabled: z.boolean().optional().default(false),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateCategoryBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  expiryTrackingEnabled: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const categoryQuerySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

// ============================================
// Product Schemas
// ============================================

export const createProductBodySchema = z.object({
  categoryId: z.string().uuid(),
  sku: z.string().max(50).nullable().optional(),
  barcode: z.string().max(50).nullable().optional(),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  productType: productTypeSchema,
  unitOfMeasure: unitOfMeasureSchema,
  defaultPurchasePrice: z.number().min(0),
  defaultSellingPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).optional().default(18),
  hsnCode: z.string().max(20).nullable().optional(),
  expiryTrackingEnabled: z.boolean().optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateProductBodySchema = z.object({
  categoryId: z.string().uuid().optional(),
  sku: z.string().max(50).nullable().optional(),
  barcode: z.string().max(50).nullable().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  productType: productTypeSchema.optional(),
  unitOfMeasure: unitOfMeasureSchema.optional(),
  defaultPurchasePrice: z.number().min(0).optional(),
  defaultSellingPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  hsnCode: z.string().max(20).nullable().optional(),
  expiryTrackingEnabled: z.boolean().optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  categoryId: z.string().uuid().optional(),
  productType: productTypeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'sku', 'createdAt', 'defaultSellingPrice']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  branchId: z.string().uuid().optional(),
});

// ============================================
// Branch Product Settings Schemas
// ============================================

export const updateBranchSettingsBodySchema = z.object({
  isEnabled: z.boolean().optional(),
  reorderLevel: z.number().int().min(0).nullable().optional(),
  sellingPriceOverride: z.number().min(0).nullable().optional(),
});

export const bulkUpdateBranchSettingsBodySchema = z.object({
  updates: z.array(
    z.object({
      productId: z.string().uuid(),
      settings: updateBranchSettingsBodySchema,
    })
  ),
});

// ============================================
// Param Schemas
// ============================================

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const productBranchParamsSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
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

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;
export type CategoryQuery = z.infer<typeof categoryQuerySchema>;

export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;

export type UpdateBranchSettingsBody = z.infer<typeof updateBranchSettingsBodySchema>;
export type BulkUpdateBranchSettingsBody = z.infer<typeof bulkUpdateBranchSettingsBodySchema>;
