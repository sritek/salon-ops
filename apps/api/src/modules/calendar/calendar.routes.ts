/**
 * Calendar Routes
 * API route definitions for resource calendar endpoints
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { CalendarService } from './calendar.service';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.guard';
import { prisma } from '../../lib/prisma';
import { successResponse } from '../../lib/response';

import {
  getResourceCalendarSchema,
  moveAppointmentSchema,
  resourceCalendarResponseSchema,
} from './calendar.schema';

export async function calendarRoutes(fastify: FastifyInstance) {
  const calendarService = new CalendarService(prisma);

  // Cast to ZodTypeProvider for type inference
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Apply auth middleware to all routes
  app.addHook('preHandler', authenticate);

  // =====================================================
  // RESOURCE CALENDAR
  // =====================================================

  app.get(
    '/resources',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Calendar'],
        summary: 'Get resource calendar data',
        description: 'Get calendar data with stylists as resources for day/week view.',
        querystring: getResourceCalendarSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: resourceCalendarResponseSchema,
          }),
          400: z.object({
            success: z.literal(false),
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
          401: z.object({
            success: z.literal(false),
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user!;
      const result = await calendarService.getResourceCalendar(tenantId, request.query);
      return reply.send(successResponse(result));
    }
  );

  // =====================================================
  // APPOINTMENT MOVE (DRAG-DROP)
  // =====================================================

  app.patch(
    '/appointments/:id/move',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Calendar'],
        summary: 'Move appointment (drag-drop)',
        description: 'Move an appointment to a new time slot or stylist via drag-drop.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: moveAppointmentSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
          }),
          400: z.object({
            success: z.literal(false),
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
          404: z.object({
            success: z.literal(false),
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
          409: z.object({
            success: z.literal(false),
            error: z.object({
              code: z.string(),
              message: z.string(),
              details: z.any().optional(),
            }),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user!;
      const { id } = request.params;
      const result = await calendarService.moveAppointment(tenantId, id, request.body, userId);
      return reply.send(successResponse(result));
    }
  );
}
