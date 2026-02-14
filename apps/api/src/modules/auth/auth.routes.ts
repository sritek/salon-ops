/**
 * Auth Routes
 * Route definitions for authentication module using Zod type provider
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { authController } from './auth.controller';
import {
  loginBodySchema,
  loginResponseSchema,
  refreshTokenBodySchema,
  refreshResponseSchema,
  registerBodySchema,
  registerResponseSchema,
  meResponseSchema,
  logoutBodySchema,
  logoutResponseSchema,
} from './auth.schema';
import { errorResponseSchema } from '../../lib/fastify-zod';

export default async function authRoutes(fastify: FastifyInstance) {
  // Cast to ZodTypeProvider for type inference
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /auth/login
  app.post(
    '/login',
    {
      schema: {
        description: 'Login with email/phone and password',
        tags: ['Auth'],
        body: loginBodySchema,
        response: {
          200: loginResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return authController.login(request as any, reply);
    }
  );

  // POST /auth/register
  app.post(
    '/register',
    {
      schema: {
        description: 'Register a new tenant and owner',
        tags: ['Auth'],
        body: registerBodySchema,
        response: {
          201: registerResponseSchema,
          400: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return authController.register(request as any, reply);
    }
  );

  // POST /auth/refresh
  app.post(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token',
        tags: ['Auth'],
        body: refreshTokenBodySchema,
        response: {
          200: refreshResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return authController.refresh(request as any, reply);
    }
  );

  // GET /auth/me
  app.get(
    '/me',
    {
      schema: {
        description: 'Get current user profile',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: meResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return authController.me(request as any, reply);
    }
  );

  // POST /auth/logout
  app.post(
    '/logout',
    {
      schema: {
        description: 'Logout current user and revoke refresh token',
        tags: ['Auth'],
        body: logoutBodySchema,
        response: {
          200: logoutResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return authController.logout(request as any, reply);
    }
  );

  // POST /auth/logout-all
  app.post(
    '/logout-all',
    {
      schema: {
        description: 'Logout from all devices (revoke all refresh tokens)',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: logoutResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return authController.logoutAll(request as any, reply);
    }
  );
}
