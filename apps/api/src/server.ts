/**
 * Fastify Server Entry Point
 * Based on: .cursor/rules/00-architecture.mdc and .cursor/rules/13-backend-implementation.mdc
 */

import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';

import { env } from './config/env';
import { logger } from './lib/logger';
import authRoutes from './modules/auth/auth.routes';
import servicesRoutes from './modules/services/services.routes';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: env.NODE_ENV === 'development' ? true : [env.APP_URL],
    credentials: true,
  });

  // JWT
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Salon Ops API',
        description: 'API documentation for Salon Management Platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: env.API_URL,
          description: env.NODE_ENV === 'production' ? 'Production' : 'Development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
}

// Register routes
async function registerRoutes() {
  // Health check (no prefix)
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  }));

  // API v1 routes
  fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  fastify.register(servicesRoutes, { prefix: '/api/v1' });

  // Add more route modules here:
  // fastify.register(tenantRoutes, { prefix: '/api/v1/tenants' });
  // fastify.register(customerRoutes, { prefix: '/api/v1/customers' });
  // fastify.register(appointmentRoutes, { prefix: '/api/v1/appointments' });
}

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    await fastify.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`Server running on http://localhost:${env.PORT}`);
    logger.info(`API documentation at http://localhost:${env.PORT}/documentation`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await fastify.close();
    process.exit(0);
  });
});

start();
