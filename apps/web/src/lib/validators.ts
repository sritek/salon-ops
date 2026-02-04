/**
 * Zod Validators
 * 
 * Common validation schemas used across forms in the application.
 */

import { z } from 'zod';

// ============================================
// PRIMITIVE VALIDATORS
// ============================================

/**
 * UUID validator
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Indian phone number validator (10 digits, starts with 6-9)
 */
export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Phone number must be 10 digits starting with 6-9');

/**
 * Email validator
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Password validator (min 8 chars, at least one letter and number)
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Date string validator (YYYY-MM-DD format)
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

/**
 * Time string validator (HH:MM format)
 */
export const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)');

/**
 * Positive number validator
 */
export const positiveNumberSchema = z.number().positive('Must be a positive number');

/**
 * Non-negative number validator
 */
export const nonNegativeNumberSchema = z.number().min(0, 'Cannot be negative');

/**
 * Currency amount validator (positive, max 2 decimals)
 */
export const currencySchema = z
  .number()
  .min(0, 'Amount cannot be negative')
  .multipleOf(0.01, 'Amount can have at most 2 decimal places');

/**
 * Percentage validator (0-100)
 */
export const percentageSchema = z
  .number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

// ============================================
// COMMON FORM SCHEMAS
// ============================================

/**
 * Pagination query params
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

/**
 * Sort query params
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Date range filter
 */
export const dateRangeSchema = z.object({
  from: z.date(),
  to: z.date(),
}).refine(
  (data) => data.from <= data.to,
  'Start date must be before or equal to end date'
);

/**
 * Search query
 */
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
});

// ============================================
// AUTH SCHEMAS
// ============================================

/**
 * Login form
 */
export const loginSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(
  (data) => data.email || data.phone,
  'Either email or phone is required'
);

/**
 * Register form
 */
export const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(255),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

// ============================================
// CUSTOMER SCHEMAS
// ============================================

/**
 * Customer form
 */
export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.date().optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

// ============================================
// SERVICE SCHEMAS
// ============================================

/**
 * Service form
 */
export const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  categoryId: uuidSchema,
  description: z.string().max(1000).optional(),
  duration: z.number().int().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration cannot exceed 8 hours'),
  price: currencySchema,
  isActive: z.boolean().default(true),
});

// ============================================
// APPOINTMENT SCHEMAS
// ============================================

/**
 * Appointment form
 */
export const appointmentSchema = z.object({
  customerId: uuidSchema,
  branchId: uuidSchema,
  stylistId: uuidSchema.optional(),
  appointmentDate: z.date(),
  startTime: timeStringSchema,
  services: z.array(z.object({
    serviceId: uuidSchema,
    variantId: uuidSchema.optional(),
  })).min(1, 'Please select at least one service'),
  notes: z.string().max(500).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type CustomerFormValues = z.infer<typeof customerSchema>;
export type ServiceFormValues = z.infer<typeof serviceSchema>;
export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type SortParams = z.infer<typeof sortSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
