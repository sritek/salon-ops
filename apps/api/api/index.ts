/**
 * Vercel Serverless Entry Point for Fastify API
 *
 * This file adapts the Fastify app for Vercel's serverless runtime.
 * It registers all the same plugins and routes as server.ts but exports
 * a handler instead of calling fastify.listen().
 */

import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
    serializerCompiler,
    validatorCompiler,
    ZodTypeProvider,
    jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import Fastify from 'fastify';

import { env } from '../src/config/env';
import authRoutes from '../src/modules/auth/auth.routes';
import servicesRoutes from '../src/modules/services/services.routes';
import customersRoutes from '../src/modules/customers/customers.routes';
import { appointmentsRoutes } from '../src/modules/appointments';
import { billingRoutes } from '../src/modules/billing';
import { checkoutRoutes } from '../src/modules/checkout';
import { staffRoutes } from '../src/modules/staff';
import productRoutes from '../src/modules/inventory/product.routes';
import vendorRoutes from '../src/modules/inventory/vendor.routes';
import purchaseOrderRoutes from '../src/modules/inventory/purchase-order.routes';
import goodsReceiptRoutes from '../src/modules/inventory/goods-receipt.routes';
import stockRoutes from '../src/modules/inventory/stock.routes';
import transferRoutes from '../src/modules/inventory/transfer.routes';
import auditRoutes from '../src/modules/inventory/audit.routes';
import serviceConsumableRoutes from '../src/modules/inventory/service-consumable.routes';
import {
    membershipPlanRoutes,
    packageRoutes,
    customerMembershipRoutes,
    customerPackageRoutes,
    redemptionRoutes,
    membershipConfigRoutes,
} from '../src/modules/memberships';
import { dashboardRoutes } from '../src/modules/dashboard';
import { calendarRoutes } from '../src/modules/calendar';
import { realTimeRoutes } from '../src/modules/real-time';
import { searchRoutes } from '../src/modules/search';

// Build and cache the Fastify app across warm serverless invocations
let appReady: Promise<typeof fastify> | null = null;

const fastify = Fastify({
    logger: false, // Disable pino-pretty in serverless; use console logging
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Identical error handler from server.ts
fastify.setErrorHandler((error, request, reply) => {
    if (error.code === 'FST_ERR_VALIDATION') {
        let details: Array<{ field: string; message: string }> = [];
        try {
            const zodErrors = JSON.parse(error.message);
            details = zodErrors.map((err: any) => ({
                field: err.path?.join('.') || 'unknown',
                message: err.message || 'Validation failed',
            }));
        } catch {
            details = [{ field: 'unknown', message: error.message }];
        }
        return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details },
        });
    }

    if (error.validation) {
        return reply.status(400).send({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input data',
                details: error.validation.map((err: any) => ({
                    field: err.instancePath?.replace(/^\//, '') || err.params?.missingProperty || 'unknown',
                    message: err.message || 'Validation failed',
                })),
            },
        });
    }

    if (error.statusCode) {
        const response: any = {
            success: false,
            error: { code: error.code || 'ERROR', message: error.message },
        };
        if ('details' in error && error.details) response.error.details = error.details;
        return reply.status(error.statusCode).send(response);
    }

    request.log.error(error);
    return reply.status(500).send({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        },
    });
});

async function buildApp() {
    // CORS
    await fastify.register(cors, {
        origin: env.NODE_ENV === 'development' ? true : [env.APP_URL],
        credentials: true,
    });

    // JWT
    await fastify.register(jwt, { secret: env.JWT_SECRET });

    // Swagger
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
                    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                },
            },
        },
        transform: jsonSchemaTransform,
    });

    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: { docExpansion: 'list', deepLinking: false },
    });

    // Health check
    fastify.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    }));

    // API routes — identical to server.ts
    fastify.register(authRoutes, { prefix: '/api/v1/auth' });
    fastify.register(servicesRoutes, { prefix: '/api/v1' });
    fastify.register(customersRoutes, { prefix: '/api/v1' });
    fastify.register(appointmentsRoutes, { prefix: '/api/v1/appointments' });
    fastify.register(billingRoutes, { prefix: '/api/v1/invoices' });
    fastify.register(checkoutRoutes, { prefix: '/api/v1/checkout' });
    fastify.register(staffRoutes, { prefix: '/api/v1/staff' });
    fastify.register(productRoutes, { prefix: '/api/v1' });
    fastify.register(vendorRoutes, { prefix: '/api/v1' });
    fastify.register(purchaseOrderRoutes, { prefix: '/api/v1' });
    fastify.register(goodsReceiptRoutes, { prefix: '/api/v1' });
    fastify.register(stockRoutes, { prefix: '/api/v1' });
    fastify.register(transferRoutes, { prefix: '/api/v1' });
    fastify.register(auditRoutes, { prefix: '/api/v1' });
    fastify.register(serviceConsumableRoutes, { prefix: '/api/v1' });
    fastify.register(membershipPlanRoutes, { prefix: '/api/v1' });
    fastify.register(packageRoutes, { prefix: '/api/v1' });
    fastify.register(customerMembershipRoutes, { prefix: '/api/v1' });
    fastify.register(customerPackageRoutes, { prefix: '/api/v1' });
    fastify.register(redemptionRoutes, { prefix: '/api/v1' });
    fastify.register(membershipConfigRoutes, { prefix: '/api/v1' });
    fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });
    fastify.register(calendarRoutes, { prefix: '/api/v1/calendar' });
    fastify.register(realTimeRoutes, { prefix: '/api/v1/events' });
    fastify.register(searchRoutes, { prefix: '/api/v1' });

    await fastify.ready();
    return fastify;
}

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Initialise Fastify once per cold start, reuse on warm invocations
    if (!appReady) {
        appReady = buildApp();
    }
    await appReady;

    // Bridge Vercel's IncomingMessage → Fastify
    fastify.server.emit('request', req, res);
}
