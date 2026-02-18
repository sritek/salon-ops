/**
 * Checkout Service
 * Core business logic for checkout session management
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';
import redis from '../../lib/redis';
import { BadRequestError, NotFoundError } from '../../lib/errors';
import { billingService } from '../billing/billing.service';
import type {
  StartCheckoutInput,
  AddItemInput,
  ApplyDiscountInput,
  ProcessPaymentInput,
  CompleteCheckoutInput,
  CheckoutSession,
  CheckoutLineItem,
  AppliedDiscount,
  PaymentEntry,
  CheckoutTotals,
  AvailableDiscount,
  CustomerInfo,
  MembershipInfo,
  PackageInfo,
} from './checkout.schema';

// ============================================
// Constants
// ============================================

const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes
const SESSION_KEY_PREFIX = 'checkout:session:';

// ============================================
// Types
// ============================================

interface TenantContext {
  tenantId: string;
  branchId?: string;
  userId: string;
}

// ============================================
// Helper Functions
// ============================================

function getSessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

function calculateTotals(
  lineItems: CheckoutLineItem[],
  appliedDiscounts: AppliedDiscount[],
  payments: PaymentEntry[],
  tipAmount: number = 0
): CheckoutTotals {
  // Calculate subtotal from line items
  const subtotal = lineItems.reduce((sum, item) => sum + item.grossAmount, 0);

  // Calculate discount total
  const discountTotal = appliedDiscounts.reduce((sum, d) => sum + d.amount, 0);

  // Calculate taxable amount
  const taxableAmount = subtotal - discountTotal;

  // Calculate taxes
  const cgstAmount = lineItems.reduce((sum, item) => sum + item.cgstAmount, 0);
  const sgstAmount = lineItems.reduce((sum, item) => sum + item.sgstAmount, 0);
  const igstAmount = lineItems.reduce((sum, item) => sum + item.igstAmount, 0);
  const taxTotal = cgstAmount + sgstAmount + igstAmount;

  // Calculate grand total
  const grandTotal = Math.round(taxableAmount + taxTotal + tipAmount);

  // Calculate amount paid
  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate amount due
  const amountDue = Math.max(0, grandTotal - amountPaid);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    loyaltyDiscount: 0,
    walletUsed: 0,
    tipAmount,
    grandTotal,
    amountPaid: Math.round(amountPaid * 100) / 100,
    amountDue: Math.round(amountDue * 100) / 100,
  };
}

// ============================================
// Checkout Service
// ============================================

export const checkoutService = {
  /**
   * Start a new checkout session
   * Requirements: 6.2
   */
  async startCheckout(input: StartCheckoutInput, ctx: TenantContext): Promise<CheckoutSession> {
    const { tenantId } = ctx;
    const { branchId, appointmentId, customerId } = input;

    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

    // Initialize session data
    let customer: CustomerInfo | undefined;
    let lineItems: CheckoutLineItem[] = [];
    const activeMemberships: MembershipInfo[] = [];
    const activePackages: PackageInfo[] = [];
    const availableDiscounts: AvailableDiscount[] = [];

    // If appointmentId provided, fetch appointment and pre-populate services
    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, tenantId, deletedAt: null },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              walletBalance: true,
              loyaltyPoints: true,
            },
          },
          services: {
            include: {
              service: {
                include: {
                  branchPrices: { where: { branchId } },
                },
              },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
      }

      // Set customer from appointment
      if (appointment.customer) {
        const loyaltyConfig = await prisma.loyaltyConfig.findUnique({
          where: { tenantId },
        });

        customer = {
          id: appointment.customer.id,
          name: appointment.customer.name,
          phone: appointment.customer.phone,
          email: appointment.customer.email || undefined,
          walletBalance: Number(appointment.customer.walletBalance),
          loyaltyPoints: appointment.customer.loyaltyPoints,
          loyaltyPointValue: loyaltyConfig?.redemptionValuePerPoint
            ? Number(loyaltyConfig.redemptionValuePerPoint)
            : 0,
        };

        // Fetch customer memberships and packages
        const [memberships, packages] = await Promise.all([
          this.getCustomerMemberships(tenantId, customer.id),
          this.getCustomerPackages(tenantId, customer.id),
        ]);

        activeMemberships.push(...memberships);
        activePackages.push(...packages);

        // Build available discounts from memberships
        for (const membership of memberships) {
          for (const benefit of membership.benefits) {
            availableDiscounts.push({
              id: `membership:${membership.id}:${benefit.id}`,
              type: 'membership',
              name: `${membership.planName} - ${benefit.benefitType}`,
              description: `${benefit.discountValue}${benefit.discountType === 'percentage' ? '%' : '₹'} off`,
              discountType: benefit.discountType as 'percentage' | 'flat',
              value: benefit.discountValue,
              applicableTo:
                benefit.applicableServices.length > 0 ? benefit.applicableServices : 'services',
              isAutoApplied: false,
            });
          }
        }

        // Build available discounts from packages
        for (const pkg of packages) {
          for (const credit of pkg.credits) {
            if (credit.remainingCredits > 0) {
              availableDiscounts.push({
                id: `package:${pkg.id}:${credit.id}`,
                type: 'package',
                name: `${pkg.packageName} Credit`,
                description: `${credit.remainingCredits} credits remaining${credit.serviceName ? ` for ${credit.serviceName}` : ''}`,
                discountType: 'flat',
                value: 0, // Package credits are service-specific
                applicableTo: credit.serviceId ? [credit.serviceId] : 'services',
                isAutoApplied: false,
              });
            }
          }
        }

        // Add loyalty points as available discount
        if (customer.loyaltyPoints > 0 && customer.loyaltyPointValue > 0) {
          availableDiscounts.push({
            id: 'loyalty:points',
            type: 'loyalty',
            name: 'Loyalty Points',
            description: `${customer.loyaltyPoints} points (₹${(customer.loyaltyPoints * customer.loyaltyPointValue).toFixed(2)} value)`,
            discountType: 'flat',
            value: customer.loyaltyPoints * customer.loyaltyPointValue,
            applicableTo: 'all',
            isAutoApplied: false,
          });
        }
      }

      // Pre-populate line items from appointment services
      for (const aptService of appointment.services) {
        const service = aptService.service;
        const branchPrice = service.branchPrices[0];
        const unitPrice = branchPrice?.price
          ? Number(branchPrice.price)
          : Number(service.basePrice);
        const quantity = aptService.quantity || 1;
        const grossAmount = unitPrice * quantity;
        const taxRate = Number(service.taxRate);
        const taxAmount = grossAmount * (taxRate / 100);

        // Split GST (assuming intra-state by default)
        const cgstRate = taxRate / 2;
        const sgstRate = taxRate / 2;
        const cgstAmount = taxAmount / 2;
        const sgstAmount = taxAmount / 2;

        // Commission
        const commissionType = branchPrice?.commissionType || service.commissionType;
        const commissionValue = branchPrice?.commissionValue
          ? Number(branchPrice.commissionValue)
          : Number(service.commissionValue);
        let commissionAmount = 0;
        if (commissionType === 'percentage') {
          commissionAmount = (grossAmount * commissionValue) / 100;
        } else if (commissionType === 'flat') {
          commissionAmount = commissionValue * quantity;
        }

        lineItems.push({
          id: randomUUID(),
          itemType: 'service',
          referenceId: service.id,
          referenceSku: service.sku,
          name: service.name,
          description: service.description || undefined,
          unitPrice,
          quantity,
          grossAmount,
          discountAmount: 0,
          taxRate,
          taxableAmount: grossAmount,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate: 0,
          igstAmount: 0,
          totalTax: taxAmount,
          netAmount: grossAmount + taxAmount,
          hsnSacCode: service.hsnSacCode || undefined,
          stylistId: aptService.stylistId || undefined,
          commissionType,
          commissionRate: commissionValue,
          commissionAmount,
        });
      }
    } else if (customerId) {
      // Fetch customer directly
      const customerData = await prisma.customer.findFirst({
        where: { id: customerId, tenantId, deletedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          walletBalance: true,
          loyaltyPoints: true,
        },
      });

      if (!customerData) {
        throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
      }

      const loyaltyConfig = await prisma.loyaltyConfig.findUnique({
        where: { tenantId },
      });

      customer = {
        id: customerData.id,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || undefined,
        walletBalance: Number(customerData.walletBalance),
        loyaltyPoints: customerData.loyaltyPoints,
        loyaltyPointValue: loyaltyConfig?.redemptionValuePerPoint
          ? Number(loyaltyConfig.redemptionValuePerPoint)
          : 0,
      };

      // Fetch customer memberships and packages
      const [memberships, packages] = await Promise.all([
        this.getCustomerMemberships(tenantId, customer.id),
        this.getCustomerPackages(tenantId, customer.id),
      ]);

      activeMemberships.push(...memberships);
      activePackages.push(...packages);
    }

    // Calculate initial totals
    const totals = calculateTotals(lineItems, [], [], 0);

    // Create session object
    const session: CheckoutSession = {
      id: sessionId,
      tenantId,
      branchId,
      appointmentId,
      customer,
      lineItems,
      appliedDiscounts: [],
      payments: [],
      totals,
      availableDiscounts,
      activeMemberships,
      activePackages,
      isIgst: false,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Store session in Redis
    await redis.setex(getSessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(session));

    return session;
  },

  /**
   * Get checkout session by ID
   */
  async getSession(sessionId: string, tenantId: string): Promise<CheckoutSession> {
    const sessionData = await redis.get(getSessionKey(sessionId));

    if (!sessionData) {
      throw new NotFoundError('Checkout session not found or expired', 'SESSION_NOT_FOUND');
    }

    const session: CheckoutSession = JSON.parse(sessionData);

    // Verify tenant
    if (session.tenantId !== tenantId) {
      throw new NotFoundError('Checkout session not found', 'SESSION_NOT_FOUND');
    }

    return session;
  },

  /**
   * Add item to checkout session
   * Requirements: 6.3
   */
  async addItem(input: AddItemInput, ctx: TenantContext): Promise<CheckoutSession> {
    const { tenantId } = ctx;
    const { sessionId, itemType, referenceId, quantity, stylistId, assistantId } = input;

    // Get current session
    const session = await this.getSession(sessionId, tenantId);

    let newItem: CheckoutLineItem;

    if (itemType === 'service') {
      const service = await prisma.service.findFirst({
        where: { id: referenceId, tenantId, deletedAt: null },
        include: {
          branchPrices: { where: { branchId: session.branchId } },
        },
      });

      if (!service) {
        throw new NotFoundError('Service not found', 'SERVICE_NOT_FOUND');
      }

      const branchPrice = service.branchPrices[0];
      const unitPrice = branchPrice?.price ? Number(branchPrice.price) : Number(service.basePrice);
      const grossAmount = unitPrice * quantity;
      const taxRate = Number(service.taxRate);
      const taxAmount = grossAmount * (taxRate / 100);

      const cgstRate = session.isIgst ? 0 : taxRate / 2;
      const sgstRate = session.isIgst ? 0 : taxRate / 2;
      const cgstAmount = session.isIgst ? 0 : taxAmount / 2;
      const sgstAmount = session.isIgst ? 0 : taxAmount / 2;
      const igstRate = session.isIgst ? taxRate : 0;
      const igstAmount = session.isIgst ? taxAmount : 0;

      const commissionType = branchPrice?.commissionType || service.commissionType;
      const commissionValue = branchPrice?.commissionValue
        ? Number(branchPrice.commissionValue)
        : Number(service.commissionValue);
      let commissionAmount = 0;
      if (commissionType === 'percentage') {
        commissionAmount = (grossAmount * commissionValue) / 100;
      } else if (commissionType === 'flat') {
        commissionAmount = commissionValue * quantity;
      }

      // Get stylist name if provided
      let stylistName: string | undefined;
      if (stylistId) {
        const stylist = await prisma.user.findFirst({
          where: { id: stylistId, tenantId },
          select: { name: true },
        });
        stylistName = stylist?.name;
      }

      newItem = {
        id: randomUUID(),
        itemType: 'service',
        referenceId: service.id,
        referenceSku: service.sku,
        name: service.name,
        description: service.description || undefined,
        unitPrice,
        quantity,
        grossAmount,
        discountAmount: 0,
        taxRate,
        taxableAmount: grossAmount,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        totalTax: taxAmount,
        netAmount: grossAmount + taxAmount,
        hsnSacCode: service.hsnSacCode || undefined,
        stylistId,
        stylistName,
        assistantId,
        commissionType,
        commissionRate: commissionValue,
        commissionAmount,
      };
    } else if (itemType === 'product') {
      const product = await prisma.product.findFirst({
        where: { id: referenceId, tenantId, deletedAt: null },
        include: {
          branchSettings: { where: { branchId: session.branchId } },
        },
      });

      if (!product) {
        throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
      }

      const branchSettings = product.branchSettings[0];
      const unitPrice = branchSettings?.sellingPriceOverride
        ? Number(branchSettings.sellingPriceOverride)
        : Number(product.defaultSellingPrice);
      const grossAmount = unitPrice * quantity;
      const taxRate = Number(product.taxRate);
      const taxAmount = grossAmount * (taxRate / 100);

      const cgstRate = session.isIgst ? 0 : taxRate / 2;
      const sgstRate = session.isIgst ? 0 : taxRate / 2;
      const cgstAmount = session.isIgst ? 0 : taxAmount / 2;
      const sgstAmount = session.isIgst ? 0 : taxAmount / 2;
      const igstRate = session.isIgst ? taxRate : 0;
      const igstAmount = session.isIgst ? taxAmount : 0;

      newItem = {
        id: randomUUID(),
        itemType: 'product',
        referenceId: product.id,
        referenceSku: product.sku || undefined,
        name: product.name,
        description: product.description || undefined,
        unitPrice,
        quantity,
        grossAmount,
        discountAmount: 0,
        taxRate,
        taxableAmount: grossAmount,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        totalTax: taxAmount,
        netAmount: grossAmount + taxAmount,
        hsnSacCode: product.hsnCode || undefined,
      };
    } else {
      throw new BadRequestError('Unsupported item type', 'UNSUPPORTED_ITEM_TYPE');
    }

    // Add item to session
    session.lineItems.push(newItem);

    // Recalculate totals
    session.totals = calculateTotals(
      session.lineItems,
      session.appliedDiscounts,
      session.payments,
      session.totals.tipAmount
    );

    // Update session in Redis
    await redis.setex(getSessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(session));

    return session;
  },

  /**
   * Remove item from checkout session
   */
  async removeItem(
    sessionId: string,
    itemId: string,
    ctx: TenantContext
  ): Promise<CheckoutSession> {
    const { tenantId } = ctx;

    // Get current session
    const session = await this.getSession(sessionId, tenantId);

    // Find and remove item
    const itemIndex = session.lineItems.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
      throw new NotFoundError('Item not found in checkout', 'ITEM_NOT_FOUND');
    }

    session.lineItems.splice(itemIndex, 1);

    // Remove any discounts applied to this item
    session.appliedDiscounts = session.appliedDiscounts.filter((d) => d.appliedItemId !== itemId);

    // Recalculate totals
    session.totals = calculateTotals(
      session.lineItems,
      session.appliedDiscounts,
      session.payments,
      session.totals.tipAmount
    );

    // Update session in Redis
    await redis.setex(getSessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(session));

    return session;
  },

  /**
   * Apply discount to checkout session
   * Requirements: 6.4
   */
  async applyDiscount(input: ApplyDiscountInput, ctx: TenantContext): Promise<CheckoutSession> {
    const { tenantId } = ctx;
    const {
      sessionId,
      discountType,
      discountSource,
      calculationType,
      calculationValue,
      appliedTo,
      appliedItemId,
      reason,
    } = input;

    // Get current session
    const session = await this.getSession(sessionId, tenantId);

    // Calculate discount amount
    let discountAmount = 0;
    let sourceName = reason || discountType;

    if (appliedTo === 'subtotal') {
      const subtotal = session.lineItems.reduce((sum, item) => sum + item.grossAmount, 0);
      if (calculationType === 'percentage') {
        discountAmount = (subtotal * calculationValue) / 100;
      } else {
        discountAmount = calculationValue;
      }
    } else if (appliedTo === 'item' && appliedItemId) {
      const item = session.lineItems.find((i) => i.id === appliedItemId);
      if (!item) {
        throw new NotFoundError('Item not found', 'ITEM_NOT_FOUND');
      }
      if (calculationType === 'percentage') {
        discountAmount = (item.grossAmount * calculationValue) / 100;
      } else {
        discountAmount = Math.min(calculationValue, item.grossAmount);
      }
      sourceName = `${discountType} on ${item.name}`;
    }

    // Create discount entry
    const discount: AppliedDiscount = {
      id: randomUUID(),
      discountType,
      discountSource,
      sourceName,
      calculationType,
      calculationValue,
      amount: Math.round(discountAmount * 100) / 100,
      appliedTo,
      appliedItemId,
      reason,
    };

    // Add discount to session
    session.appliedDiscounts.push(discount);

    // Recalculate totals
    session.totals = calculateTotals(
      session.lineItems,
      session.appliedDiscounts,
      session.payments,
      session.totals.tipAmount
    );

    // Update session in Redis
    await redis.setex(getSessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(session));

    return session;
  },

  /**
   * Remove discount from checkout session
   */
  async removeDiscount(
    sessionId: string,
    discountId: string,
    ctx: TenantContext
  ): Promise<CheckoutSession> {
    const { tenantId } = ctx;

    // Get current session
    const session = await this.getSession(sessionId, tenantId);

    // Find and remove discount
    const discountIndex = session.appliedDiscounts.findIndex((d) => d.id === discountId);
    if (discountIndex === -1) {
      throw new NotFoundError('Discount not found', 'DISCOUNT_NOT_FOUND');
    }

    session.appliedDiscounts.splice(discountIndex, 1);

    // Recalculate totals
    session.totals = calculateTotals(
      session.lineItems,
      session.appliedDiscounts,
      session.payments,
      session.totals.tipAmount
    );

    // Update session in Redis
    await redis.setex(getSessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(session));

    return session;
  },

  /**
   * Process payment for checkout session
   * Requirements: 6.5
   */
  async processPayment(input: ProcessPaymentInput, ctx: TenantContext): Promise<CheckoutSession> {
    const { tenantId } = ctx;
    const { sessionId, payments } = input;

    // Get current session
    const session = await this.getSession(sessionId, tenantId);

    // Add payments
    for (const payment of payments) {
      session.payments.push({
        id: randomUUID(),
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        cardLastFour: payment.cardLastFour,
        cardType: payment.cardType,
        upiId: payment.upiId,
        transactionId: payment.transactionId,
      });
    }

    // Recalculate totals
    session.totals = calculateTotals(
      session.lineItems,
      session.appliedDiscounts,
      session.payments,
      session.totals.tipAmount
    );

    // Update session in Redis
    await redis.setex(getSessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(session));

    return session;
  },

  /**
   * Complete checkout and generate invoice
   * Requirements: 6.6
   */
  async completeCheckout(
    input: CompleteCheckoutInput,
    ctx: TenantContext
  ): Promise<{ session: CheckoutSession; invoiceId: string }> {
    const { tenantId, userId } = ctx;
    const { sessionId, tipAmount } = input;

    // Get current session
    const session = await this.getSession(sessionId, tenantId);

    // Update tip if provided
    if (tipAmount > 0) {
      session.totals = calculateTotals(
        session.lineItems,
        session.appliedDiscounts,
        session.payments,
        tipAmount
      );
    }

    // Validate payment is complete
    if (session.totals.amountDue > 0.01) {
      throw new BadRequestError(
        `Payment incomplete. Amount due: ₹${session.totals.amountDue}`,
        'PAYMENT_INCOMPLETE'
      );
    }

    // Validate there are items
    if (session.lineItems.length === 0) {
      throw new BadRequestError('No items in checkout', 'NO_ITEMS');
    }

    // Create invoice using billing service

    // Prepare invoice items
    const invoiceItems = session.lineItems.map((item) => ({
      itemType: item.itemType as 'service' | 'product' | 'combo' | 'package',
      referenceId: item.referenceId,
      quantity: item.quantity,
      stylistId: item.stylistId,
      assistantId: item.assistantId,
      isPackageRedemption: false,
    }));

    // Prepare payments
    const invoicePayments = session.payments.map((p) => ({
      paymentMethod: p.paymentMethod as 'cash' | 'card' | 'upi' | 'wallet' | 'loyalty',
      amount: p.amount,
      cardLastFour: p.cardLastFour,
      cardType: p.cardType as 'visa' | 'mastercard' | 'rupay' | 'amex' | undefined,
      upiId: p.upiId,
      transactionId: p.transactionId,
    }));

    // Create and finalize invoice
    const invoice = await billingService.quickBill(
      {
        branchId: session.branchId,
        customerId: session.customer?.id,
        customerName: session.customer?.name,
        customerPhone: session.customer?.phone,
        appointmentId: session.appointmentId,
        items: invoiceItems,
        payments: invoicePayments,
      },
      { tenantId, userId, branchId: session.branchId }
    );

    // Delete session from Redis
    await redis.del(getSessionKey(sessionId));

    return {
      session,
      invoiceId: invoice.id,
    };
  },

  /**
   * Get customer memberships
   */
  async getCustomerMemberships(tenantId: string, customerId: string): Promise<MembershipInfo[]> {
    const memberships = await prisma.customerMembership.findMany({
      where: {
        tenantId,
        customerId,
        status: { in: ['active', 'frozen'] },
      },
      include: {
        plan: {
          include: {
            benefits: { where: { isActive: true }, orderBy: { priorityLevel: 'desc' } },
          },
        },
      },
      orderBy: { currentExpiryDate: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.id,
      planName: m.plan.name,
      status: m.status,
      expiryDate: m.currentExpiryDate?.toISOString() || '',
      benefits: m.plan.benefits.map((b) => ({
        id: b.id,
        benefitType: b.benefitType,
        discountType: b.discountType || 'percentage',
        discountValue: Number(b.discountValue || 0),
        applicableServices: b.serviceId ? [b.serviceId] : [],
      })),
    }));
  },

  /**
   * Get customer packages
   */
  async getCustomerPackages(tenantId: string, customerId: string): Promise<PackageInfo[]> {
    const packages = await prisma.customerPackage.findMany({
      where: {
        tenantId,
        customerId,
        status: { in: ['active', 'pending'] },
      },
      include: {
        package: { select: { id: true, name: true, packageType: true } },
        credits: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    // Get all service IDs from credits
    const serviceIds = packages.flatMap((p) => p.credits.map((c) => c.serviceId));
    const uniqueServiceIds = [...new Set(serviceIds)];

    // Fetch service names
    const services =
      uniqueServiceIds.length > 0
        ? await prisma.service.findMany({
            where: { id: { in: uniqueServiceIds } },
            select: { id: true, name: true },
          })
        : [];
    const serviceMap = new Map(services.map((s) => [s.id, s.name]));

    return packages.map((p) => ({
      id: p.id,
      packageName: p.package.name,
      packageType: p.package.packageType,
      status: p.status,
      expiryDate: p.expiryDate?.toISOString() || '',
      credits: p.credits.map((c) => ({
        id: c.id,
        serviceId: c.serviceId || undefined,
        serviceName: serviceMap.get(c.serviceId),
        totalCredits: c.initialCredits,
        usedCredits: c.initialCredits - c.remainingCredits,
        remainingCredits: c.remainingCredits,
      })),
    }));
  },
};
