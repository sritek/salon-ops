/**
 * Common Zod Schemas
 */

import { z } from 'zod';

/**
 * UUID schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Phone number schema (Indian 10-digit)
 */
export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Phone number must be a valid 10-digit Indian mobile number');

/**
 * Email schema
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Date string schema (YYYY-MM-DD)
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Time string schema (HH:MM)
 */
export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format (24-hour)');

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Search schema
 */
export const searchSchema = z.object({
  search: z.string().max(100).optional(),
});

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Password schema with requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters');
