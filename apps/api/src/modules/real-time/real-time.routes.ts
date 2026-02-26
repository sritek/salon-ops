/**
 * Real-Time Routes (Conditional)
 * SSE endpoint for real-time updates
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.1
 *
 * When ENABLE_REDIS is false:
 * - Health endpoint returns sseAvailable=false
 * - Stream endpoint returns 503 Service Unavailable
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { authenticate } from '@/middleware/auth.middleware';
import { successResponse, errorResponse } from '@/lib/response';
import { logger } from '@/lib/logger';
import { realTimeService } from './real-time.service';
import { streamQuerySchema, type SSEEvent } from './real-time.schema';

// Heartbeat interval in milliseconds
const HEARTBEAT_INTERVAL = 30000;

export async function realTimeRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/v1/events/health
   * Health check endpoint for SSE availability
   * Returns sseAvailable=false when Redis is disabled
   */
  app.get(
    '/health',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Real-Time'],
        summary: 'Check SSE endpoint availability',
        description: 'Returns health status of the real-time events service.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send(
        successResponse({
          status: realTimeService.isEnabled ? 'healthy' : 'disabled',
          sseAvailable: realTimeService.isEnabled,
          timestamp: new Date().toISOString(),
        })
      );
    }
  );

  /**
   * GET /api/v1/events/stream
   * Server-Sent Events endpoint for real-time updates
   * Returns 503 when Redis is disabled
   */
  app.get(
    '/stream',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Real-Time'],
        summary: 'SSE stream for real-time updates',
        description:
          'Server-Sent Events endpoint that streams real-time updates for appointments, walk-ins, and notifications.',
        querystring: streamQuerySchema,
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Return 503 when Redis is disabled
      if (!realTimeService.isEnabled) {
        return reply
          .status(503)
          .send(
            errorResponse(
              'SERVICE_UNAVAILABLE',
              'Real-time features are disabled. SSE streaming is not available.'
            )
          );
      }

      const { tenantId, branchIds } = request.user!;
      const query = request.query as { lastEventId?: string; branchId?: string };

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Helper to write SSE event
      const writeEvent = (event: SSEEvent) => {
        // Filter by branch if user is branch-scoped or specific branch requested
        const targetBranches = query.branchId ? [query.branchId] : branchIds;
        if (targetBranches.length > 0 && !targetBranches.includes(event.branchId)) {
          return;
        }

        reply.raw.write(`id: ${event.id}\n`);
        reply.raw.write(`event: ${event.type}\n`);
        reply.raw.write(`data: ${JSON.stringify(event.data)}\n\n`);
      };

      // Send missed events if lastEventId provided
      if (query.lastEventId) {
        try {
          const missedEvents = await realTimeService.getMissedEvents(tenantId, query.lastEventId);
          for (const event of missedEvents) {
            writeEvent(event);
          }
        } catch (err) {
          logger.error(
            { err, tenantId, lastEventId: query.lastEventId },
            'Failed to get missed events'
          );
        }
      }

      // Subscribe to tenant events
      const unsubscribe = await realTimeService.subscribeToTenant(tenantId, writeEvent);

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        reply.raw.write(`: heartbeat\n\n`);
      }, HEARTBEAT_INTERVAL);

      // Cleanup on disconnect
      request.raw.on('close', () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        logger.debug({ tenantId }, 'SSE connection closed');
      });

      // Don't end the response - keep it open for SSE
      // The connection will be closed when the client disconnects
    }
  );
}

export default realTimeRoutes;
