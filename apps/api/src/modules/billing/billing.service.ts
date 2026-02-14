/**
 * Billing Service
 * Core business logic for invoice management, payments, and billing operations
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { BadRequestError, NotFoundError } from '../../lib/errors';
import { fifoEngine } from '../inventory/fifo-engine';
import { stockService } from '../inventory/stock.service';
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  AddItemInput,
  AddPaymentInput,
  FinalizeInvoiceInput,
  CancelInvoiceInput,
  ListInvoicesQuery,
  QuickBillInput,
  CalculateInput,
} from './billing.schema';
import { InvoiceStatus, PaymentStatus, PaymentMethod } from './billing.schema';

// ============================================
// Types
// ============================================

interface TenantContext {
  tenantId: string;
  branchId?: string;
  userId: string;
}

interface StockAvailabilityResult {
  available: boolean;
  currentStock: number;
  requestedQuantity: number;
  shortfall: number;
}

interface CalculatedItem {
  itemType: string;
  referenceId: string;
  referenceSku?: string;
  name: string;
  description?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  grossAmount: number;
  discountAmount: number;
  taxRate: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  netAmount: number;
  hsnSacCode?: string;
  stylistId?: string;
  assistantId?: string;
  commissionType?: string;
  commissionRate?: number;
  commissionAmount?: number;
}

interface InvoiceCalculation {
  items: CalculatedItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  loyaltyDiscount: number;
  walletUsed: number;
  roundOff: number;
  grandTotal: number;
}

// ============================================
// Invoice Calculator
// ============================================

class InvoiceCalculator {
  /**
   * Calculate invoice totals
   */
  async calculate(
    items: AddItemInput[],
    tenantId: string,
    branchId: string,
    options: {
      isIgst?: boolean;
      loyaltyPointsToRedeem?: number;
      walletAmountToUse?: number;
      membershipId?: string;
    } = {}
  ): Promise<InvoiceCalculation> {
    // 1. Fetch service details and calculate item amounts
    const calculatedItems = await this.calculateItems(
      items,
      tenantId,
      branchId,
      options.isIgst || false
    );

    // 2. Calculate subtotal
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.grossAmount, 0);

    // 3. Calculate total discount
    const discountAmount = calculatedItems.reduce((sum, item) => sum + item.discountAmount, 0);

    // 4. Calculate taxable amount
    const taxableAmount = subtotal - discountAmount;

    // 5. Calculate taxes
    const cgstAmount = calculatedItems.reduce((sum, item) => sum + item.cgstAmount, 0);
    const sgstAmount = calculatedItems.reduce((sum, item) => sum + item.sgstAmount, 0);
    const igstAmount = calculatedItems.reduce((sum, item) => sum + item.igstAmount, 0);
    const totalTax = cgstAmount + sgstAmount + igstAmount;

    // 6. Apply loyalty discount
    let loyaltyDiscount = 0;
    if (options.loyaltyPointsToRedeem && options.loyaltyPointsToRedeem > 0) {
      const loyaltyConfig = await prisma.loyaltyConfig.findUnique({
        where: { tenantId },
      });
      if (loyaltyConfig && loyaltyConfig.isEnabled) {
        loyaltyDiscount =
          options.loyaltyPointsToRedeem * Number(loyaltyConfig.redemptionValuePerPoint);
      }
    }

    // 7. Calculate grand total before wallet
    let grandTotal = taxableAmount + totalTax - loyaltyDiscount;

    // 8. Apply wallet
    let walletUsed = 0;
    if (options.walletAmountToUse && options.walletAmountToUse > 0) {
      walletUsed = Math.min(options.walletAmountToUse, grandTotal);
      grandTotal -= walletUsed;
    }

    // 9. Round off to nearest rupee
    const roundOff = this.calculateRoundOff(grandTotal);
    grandTotal = Math.round(grandTotal);

    return {
      items: calculatedItems,
      subtotal: this.round(subtotal),
      discountAmount: this.round(discountAmount),
      taxableAmount: this.round(taxableAmount),
      cgstAmount: this.round(cgstAmount),
      sgstAmount: this.round(sgstAmount),
      igstAmount: this.round(igstAmount),
      totalTax: this.round(totalTax),
      loyaltyDiscount: this.round(loyaltyDiscount),
      walletUsed: this.round(walletUsed),
      roundOff: this.round(roundOff),
      grandTotal,
    };
  }

  /**
   * Calculate individual items with pricing from database
   */
  private async calculateItems(
    items: AddItemInput[],
    tenantId: string,
    branchId: string,
    isIgst: boolean
  ): Promise<CalculatedItem[]> {
    const calculatedItems: CalculatedItem[] = [];

    for (const item of items) {
      if (item.itemType === 'service') {
        const service = await prisma.service.findFirst({
          where: { id: item.referenceId, tenantId, deletedAt: null },
          include: {
            branchPrices: { where: { branchId } },
          },
        });

        if (!service) {
          throw new NotFoundError('SERVICE_NOT_FOUND', `Service ${item.referenceId} not found`);
        }

        // Get price (branch override or base price)
        const branchPrice = service.branchPrices[0];
        const unitPrice = branchPrice?.price
          ? Number(branchPrice.price)
          : Number(service.basePrice);
        const quantity = item.quantity || 1;
        const grossAmount = unitPrice * quantity;
        const taxRate = Number(service.taxRate);

        // Calculate tax
        const taxableAmount = grossAmount; // No item-level discount yet
        const taxAmount = taxableAmount * (taxRate / 100);

        let cgstRate = 0,
          cgstAmount = 0,
          sgstRate = 0,
          sgstAmount = 0,
          igstRate = 0,
          igstAmount = 0;

        if (isIgst) {
          igstRate = taxRate;
          igstAmount = taxAmount;
        } else {
          cgstRate = taxRate / 2;
          sgstRate = taxRate / 2;
          cgstAmount = taxAmount / 2;
          sgstAmount = taxAmount / 2;
        }

        // Commission
        const commissionType = branchPrice?.commissionType || service.commissionType;
        const commissionValue = branchPrice?.commissionValue
          ? Number(branchPrice.commissionValue)
          : Number(service.commissionValue);
        let commissionAmount = 0;
        if (commissionType === 'percentage') {
          commissionAmount = (taxableAmount * commissionValue) / 100;
        } else if (commissionType === 'flat') {
          commissionAmount = commissionValue * quantity;
        }

        calculatedItems.push({
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
          taxableAmount,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          totalTax: taxAmount,
          netAmount: taxableAmount + taxAmount,
          hsnSacCode: service.hsnSacCode || undefined,
          stylistId: item.stylistId,
          assistantId: item.assistantId,
          commissionType,
          commissionRate: commissionValue,
          commissionAmount,
        });
      } else if (item.itemType === 'product') {
        // Calculate product item
        const calculatedProduct = await this.calculateProductItem(item, tenantId, branchId, isIgst);
        calculatedItems.push(calculatedProduct);
      }
      // TODO: Add support for combo, package item types
    }

    return calculatedItems;
  }

  /**
   * Calculate a product item with pricing from database
   * Requirements: 1.1, 1.2, 1.3, 1.5
   */
  private async calculateProductItem(
    item: AddItemInput,
    tenantId: string,
    branchId: string,
    isIgst: boolean
  ): Promise<CalculatedItem> {
    // Fetch product with branch settings
    const product = await prisma.product.findFirst({
      where: { id: item.referenceId, tenantId, deletedAt: null },
      include: {
        branchSettings: { where: { branchId } },
      },
    });

    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', `Product ${item.referenceId} not found`);
    }

    // Get price (branch override or default selling price)
    const branchSettings = product.branchSettings[0];
    const unitPrice = branchSettings?.sellingPriceOverride
      ? Number(branchSettings.sellingPriceOverride)
      : Number(product.defaultSellingPrice);

    const quantity = item.quantity || 1;
    const grossAmount = unitPrice * quantity;
    const taxRate = Number(product.taxRate);

    // Calculate tax
    const taxableAmount = grossAmount;
    const taxAmount = taxableAmount * (taxRate / 100);

    // GST split
    let cgstRate = 0,
      cgstAmount = 0,
      sgstRate = 0,
      sgstAmount = 0,
      igstRate = 0,
      igstAmount = 0;

    if (isIgst) {
      igstRate = taxRate;
      igstAmount = taxAmount;
    } else {
      cgstRate = taxRate / 2;
      sgstRate = taxRate / 2;
      cgstAmount = taxAmount / 2;
      sgstAmount = taxAmount / 2;
    }

    // Products don't have commission configuration in the current schema
    // Commission for product sales can be added later if needed
    const commissionType = undefined;
    const commissionValue = 0;
    const commissionAmount = 0;

    return {
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
      taxableAmount,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTax: taxAmount,
      netAmount: taxableAmount + taxAmount,
      hsnSacCode: product.hsnCode || undefined,
      // Products don't require stylistId or assistantId (Requirement 1.4)
      commissionType,
      commissionRate: commissionValue,
      commissionAmount,
    };
  }

  private calculateRoundOff(amount: number): number {
    const rounded = Math.round(amount);
    return this.round(rounded - amount);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

const calculator = new InvoiceCalculator();

// ============================================
// Billing Service
// ============================================

export const billingService = {
  /**
   * Create a new invoice (draft)
   */
  async createInvoice(input: CreateInvoiceInput, ctx: TenantContext) {
    const { tenantId, userId } = ctx;
    const branchId = input.branchId;

    // Get customer info if customerId provided
    let customerName = input.customerName || 'Guest';
    let customerPhone = input.customerPhone;
    let customerEmail = input.customerEmail;

    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, tenantId, deletedAt: null },
      });
      if (!customer) {
        throw new NotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      customerName = customer.name;
      customerPhone = customer.phone;
      customerEmail = customer.email || undefined;
    }

    // Calculate invoice
    const calculation = await calculator.calculate(input.items, tenantId, branchId, {
      isIgst: !!input.placeOfSupply,
      loyaltyPointsToRedeem: input.redeemLoyaltyPoints,
      walletAmountToUse: input.useWalletAmount,
    });

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        branchId,
        customerId: input.customerId,
        customerName,
        customerPhone,
        customerEmail,
        appointmentId: input.appointmentId,
        subtotal: calculation.subtotal,
        discountAmount: calculation.discountAmount,
        taxableAmount: calculation.taxableAmount,
        cgstAmount: calculation.cgstAmount,
        sgstAmount: calculation.sgstAmount,
        igstAmount: calculation.igstAmount,
        totalTax: calculation.totalTax,
        roundOff: calculation.roundOff,
        grandTotal: calculation.grandTotal,
        loyaltyPointsRedeemed: input.redeemLoyaltyPoints || 0,
        loyaltyDiscount: calculation.loyaltyDiscount,
        walletAmountUsed: calculation.walletUsed,
        gstin: input.gstin,
        placeOfSupply: input.placeOfSupply,
        isIgst: !!input.placeOfSupply,
        amountDue: calculation.grandTotal,
        notes: input.notes,
        createdBy: userId,
        items: {
          create: calculation.items.map((item, index) => ({
            tenantId,
            itemType: item.itemType,
            referenceId: item.referenceId,
            referenceSku: item.referenceSku,
            name: item.name,
            description: item.description,
            variantName: item.variantName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            grossAmount: item.grossAmount,
            discountAmount: item.discountAmount,
            taxRate: item.taxRate,
            taxableAmount: item.taxableAmount,
            cgstRate: item.cgstRate,
            cgstAmount: item.cgstAmount,
            sgstRate: item.sgstRate,
            sgstAmount: item.sgstAmount,
            igstRate: item.igstRate,
            igstAmount: item.igstAmount,
            totalTax: item.totalTax,
            netAmount: item.netAmount,
            hsnSacCode: item.hsnSacCode,
            stylistId: item.stylistId,
            assistantId: item.assistantId,
            commissionType: item.commissionType,
            commissionRate: item.commissionRate,
            commissionAmount: item.commissionAmount,
            displayOrder: index,
          })),
        },
      },
      include: {
        items: true,
        payments: true,
        discounts: true,
      },
    });

    return invoice;
  },

  /**
   * Get invoice by ID
   */
  async getInvoice(id: string, tenantId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: { orderBy: { displayOrder: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        discounts: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError('INVOICE_NOT_FOUND', 'Invoice not found');
    }

    return invoice;
  },

  /**
   * List invoices with filters
   */
  async listInvoices(query: ListInvoicesQuery, ctx: TenantContext) {
    const { tenantId, branchId: userBranchId } = ctx;
    const {
      branchId,
      status,
      paymentStatus,
      customerId,
      dateFrom,
      dateTo,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    console.log('query', query);

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(userBranchId && !branchId && { branchId: userBranchId }),
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(customerId && { customerId }),
      ...(dateFrom && { invoiceDate: { gte: new Date(dateFrom) } }),
      ...(dateTo && { invoiceDate: { lte: new Date(dateTo) } }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          items: { select: { id: true, name: true, netAmount: true } },
          payments: { select: { id: true, paymentMethod: true, amount: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        // TODO: debug this properly
        take: Number(limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Update draft invoice
   */
  async updateInvoice(id: string, input: UpdateInvoiceInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(id, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be modified');
    }

    return prisma.invoice.update({
      where: { id },
      data: input,
      include: {
        items: true,
        payments: true,
        discounts: true,
      },
    });
  },

  /**
   * Validate stock availability for a product
   * Requirements: 2.1, 2.2, 2.3
   */
  async validateProductStock(
    branchId: string,
    productId: string,
    quantity: number
  ): Promise<StockAvailabilityResult> {
    const availability = await fifoEngine.checkAvailability(branchId, productId, quantity);
    return {
      available: availability.available,
      currentStock: availability.currentStock,
      requestedQuantity: quantity,
      shortfall: availability.shortfall,
    };
  },

  /**
   * Add item to invoice
   */
  async addItem(invoiceId: string, input: AddItemInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be modified');
    }

    // Validate stock availability for product items (Requirements 2.1, 2.2)
    if (input.itemType === 'product') {
      const stockResult = await this.validateProductStock(
        invoice.branchId,
        input.referenceId,
        input.quantity || 1
      );
      if (!stockResult.available) {
        throw new BadRequestError(
          'INSUFFICIENT_STOCK',
          `Insufficient stock for product. Available: ${stockResult.currentStock}, Requested: ${stockResult.requestedQuantity}`
        );
      }
    }

    // Calculate the new item
    const calculation = await calculator.calculate([input], ctx.tenantId, invoice.branchId, {
      isIgst: invoice.isIgst,
    });

    const itemData = calculation.items[0];
    const maxOrder =
      invoice.items.length > 0 ? Math.max(...invoice.items.map((i) => i.displayOrder)) : -1;

    // Create item and update invoice totals
    await prisma.$transaction([
      prisma.invoiceItem.create({
        data: {
          tenantId: ctx.tenantId,
          invoiceId,
          itemType: itemData.itemType,
          referenceId: itemData.referenceId,
          referenceSku: itemData.referenceSku,
          name: itemData.name,
          description: itemData.description,
          unitPrice: itemData.unitPrice,
          quantity: itemData.quantity,
          grossAmount: itemData.grossAmount,
          discountAmount: itemData.discountAmount,
          taxRate: itemData.taxRate,
          taxableAmount: itemData.taxableAmount,
          cgstRate: itemData.cgstRate,
          cgstAmount: itemData.cgstAmount,
          sgstRate: itemData.sgstRate,
          sgstAmount: itemData.sgstAmount,
          igstRate: itemData.igstRate,
          igstAmount: itemData.igstAmount,
          totalTax: itemData.totalTax,
          netAmount: itemData.netAmount,
          hsnSacCode: itemData.hsnSacCode,
          stylistId: itemData.stylistId,
          assistantId: itemData.assistantId,
          commissionType: itemData.commissionType,
          commissionRate: itemData.commissionRate,
          commissionAmount: itemData.commissionAmount,
          displayOrder: maxOrder + 1,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: { increment: itemData.grossAmount },
          taxableAmount: { increment: itemData.taxableAmount },
          cgstAmount: { increment: itemData.cgstAmount },
          sgstAmount: { increment: itemData.sgstAmount },
          igstAmount: { increment: itemData.igstAmount },
          totalTax: { increment: itemData.totalTax },
          grandTotal: { increment: itemData.netAmount },
          amountDue: { increment: itemData.netAmount },
        },
      }),
    ]);

    return this.getInvoice(invoiceId, ctx.tenantId);
  },

  /**
   * Remove item from invoice
   */
  async removeItem(invoiceId: string, itemId: string, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be modified');
    }

    const item = invoice.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError('ITEM_NOT_FOUND', 'Invoice item not found');
    }

    if (invoice.items.length === 1) {
      throw new BadRequestError('LAST_ITEM', 'Cannot remove the last item from invoice');
    }

    await prisma.$transaction([
      prisma.invoiceItem.delete({ where: { id: itemId } }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: { decrement: Number(item.grossAmount) },
          taxableAmount: { decrement: Number(item.taxableAmount) },
          cgstAmount: { decrement: Number(item.cgstAmount) },
          sgstAmount: { decrement: Number(item.sgstAmount) },
          igstAmount: { decrement: Number(item.igstAmount) },
          totalTax: { decrement: Number(item.totalTax) },
          grandTotal: { decrement: Number(item.netAmount) },
          amountDue: { decrement: Number(item.netAmount) },
        },
      }),
    ]);

    return this.getInvoice(invoiceId, ctx.tenantId);
  },

  /**
   * Add payment to invoice
   */
  async addPayment(invoiceId: string, input: AddPaymentInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestError('INVOICE_CANCELLED', 'Cannot add payment to cancelled invoice');
    }

    const totalPayment = input.payments.reduce((sum, p) => sum + p.amount, 0);
    const newAmountPaid = Number(invoice.amountPaid) + totalPayment;
    const newAmountDue = Number(invoice.grandTotal) - newAmountPaid;

    if (newAmountDue < -0.01) {
      throw new BadRequestError('OVERPAYMENT', 'Payment amount exceeds invoice total');
    }

    // Determine new payment status
    let newPaymentStatus: string = PaymentStatus.PARTIAL;
    if (newAmountDue <= 0.01) {
      newPaymentStatus = PaymentStatus.PAID;
    } else if (newAmountPaid === 0) {
      newPaymentStatus = PaymentStatus.PENDING;
    }

    // Create payments and update invoice
    await prisma.$transaction(async (tx) => {
      for (const payment of input.payments) {
        await tx.payment.create({
          data: {
            tenantId: ctx.tenantId,
            branchId: invoice.branchId,
            invoiceId,
            paymentMethod: payment.paymentMethod,
            amount: payment.amount,
            cardLastFour: payment.cardLastFour,
            cardType: payment.cardType,
            upiId: payment.upiId,
            transactionId: payment.transactionId,
            bankName: payment.bankName,
            chequeNumber: payment.chequeNumber,
            chequeDate: payment.chequeDate ? new Date(payment.chequeDate) : undefined,
            createdBy: ctx.userId,
          },
        });

        // Update cash drawer for cash payments
        if (payment.paymentMethod === PaymentMethod.CASH) {
          await this.updateCashDrawer(
            tx,
            ctx.tenantId,
            invoice.branchId,
            payment.amount,
            'sale',
            invoiceId,
            ctx.userId
          );
        }
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
          paymentStatus: newPaymentStatus,
        },
      });
    });

    return this.getInvoice(invoiceId, ctx.tenantId);
  },

  /**
   * Update cash drawer balance
   */
  async updateCashDrawer(
    tx: Prisma.TransactionClient,
    tenantId: string,
    branchId: string,
    amount: number,
    transactionType: string,
    referenceId?: string,
    userId?: string
  ) {
    // Get current balance
    const lastTransaction = await tx.cashDrawerTransaction.findFirst({
      where: { tenantId, branchId },
      orderBy: { createdAt: 'desc' },
    });

    const currentBalance = lastTransaction ? Number(lastTransaction.balanceAfter) : 0;
    const newBalance = currentBalance + amount;

    await tx.cashDrawerTransaction.create({
      data: {
        tenantId,
        branchId,
        transactionType,
        amount,
        balanceAfter: newBalance,
        referenceType: referenceId ? 'invoice' : undefined,
        referenceId,
        createdBy: userId,
      },
    });
  },

  /**
   * Finalize invoice
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async finalizeInvoice(invoiceId: string, input: FinalizeInvoiceInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be finalized');
    }

    // If payments provided, add them first
    if (input.payments && input.payments.length > 0) {
      await this.addPayment(invoiceId, { payments: input.payments }, ctx);
    }

    // Refresh invoice after payments
    const updatedInvoice = await this.getInvoice(invoiceId, ctx.tenantId);

    // Validate full payment
    if (Number(updatedInvoice.amountDue) > 0.01) {
      throw new BadRequestError(
        'INSUFFICIENT_PAYMENT',
        `Payment amount is less than invoice total. Due: ${updatedInvoice.amountDue}`
      );
    }

    // Validate stock availability for all product items (Requirement 3.4)
    const productItems = invoice.items.filter((item) => item.itemType === 'product');
    for (const item of productItems) {
      const stockResult = await this.validateProductStock(
        invoice.branchId,
        item.referenceId,
        item.quantity
      );
      if (!stockResult.available) {
        throw new BadRequestError(
          'INSUFFICIENT_STOCK',
          `Insufficient stock for product "${item.name}". Available: ${stockResult.currentStock}, Requested: ${item.quantity}`
        );
      }
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(ctx.tenantId, invoice.branchId);

    // Finalize invoice
    await prisma.$transaction(async (tx) => {
      // Update invoice status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          invoiceNumber,
          status: InvoiceStatus.FINALIZED,
          paymentStatus: PaymentStatus.PAID,
          finalizedAt: new Date(),
          finalizedBy: ctx.userId,
        },
      });

      // Deduct stock for product items (Requirements 3.1, 3.2, 3.3)
      // This must happen within the transaction for atomicity (Requirement 3.5)
      for (const item of productItems) {
        try {
          await stockService.consumeForSale(
            ctx.tenantId,
            invoice.branchId,
            item.referenceId,
            item.quantity,
            invoiceId,
            ctx.userId
          );
        } catch (error) {
          // Re-throw with specific error code for stock consumption failure
          throw new BadRequestError(
            'FINALIZATION_STOCK_ERROR',
            `Failed to deduct stock for product "${item.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Award loyalty points
      if (invoice.customerId) {
        const loyaltyConfig = await tx.loyaltyConfig.findUnique({
          where: { tenantId: ctx.tenantId },
        });

        if (loyaltyConfig && loyaltyConfig.isEnabled) {
          const pointsEarned = Math.floor(
            Number(invoice.taxableAmount) * Number(loyaltyConfig.pointsPerUnit)
          );

          if (pointsEarned > 0) {
            const customer = await tx.customer.findUnique({
              where: { id: invoice.customerId },
            });

            if (customer) {
              const newBalance = customer.loyaltyPoints + pointsEarned;

              await tx.customer.update({
                where: { id: invoice.customerId },
                data: { loyaltyPoints: newBalance },
              });

              await tx.loyaltyTransaction.create({
                data: {
                  tenantId: ctx.tenantId,
                  customerId: invoice.customerId,
                  type: 'earned',
                  points: pointsEarned,
                  balance: newBalance,
                  reference: `Invoice #${invoiceNumber}`,
                  createdBy: ctx.userId,
                },
              });

              // Update invoice with points earned
              await tx.invoice.update({
                where: { id: invoiceId },
                data: { loyaltyPointsEarned: pointsEarned },
              });
            }
          }
        }
      }

      // Deduct wallet if used
      if (Number(invoice.walletAmountUsed) > 0 && invoice.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: invoice.customerId },
        });

        if (customer) {
          const newBalance = Number(customer.walletBalance) - Number(invoice.walletAmountUsed);

          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { walletBalance: newBalance },
          });

          await tx.walletTransaction.create({
            data: {
              tenantId: ctx.tenantId,
              customerId: invoice.customerId,
              type: 'debit',
              amount: -Number(invoice.walletAmountUsed),
              balance: newBalance,
              reference: `Invoice #${invoiceNumber}`,
              createdBy: ctx.userId,
            },
          });
        }
      }

      // Update appointment status if linked
      if (invoice.appointmentId) {
        await tx.appointment.update({
          where: { id: invoice.appointmentId },
          data: { status: 'completed' },
        });
      }

      // Create commission records for stylists
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const item of invoice.items) {
        // Create commission for primary stylist
        if (item.stylistId && item.commissionAmount && Number(item.commissionAmount) > 0) {
          await tx.commission.create({
            data: {
              tenantId: ctx.tenantId,
              branchId: invoice.branchId,
              userId: item.stylistId,
              invoiceId: invoiceId,
              invoiceItemId: item.id,
              serviceId: item.itemType === 'service' ? item.referenceId : null,
              serviceName: item.name,
              serviceAmount: item.netAmount,
              commissionType: item.commissionType || 'percentage',
              commissionRate: item.commissionRate || 0,
              commissionAmount: item.commissionAmount,
              roleType: 'primary',
              status: 'pending',
              commissionDate: today,
            },
          });
        }

        // Create commission for assistant if applicable
        if (
          item.assistantId &&
          item.assistantCommissionAmount &&
          Number(item.assistantCommissionAmount) > 0
        ) {
          await tx.commission.create({
            data: {
              tenantId: ctx.tenantId,
              branchId: invoice.branchId,
              userId: item.assistantId,
              invoiceId: invoiceId,
              invoiceItemId: item.id,
              serviceId: item.itemType === 'service' ? item.referenceId : null,
              serviceName: item.name,
              serviceAmount: item.netAmount,
              commissionType: item.commissionType || 'percentage',
              commissionRate: item.commissionRate || 0,
              commissionAmount: item.assistantCommissionAmount,
              roleType: 'assistant',
              status: 'pending',
              commissionDate: today,
            },
          });
        }
      }
    });

    return this.getInvoice(invoiceId, ctx.tenantId);
  },

  /**
   * Generate sequential invoice number
   * Format: INV-{YYYYMM}-{SEQUENCE}
   */
  async generateInvoiceNumber(_tenantId: string, branchId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `INV-${yearMonth}`;

    // Get last invoice number for this branch and month
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        branchId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice?.invoiceNumber) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  },

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId: string, input: CancelInvoiceInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestError('ALREADY_CANCELLED', 'Invoice is already cancelled');
    }

    if (invoice.status === InvoiceStatus.FINALIZED) {
      throw new BadRequestError(
        'CANNOT_CANCEL_FINALIZED',
        'Finalized invoices cannot be cancelled. Create a credit note instead.'
      );
    }

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: ctx.userId,
        cancellationReason: input.reason,
      },
      include: {
        items: true,
        payments: true,
        discounts: true,
      },
    });
  },

  /**
   * Delete draft invoice
   */
  async deleteInvoice(invoiceId: string, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be deleted');
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });
    return { success: true };
  },

  /**
   * Quick bill - create and finalize in one step
   */
  async quickBill(input: QuickBillInput, ctx: TenantContext) {
    // Create invoice
    const invoice = await this.createInvoice(input, ctx);

    // Finalize with payments
    return this.finalizeInvoice(invoice.id, { payments: input.payments }, ctx);
  },

  /**
   * Calculate totals without saving (preview)
   */
  async calculate(input: CalculateInput, ctx: TenantContext) {
    return calculator.calculate(input.items, ctx.tenantId, input.branchId, {
      isIgst: input.isIgst,
      loyaltyPointsToRedeem: input.redeemLoyaltyPoints,
      walletAmountToUse: input.useWalletAmount,
    });
  },

  /**
   * Get next invoice number (preview)
   */
  async getNextInvoiceNumber(branchId: string, ctx: TenantContext) {
    return this.generateInvoiceNumber(ctx.tenantId, branchId);
  },
};

