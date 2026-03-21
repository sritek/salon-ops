/**
 * Internal Admin Middleware
 * Authentication for internal admin portal
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../../config/env';
import { UnauthorizedError } from '../../lib/errors';

/**
 * Admin JWT payload structure
 */
export interface AdminJwtPayload {
  type: 'internal_admin';
  email: string;
}

/**
 * Verify internal admin credentials
 */
export function verifyAdminCredentials(email: string, password: string): boolean {
  return email === env.INTERNAL_ADMIN_EMAIL && password === env.INTERNAL_ADMIN_PASSWORD;
}

/**
 * Admin authentication middleware
 * Verifies JWT token is for internal admin
 */
export async function authenticateAdmin(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const decoded = await request.jwtVerify<AdminJwtPayload>();

    if (decoded.type !== 'internal_admin') {
      throw new UnauthorizedError('INVALID_TOKEN', 'Invalid admin token');
    }

    // Attach admin info to request
    (request as any).admin = {
      email: decoded.email,
    };
  } catch (err) {
    throw new UnauthorizedError('INVALID_TOKEN', 'Invalid or expired admin token');
  }
}
