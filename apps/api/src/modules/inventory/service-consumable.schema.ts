/**
 * Service Consumable Zod Schemas
 * Request/response validation for service-product mapping endpoints
 */

import { z } from 'zod';

// ============================================
// Request Schemas
// ============================================

export const createMappingSchema = z.object({
  serviceId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityPerService: z.number().positive(),
  isActive: z.boolean().default(true),
});

export const updateMappingSchema = z.object({
  quantityPerService: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// Response Schemas
// ============================================

export const productSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sku: z.string().nullable(),
  unitOfMeasure: z.string(),
});

export const serviceConsumableMappingSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  serviceId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityPerService: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const serviceConsumableMappingWithProductSchema = serviceConsumableMappingSchema.extend({
  product: productSummarySchema.optional(),
});

// ============================================
// API Response Schemas
// ============================================

export const mappingResponseSchema = z.object({
  success: z.literal(true),
  data: serviceConsumableMappingWithProductSchema,
});

export const mappingListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(serviceConsumableMappingWithProductSchema),
});

// ============================================
// Type Exports
// ============================================

export type CreateMappingInput = z.infer<typeof createMappingSchema>;
export type UpdateMappingInput = z.infer<typeof updateMappingSchema>;
