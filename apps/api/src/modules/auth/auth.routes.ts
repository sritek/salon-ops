/**
 * Auth Routes
 * Route definitions for authentication module
 */

import type { FastifyInstance } from 'fastify';

import { authController } from './auth.controller';
import {
  loginBodySchema,
  refreshTokenBodySchema,
  registerBodySchema,
} from './auth.schema';

import type {
  LoginBody,
  RefreshTokenBody,
  RegisterBody,
} from './auth.schema';

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/login
  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        description: 'Login with email/phone and password',
        tags: ['Auth'],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', pattern: '^[6-9]\\d{9}$' },
            password: { type: 'string', minLength: 6 },
          },
          required: ['password'],
        },
        // Note: Response schema intentionally omitted to allow full user/tenant objects
        // Fastify's JSON schema serialization strips properties not defined in response schema
      },
      preHandler: async (request, reply) => {
        const result = loginBodySchema.safeParse(request.body);
        if (!result.success) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
              details: result.error.errors,
            },
          });
        }
      },
    },
    authController.login.bind(authController)
  );

  // POST /auth/register
  fastify.post<{ Body: RegisterBody }>(
    '/register',
    {
      schema: {
        description: 'Register a new tenant and owner',
        tags: ['Auth'],
        body: {
          type: 'object',
          properties: {
            businessName: { type: 'string', minLength: 2, maxLength: 255 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', pattern: '^[6-9]\\d{9}$' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 2, maxLength: 255 },
          },
          required: ['businessName', 'email', 'phone', 'password', 'name'],
        },
      },
      preHandler: async (request, reply) => {
        const result = registerBodySchema.safeParse(request.body);
        if (!result.success) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
              details: result.error.errors,
            },
          });
        }
      },
    },
    authController.register.bind(authController)
  );

  // POST /auth/refresh
  fastify.post<{ Body: RefreshTokenBody }>(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token',
        tags: ['Auth'],
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
          required: ['refreshToken'],
        },
      },
      preHandler: async (request, reply) => {
        const result = refreshTokenBodySchema.safeParse(request.body);
        if (!result.success) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
              details: result.error.errors,
            },
          });
        }
      },
    },
    authController.refresh.bind(authController)
  );

  // GET /auth/me
  fastify.get(
    '/me',
    {
      schema: {
        description: 'Get current user profile',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
      },
    },
    authController.me.bind(authController)
  );

  // POST /auth/logout
  fastify.post<{ Body: { refreshToken?: string } }>(
    '/logout',
    {
      schema: {
        description: 'Logout current user and revoke refresh token',
        tags: ['Auth'],
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    authController.logout.bind(authController)
  );

  // POST /auth/logout-all
  fastify.post(
    '/logout-all',
    {
      schema: {
        description: 'Logout from all devices (revoke all refresh tokens)',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
      },
    },
    authController.logoutAll.bind(authController)
  );
}
