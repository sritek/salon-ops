/**
 * Users Schemas
 * Zod schemas for user management validation
 */

import { z } from 'zod';

// Valid roles that can be created by users (super_owner is admin-created only)
const createableRoles = [
  'regional_manager',
  'branch_manager',
  'receptionist',
  'stylist',
  'accountant',
] as const;

// Branch assignment schema
const branchAssignmentSchema = z.object({
  branchId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
});

// Create user body schema
export const createUserBodySchema = z.object({
  name: z.string().min(2).max(255),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  email: z.string().email().optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(createableRoles),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  branchAssignments: z
    .array(branchAssignmentSchema)
    .min(1, 'At least one branch assignment is required'),
});

// Update user body schema
export const updateUserBodySchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional().nullable(),
  role: z.enum(createableRoles).optional(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  isActive: z.boolean().optional(),
  branchAssignments: z.array(branchAssignmentSchema).min(1).optional(),
});

// List users query schema
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().uuid().optional(),
  role: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

// Change password body schema
export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Type exports
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
