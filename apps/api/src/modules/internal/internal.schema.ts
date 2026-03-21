/**
 * Internal Admin Portal Schemas
 * For company-only tenant provisioning
 */

import { z } from 'zod';

// Admin login
export const adminLoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;

export const adminLoginResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    admin: z.object({
      email: z.string(),
    }),
  }),
});

// Create tenant
export const createTenantBodySchema = z.object({
  name: z.string().min(2).max(255),
  legalName: z.string().max(255).optional(),
  email: z.string().email(),
  phone: z.string().min(10).max(20).optional(),
  logoUrl: z.string().url().optional(),
  subscriptionPlan: z.enum(['trial', 'basic', 'professional', 'enterprise']).default('trial'),
  trialDays: z.number().int().min(0).max(90).default(14),
});

export type CreateTenantBody = z.infer<typeof createTenantBodySchema>;

// Create branch
export const createBranchBodySchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(255),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  gstin: z.string().max(20).optional(),
});

export type CreateBranchBody = z.infer<typeof createBranchBodySchema>;

// Create super owner
export const createSuperOwnerBodySchema = z.object({
  tenantId: z.string().uuid(),
  branchId: z.string().uuid(),
  name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  password: z.string().min(8).max(100),
});

export type CreateSuperOwnerBody = z.infer<typeof createSuperOwnerBodySchema>;

// List tenants query
export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;

// Update tenant
export const updateTenantBodySchema = z.object({
  name: z.string().min(2).max(255).optional(),
  legalName: z.string().max(255).optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  subscriptionPlan: z.enum(['trial', 'basic', 'professional', 'enterprise']).optional(),
  subscriptionStatus: z.enum(['active', 'inactive', 'suspended', 'cancelled']).optional(),
});

export type UpdateTenantBody = z.infer<typeof updateTenantBodySchema>;

// Response schemas
export const tenantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  legalName: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  subscriptionPlan: z.string(),
  subscriptionStatus: z.string(),
  trialEndsAt: z.string().nullable(),
  createdAt: z.string(),
});

export const branchResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  slug: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  pincode: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  gstin: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const userResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
