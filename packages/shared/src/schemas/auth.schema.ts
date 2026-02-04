/**
 * Authentication Zod Schemas
 */

import { z } from 'zod';

import { emailSchema, passwordSchema, phoneSchema } from './common.schema';

/**
 * Login request schema
 */
export const loginSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: passwordSchema,
}).refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone is required' }
);

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Register request schema
 */
export const registerSchema = z.object({
  businessName: z.string().min(2).max(255),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Refresh token request schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Forgot password request schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone is required' }
);

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password request schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Change password request schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  { message: 'New password must be different from current password', path: ['newPassword'] }
);

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
