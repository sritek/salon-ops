/**
 * Vendor Schema
 * Zod validation schemas for vendor management API endpoints
 * Requirements: 4.1-4.5, 5.1-5.5
 */

import { z } from 'zod';

// ============================================
// Vendor Schemas
// ============================================

export const createVendorBodySchema = z.object({
  name: z.string().min(1).max(255),
  contactPerson: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  email: z.string().email().max(255).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  pincode: z.string().max(10).nullable().optional(),
  gstin: z.string().max(20).nullable().optional(),
  paymentTermsDays: z.number().int().min(0).nullable().optional(),
  leadTimeDays: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateVendorBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contactPerson: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional(),
  email: z.string().email().max(255).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  pincode: z.string().max(10).nullable().optional(),
  gstin: z.string().max(20).nullable().optional(),
  paymentTermsDays: z.number().int().min(0).nullable().optional(),
  leadTimeDays: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const vendorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'lastPurchaseDate']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ============================================
// Vendor-Product Mapping Schemas
// ============================================

export const createVendorProductBodySchema = z.object({
  vendorId: z.string().uuid(),
  productId: z.string().uuid(),
  vendorSku: z.string().max(50).nullable().optional(),
  lastPurchasePrice: z.number().min(0).nullable().optional(),
  isPreferred: z.boolean().optional().default(false),
});

export const updateVendorProductBodySchema = z.object({
  vendorSku: z.string().max(50).nullable().optional(),
  lastPurchasePrice: z.number().min(0).nullable().optional(),
  isPreferred: z.boolean().optional(),
});

// ============================================
// Param Schemas
// ============================================

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const vendorIdParamSchema = z.object({
  vendorId: z.string().uuid(),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});

export const mappingIdParamSchema = z.object({
  mappingId: z.string().uuid(),
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

export type CreateVendorBody = z.infer<typeof createVendorBodySchema>;
export type UpdateVendorBody = z.infer<typeof updateVendorBodySchema>;
export type VendorQuery = z.infer<typeof vendorQuerySchema>;

export type CreateVendorProductBody = z.infer<typeof createVendorProductBodySchema>;
export type UpdateVendorProductBody = z.infer<typeof updateVendorProductBodySchema>;
