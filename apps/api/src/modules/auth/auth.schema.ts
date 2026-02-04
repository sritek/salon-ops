/**
 * Auth Module Schemas
 * Zod validation schemas for auth endpoints
 */

import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid phone number')
    .optional(),
  password: z.string().min(6),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const registerBodySchema = z.object({
  businessName: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  password: z.string().min(8),
  name: z.string().min(2).max(255),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
