/**
 * Tenant Schemas
 * Zod schemas for tenant validation
 */

import { z } from 'zod';

// Usage statistics schema
const usageStatsSchema = z.object({
  branches: z.object({
    current: z.number(),
    max: z.number(),
  }),
  users: z.object({
    current: z.number(),
    max: z.number(),
  }),
});

// Tenant response schema
export const getTenantResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  legalName: z.string().nullable(),
  email: z.string().email(),
  phone: z.string().nullable(),
  logoUrl: z.string().nullable(),
  subscriptionPlan: z.string(),
  subscriptionStatus: z.string(),
  trialEndsAt: z.string().datetime().nullable(),
  usage: usageStatsSchema,
});

// Update tenant body schema
export const updateTenantBodySchema = z.object({
  name: z.string().min(2).max(255).optional(),
  legalName: z.string().max(255).optional().nullable(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
    .optional()
    .nullable(),
  logoUrl: z.string().url().optional().nullable(),
});

// Type exports
export type GetTenantResponse = z.infer<typeof getTenantResponseSchema>;
export type UpdateTenantBody = z.infer<typeof updateTenantBodySchema>;
