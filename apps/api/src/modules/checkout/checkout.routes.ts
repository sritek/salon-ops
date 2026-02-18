/**
 * Checkout Routes
 * API endpoints for checkout operations
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6
 */

import type { FastifyInstance } from 'fastify';
import { PERMISSIONS } from '@salon-ops/shared';
import { authenticate, requirePermission } from '../../middleware';
import {
  startCheckout,
  getSession,
  addItem,
  removeItem,
  applyDiscount,
  removeDiscount,
  processPayment,
  completeCheckout,
} from './checkout.controller';

export async function checkoutRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ============================================
  // Checkout Session Management
  // ============================================

  // Start checkout session
  fastify.post(
    '/start',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    startCheckout
  );

  // Get checkout session
  fastify.get(
    '/:sessionId',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_READ),
    },
    getSession
  );

  // ============================================
  // Item Management
  // ============================================

  // Add item to checkout
  fastify.post(
    '/add-item',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    addItem
  );

  // Remove item from checkout
  fastify.post(
    '/remove-item',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    removeItem
  );

  // ============================================
  // Discount Management
  // ============================================

  // Apply discount
  fastify.post(
    '/apply-discount',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    applyDiscount
  );

  // Remove discount
  fastify.post(
    '/remove-discount',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    removeDiscount
  );

  // ============================================
  // Payment Processing
  // ============================================

  // Process payment
  fastify.post(
    '/process-payment',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    processPayment
  );

  // ============================================
  // Checkout Completion
  // ============================================

  // Complete checkout and generate invoice
  fastify.post(
    '/complete',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    completeCheckout
  );
}
