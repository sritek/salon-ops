import { z } from 'zod';

// =====================================================
// ENUMS
// =====================================================

export const timePeriodEnum = z.enum(['morning', 'afternoon', 'evening']);
export type TimePeriod = z.infer<typeof timePeriodEnum>;

export const waitlistStatusEnum = z.enum(['active', 'converted', 'expired', 'removed']);
export type WaitlistStatus = z.infer<typeof waitlistStatusEnum>;

// =====================================================
// CREATE WAITLIST ENTRY
// =====================================================

export const createWaitlistEntrySchema = z
  .object({
    branchId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    customerName: z.string().min(1).max(255),
    customerPhone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Invalid phone number')
      .optional(),
    serviceIds: z.array(z.string().uuid()).min(1, 'At least one service is required'),
    preferredStylistId: z.string().uuid().optional(),
    preferredStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    preferredEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    timePreferences: z.array(timePeriodEnum).min(1, 'At least one time preference is required'),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.preferredStartDate);
      const end = new Date(data.preferredEndDate);
      return start <= end;
    },
    { message: 'End date must be on or after start date' }
  );

export type CreateWaitlistEntryInput = z.infer<typeof createWaitlistEntrySchema>;

// =====================================================
// UPDATE WAITLIST ENTRY
// =====================================================

export const updateWaitlistEntrySchema = z
  .object({
    customerName: z.string().min(1).max(255).optional(),
    customerPhone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Invalid phone number')
      .optional(),
    serviceIds: z.array(z.string().uuid()).min(1).optional(),
    preferredStylistId: z.string().uuid().nullable().optional(),
    preferredStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional(),
    preferredEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional(),
    timePreferences: z.array(timePeriodEnum).min(1).optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.preferredStartDate && data.preferredEndDate) {
        const start = new Date(data.preferredStartDate);
        const end = new Date(data.preferredEndDate);
        return start <= end;
      }
      return true;
    },
    { message: 'End date must be on or after start date' }
  );

export type UpdateWaitlistEntryInput = z.infer<typeof updateWaitlistEntrySchema>;

// =====================================================
// LIST WAITLIST QUERY
// =====================================================

export const listWaitlistQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: waitlistStatusEnum.optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListWaitlistQueryInput = z.input<typeof listWaitlistQuerySchema>;

// =====================================================
// MATCH WAITLIST QUERY
// =====================================================

export const matchWaitlistQuerySchema = z.object({
  branchId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm'),
  durationMinutes: z.coerce.number().int().min(1),
});

export type MatchWaitlistQueryInput = z.infer<typeof matchWaitlistQuerySchema>;

// =====================================================
// CONVERT WAITLIST TO APPOINTMENT
// =====================================================

export const convertWaitlistSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm'),
  stylistId: z.string().uuid().optional(),
});

export type ConvertWaitlistInput = z.infer<typeof convertWaitlistSchema>;

// =====================================================
// PARAM SCHEMAS
// =====================================================

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof idParamSchema>;

// =====================================================
// RESPONSE SCHEMAS
// =====================================================

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

export const paginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});