// ============================================
// Credit Note Service Methods
// ============================================

export const creditNoteService = {
  /**
   * Create a credit note (refund) for a finalized invoice
   */
  async createCreditNote(
    input: {
      originalInvoiceId: string;
      items: Array<{ originalItemId: string; quantity: number }>;
      refundMethod: 'original_method' | 'wallet' | 'cash';
      reason: string;
      notes?: string;
    },
    ctx: TenantContext
  ) {
    const { tenantId, userId } = ctx;

    // Get original invoice
    const originalInvoice = await prisma.invoice.findFirst({
      where: { id: input.originalInvoiceId, tenantId },
      include: { items: true, payments: true },
    });

    if (!originalInvoice) {
      throw new NotFoundError('INVOICE_NOT_FOUND', 'Original invoice not found');
    }

    if (originalInvoice.status !== InvoiceStatus.FINALIZED) {
      throw new BadRequestError(
        'INVOICE_NOT_FINALIZED',
        'Credit notes can only be created for finalized invoices'
      );
    }

    // Calculate refund amounts
    let refundSubtotal = 0;
    let refundTax = 0;
    const creditNoteItems: Array<{
      originalItemId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      taxAmount: number;
      totalAmount: number;
    }> = [];

    for (const refundItem of input.items) {
      const originalItem = originalInvoice.items.find((i) => i.id === refundItem.originalItemId);
      if (!originalItem) {
        throw new NotFoundError('ITEM_NOT_FOUND', `Item ${refundItem.originalItemId} not found`);
      }

      if (refundItem.quantity > originalItem.quantity) {
        throw new BadRequestError(
          'INVALID_QUANTITY',
          `Refund quantity exceeds original quantity for ${originalItem.name}`
        );
      }

      const unitPrice = Number(originalItem.unitPrice);
      const grossAmount = unitPrice * refundItem.quantity;
      const taxRate = Number(originalItem.taxRate);
      const taxAmount = grossAmount * (taxRate / 100);
      const totalAmount = grossAmount + taxAmount;

      refundSubtotal += grossAmount;
      refundTax += taxAmount;

      creditNoteItems.push({
        originalItemId: originalItem.id,
        name: originalItem.name,
        quantity: refundItem.quantity,
        unitPrice,
        taxRate,
        taxAmount,
        totalAmount,
      });
    }

    const refundTotal = refundSubtotal + refundTax;

    // Generate credit note number
    const creditNoteNumber = await this.generateCreditNoteNumber(
      tenantId,
      originalInvoice.branchId
    );

    // Create credit note
    const creditNote = await prisma.$transaction(async (tx) => {
      const cn = await tx.creditNote.create({
        data: {
          tenantId,
          branchId: originalInvoice.branchId,
          creditNoteNumber,
          originalInvoiceId: originalInvoice.id,
          originalInvoiceNumber: originalInvoice.invoiceNumber || '',
          customerId: originalInvoice.customerId,
          customerName: originalInvoice.customerName,
          subtotal: refundSubtotal,
          taxAmount: refundTax,
          totalAmount: refundTotal,
          refundMethod: input.refundMethod,
          reason: input.reason,
          notes: input.notes,
          status: 'issued',
          createdBy: userId,
          items: {
            create: creditNoteItems.map((item) => ({
              tenantId,
              originalItemId: item.originalItemId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: { items: true },
      });

      // Process refund based on method
      if (input.refundMethod === 'wallet' && originalInvoice.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: originalInvoice.customerId },
        });

        if (customer) {
          const newBalance = Number(customer.walletBalance) + refundTotal;

          await tx.customer.update({
            where: { id: originalInvoice.customerId },
            data: { walletBalance: newBalance },
          });

          await tx.walletTransaction.create({
            data: {
              tenantId,
              customerId: originalInvoice.customerId,
              type: 'credit',
              amount: refundTotal,
              balance: newBalance,
              reference: `Credit Note #${creditNoteNumber}`,
              createdBy: userId,
            },
          });
        }
      } else if (input.refundMethod === 'cash') {
        // Record cash refund in drawer
        await billingService.updateCashDrawer(
          tx,
          tenantId,
          originalInvoice.branchId,
          -refundTotal,
          'refund',
          cn.id,
          userId
        );
      }

      // Update original invoice status
      await tx.invoice.update({
        where: { id: originalInvoice.id },
        data: {
          status: InvoiceStatus.REFUNDED,
          paymentStatus: PaymentStatus.REFUNDED,
          refundInvoiceId: cn.id,
        },
      });

      return cn;
    });

    return creditNote;
  },

  /**
   * Get credit note by ID
   */
  async getCreditNote(id: string, tenantId: string) {
    const creditNote = await prisma.creditNote.findFirst({
      where: { id, tenantId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        originalInvoice: true,
      },
    });

    if (!creditNote) {
      throw new NotFoundError('CREDIT_NOTE_NOT_FOUND', 'Credit note not found');
    }

    return creditNote;
  },

  /**
   * List credit notes
   */
  async listCreditNotes(
    query: {
      branchId?: string;
      customerId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
    ctx: TenantContext
  ) {
    const { tenantId, branchId: userBranchId } = ctx;
    const { branchId, customerId, dateFrom, dateTo, page = 1, limit = 20 } = query;

    const where: Prisma.CreditNoteWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(userBranchId && !branchId && { branchId: userBranchId }),
      ...(customerId && { customerId }),
      ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
      ...(dateTo && { createdAt: { lte: new Date(dateTo) } }),
    };

    const [creditNotes, total] = await Promise.all([
      prisma.creditNote.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        // TODO: debug this properly
        take: Number(limit),
      }),
      prisma.creditNote.count({ where }),
    ]);

    return {
      data: creditNotes,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * Generate credit note number
   */
  async generateCreditNoteNumber(_tenantId: string, branchId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `CN-${yearMonth}`;

    const lastCN = await prisma.creditNote.findFirst({
      where: { branchId, creditNoteNumber: { startsWith: prefix } },
      orderBy: { creditNoteNumber: 'desc' },
    });

    let sequence = 1;
    if (lastCN?.creditNoteNumber) {
      const lastSequence = parseInt(lastCN.creditNoteNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  },
};

// ============================================
// Day Closure Service Methods
// ============================================

export const dayClosureService = {
  /**
   * Open a new day for a branch
   */
  async openDay(input: { branchId: string; openingCash?: number }, ctx: TenantContext) {
    const { tenantId, userId } = ctx;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if day is already open
    const existingDay = await prisma.dayClosure.findFirst({
      where: {
        tenantId,
        branchId: input.branchId,
        closureDate: today,
      },
    });

    if (existingDay) {
      throw new BadRequestError('DAY_ALREADY_OPEN', 'Day is already open for this branch');
    }

    // Get previous day's closing balance
    const previousDay = await prisma.dayClosure.findFirst({
      where: {
        tenantId,
        branchId: input.branchId,
        status: 'closed',
      },
      orderBy: { closureDate: 'desc' },
    });

    const openingCash = input.openingCash ?? (previousDay ? Number(previousDay.actualCash) : 0);

    const dayClosure = await prisma.dayClosure.create({
      data: {
        tenantId,
        branchId: input.branchId,
        closureDate: today,
        expectedCash: openingCash,
        status: 'open',
        openedBy: userId,
        openedAt: new Date(),
      },
    });

    // Record opening cash in drawer
    if (openingCash > 0) {
      await prisma.cashDrawerTransaction.create({
        data: {
          tenantId,
          branchId: input.branchId,
          transactionType: 'opening',
          amount: openingCash,
          balanceAfter: openingCash,
          description: 'Opening cash balance',
          createdBy: userId,
        },
      });
    }

    return dayClosure;
  },

  /**
   * Close the day for a branch
   */
  async closeDay(
    dayClosureId: string,
    input: { actualCash: number; notes?: string },
    ctx: TenantContext
  ) {
    const { tenantId, userId } = ctx;

    const dayClosure = await prisma.dayClosure.findFirst({
      where: { id: dayClosureId, tenantId },
    });

    if (!dayClosure) {
      throw new NotFoundError('DAY_CLOSURE_NOT_FOUND', 'Day closure not found');
    }

    if (dayClosure.status !== 'open') {
      throw new BadRequestError('DAY_NOT_OPEN', 'Day is not open');
    }

    // Calculate expected cash from transactions
    const cashTransactions = await prisma.cashDrawerTransaction.findMany({
      where: {
        tenantId,
        branchId: dayClosure.branchId,
        createdAt: {
          gte: dayClosure.openedAt!,
        },
      },
    });

    const expectedCash = cashTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      Number(dayClosure.expectedCash)
    );

    // Calculate totals for the day
    const dayStart = new Date(dayClosure.closureDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        branchId: dayClosure.branchId,
        status: 'finalized',
        finalizedAt: { gte: dayStart, lt: dayEnd },
      },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.totalTax), 0);
    const totalDiscounts = invoices.reduce((sum, inv) => sum + Number(inv.discountAmount), 0);
    const totalInvoices = invoices.length;

    // Get payment breakdown
    const payments = await prisma.payment.findMany({
      where: {
        tenantId,
        branchId: dayClosure.branchId,
        createdAt: { gte: dayStart, lt: dayEnd },
        isRefund: false,
      },
    });

    const cashCollected = payments
      .filter((p) => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const cardCollected = payments
      .filter((p) => p.paymentMethod === 'card')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const upiCollected = payments
      .filter((p) => p.paymentMethod === 'upi')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const walletCollected = payments
      .filter((p) => p.paymentMethod === 'wallet')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const otherCollected = payments
      .filter((p) => !['cash', 'card', 'upi', 'wallet'].includes(p.paymentMethod))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const cashDifference = input.actualCash - expectedCash;

    const updatedDayClosure = await prisma.dayClosure.update({
      where: { id: dayClosureId },
      data: {
        status: 'closed',
        actualCash: input.actualCash,
        expectedCash,
        cashDifference,
        totalRevenue,
        totalTaxCollected: totalTax,
        totalDiscounts,
        totalInvoices,
        cashCollected,
        cardCollected,
        upiCollected,
        walletCollected,
        otherCollected,
        reconciliationNotes: input.notes,
        closedBy: userId,
        closedAt: new Date(),
      },
    });

    return updatedDayClosure;
  },

  /**
   * Get current day status for a branch
   */
  async getCurrentDay(branchId: string, ctx: TenantContext) {
    const { tenantId } = ctx;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayClosure = await prisma.dayClosure.findFirst({
      where: {
        tenantId,
        branchId,
        closureDate: today,
      },
    });

    if (!dayClosure) {
      return { status: 'not_opened', closureDate: today };
    }

    // Get current cash balance
    const lastTransaction = await prisma.cashDrawerTransaction.findFirst({
      where: { tenantId, branchId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...dayClosure,
      currentCashBalance: lastTransaction ? Number(lastTransaction.balanceAfter) : 0,
    };
  },

  /**
   * List day closures
   */
  async listDayClosures(
    query: {
      branchId?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
    ctx: TenantContext
  ) {
    const { tenantId, branchId: userBranchId } = ctx;
    const { branchId, status, dateFrom, dateTo, page = 1, limit = 20 } = query;

    const where: Prisma.DayClosureWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(userBranchId && !branchId && { branchId: userBranchId }),
      ...(status && { status }),
      ...(dateFrom && { closureDate: { gte: new Date(dateFrom) } }),
      ...(dateTo && { closureDate: { lte: new Date(dateTo) } }),
    };

    const [dayClosures, total] = await Promise.all([
      prisma.dayClosure.findMany({
        where,
        orderBy: { closureDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dayClosure.count({ where }),
    ]);

    return {
      data: dayClosures,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
};

// ============================================
// Cash Drawer Service Methods
// ============================================

export const cashDrawerService = {
  /**
   * Get current cash drawer balance
   */
  async getBalance(branchId: string, ctx: TenantContext) {
    const { tenantId } = ctx;

    const lastTransaction = await prisma.cashDrawerTransaction.findFirst({
      where: { tenantId, branchId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      balance: lastTransaction ? Number(lastTransaction.balanceAfter) : 0,
      lastUpdated: lastTransaction?.createdAt || null,
    };
  },

  /**
   * Get cash drawer transactions
   */
  async getTransactions(
    query: {
      branchId: string;
      dateFrom?: string;
      dateTo?: string;
      transactionType?: string;
      page?: number;
      limit?: number;
    },
    ctx: TenantContext
  ) {
    const { tenantId } = ctx;
    const { branchId, dateFrom, dateTo, transactionType, page = 1, limit = 50 } = query;

    const where: Prisma.CashDrawerTransactionWhereInput = {
      tenantId,
      branchId,
      ...(transactionType && { transactionType }),
      ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
      ...(dateTo && { createdAt: { lte: new Date(dateTo) } }),
    };

    const [transactions, total] = await Promise.all([
      prisma.cashDrawerTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cashDrawerTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * Make a cash adjustment (deposit, withdrawal, or correction)
   */
  async makeAdjustment(
    branchId: string,
    input: { amount: number; description: string; transactionType: string },
    ctx: TenantContext
  ) {
    const { tenantId, userId } = ctx;

    // Get current balance
    const lastTransaction = await prisma.cashDrawerTransaction.findFirst({
      where: { tenantId, branchId },
      orderBy: { createdAt: 'desc' },
    });

    const currentBalance = lastTransaction ? Number(lastTransaction.balanceAfter) : 0;
    const newBalance = currentBalance + input.amount;

    if (newBalance < 0) {
      throw new BadRequestError('INSUFFICIENT_CASH', 'Insufficient cash in drawer');
    }

    const transaction = await prisma.cashDrawerTransaction.create({
      data: {
        tenantId,
        branchId,
        transactionType: input.transactionType,
        amount: input.amount,
        balanceAfter: newBalance,
        description: input.description,
        createdBy: userId,
      },
    });

    return transaction;
  },
};
