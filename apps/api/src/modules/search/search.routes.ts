/**
 * Global Search Routes
 * Searches across customers, appointments, and invoices
 * Requirements: 12.1, 12.2
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '@/middleware';
import { successResponse } from '@/lib/response';
import { searchService } from './search.service';

const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export async function searchRoutes(fastify: FastifyInstance) {
  // Global search endpoint
  fastify.get(
    '/search',
    {
      preHandler: [authenticate],
      schema: {
        querystring: searchQuerySchema,
      },
    },
    async (request, reply) => {
      const { q, limit } = request.query as z.infer<typeof searchQuerySchema>;
      const { tenantId, branchIds } = request.user!;

      const results = await searchService.search({
        query: q,
        tenantId,
        branchIds,
        limit,
      });

      return reply.send(successResponse(results));
    }
  );
}
