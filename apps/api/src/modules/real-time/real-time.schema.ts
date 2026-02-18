/**
 * Real-Time Event Schemas
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.1
 */

import { z } from 'zod';

// Event types for real-time updates
export const eventTypeSchema = z.enum([
  'appointment.created',
  'appointment.updated',
  'appointment.status_changed',
  'appointment.cancelled',
  'customer.checked_in',
  'walk_in.added',
  'walk_in.called',
  'walk_in.status_changed',
  'invoice.created',
  'invoice.paid',
  'notification.new',
  'heartbeat',
]);

export type EventType = z.infer<typeof eventTypeSchema>;

// SSE Event structure
export const sseEventSchema = z.object({
  id: z.string(),
  type: eventTypeSchema,
  data: z.any(),
  timestamp: z.string().datetime(),
  branchId: z.string().uuid(),
  tenantId: z.string().uuid(),
});

export type SSEEvent = z.infer<typeof sseEventSchema>;

// Query params for SSE stream
export const streamQuerySchema = z.object({
  lastEventId: z.string().optional(),
  branchId: z.string().uuid().optional(),
});

export type StreamQuery = z.infer<typeof streamQuerySchema>;
