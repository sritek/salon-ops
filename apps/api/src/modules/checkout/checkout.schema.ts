/**
 * Checkout Module - Zod Schemas
 * Validation schemas for checkout session operations
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { z } from 'zod';

// ============================================
// Start Checkout Schema
// ============================================

export const startCheckoutSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  branchId: z.string().uuid(),
});

export type StartCheckoutInput = z.infer<typeof startCheckoutSchema>;

// ============================================
// Add Item Schema
// ============================================

export const addItemSchema = z.object({
  sessionId: z.string().uuid(),
  itemType: z.enum(['service', 'product', 'combo', 'package']),
  referenceId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
  stylistId: z.string().uuid().optional(),
  assistantId: z.string().uuid().optional(),
});

export type AddItemInput = z.infer<typeof addItemSchema>;

// ============================================
// Remove Item Schema
// ============================================

export const removeItemSchema = z.object({
  sessionId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export type RemoveItemInput = z.infer<typeof removeItemSchema>;

// ============================================
// Apply Discount Schema
// ============================================

export const applyDiscountSchema = z.object({
  sessionId: z.string().uuid(),
  discountType: z.enum(['membership', 'package', 'coupon', 'loyalty', 'manual']),
  discountSource: z.string().optional(),
  calculationType: z.enum(['percentage', 'flat']),
  calculationValue: z.number().min(0),
  appliedTo: z.enum(['subtotal', 'item']),
  appliedItemId: z.string().uuid().optional(),
  reason: z.string().max(255).optional(),
});

export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;

// ============================================
// Remove Discount Schema
// ============================================

export const removeDiscountSchema = z.object({
  sessionId: z.string().uuid(),
  discountId: z.string().uuid(),
});

export type RemoveDiscountInput = z.infer<typeof removeDiscountSchema>;

// ============================================
// Process Payment Schema
// ============================================

export const paymentEntrySchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'upi', 'wallet', 'loyalty']),
  amount: z.number().min(0.01),
  cardLastFour: z.string().length(4).optional(),
  cardType: z.enum(['visa', 'mastercard', 'rupay', 'amex']).optional(),
  upiId: z.string().max(100).optional(),
  transactionId: z.string().max(100).optional(),
});

export const processPaymentSchema = z.object({
  sessionId: z.string().uuid(),
  payments: z.array(paymentEntrySchema).min(1),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;

// ============================================
// Complete Checkout Schema
// ============================================

export const completeCheckoutSchema = z.object({
  sessionId: z.string().uuid(),
  sendReceipt: z.boolean().default(false),
  receiptMethod: z.enum(['whatsapp', 'email', 'print']).optional(),
  tipAmount: z.number().min(0).default(0),
});

export type CompleteCheckoutInput = z.infer<typeof completeCheckoutSchema>;

// ============================================
// Get Session Schema
// ============================================

export const getSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export type GetSessionInput = z.infer<typeof getSessionSchema>;

// ============================================
// Checkout Session Types
// ============================================

export interface CheckoutLineItem {
  id: string;
  itemType: 'service' | 'product' | 'combo' | 'package';
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
  stylistName?: string;
  assistantId?: string;
  assistantName?: string;
  commissionType?: string;
  commissionRate?: number;
  commissionAmount?: number;
}

export interface AppliedDiscount {
  id: string;
  discountType: 'membership' | 'package' | 'coupon' | 'loyalty' | 'manual';
  discountSource?: string;
  sourceName: string;
  calculationType: 'percentage' | 'flat';
  calculationValue: number;
  amount: number;
  appliedTo: 'subtotal' | 'item';
  appliedItemId?: string;
  reason?: string;
}

export interface PaymentEntry {
  id: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'wallet' | 'loyalty';
  amount: number;
  cardLastFour?: string;
  cardType?: string;
  upiId?: string;
  transactionId?: string;
}

export interface CheckoutTotals {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxTotal: number;
  loyaltyDiscount: number;
  walletUsed: number;
  tipAmount: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
}

export interface AvailableDiscount {
  id: string;
  type: 'membership' | 'package' | 'coupon' | 'loyalty';
  name: string;
  description: string;
  discountType: 'percentage' | 'flat';
  value: number;
  maxDiscount?: number;
  applicableTo: 'all' | 'services' | 'products' | string[];
  isAutoApplied: boolean;
}

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  walletBalance: number;
  loyaltyPoints: number;
  loyaltyPointValue: number;
}

export interface MembershipInfo {
  id: string;
  planName: string;
  status: string;
  expiryDate: string;
  benefits: Array<{
    id: string;
    benefitType: string;
    discountType: string;
    discountValue: number;
    applicableServices: string[];
  }>;
}

export interface PackageInfo {
  id: string;
  packageName: string;
  packageType: string;
  status: string;
  expiryDate: string;
  credits: Array<{
    id: string;
    serviceId?: string;
    serviceName?: string;
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
  }>;
}

export interface CheckoutSession {
  id: string;
  tenantId: string;
  branchId: string;
  appointmentId?: string;
  customer?: CustomerInfo;
  lineItems: CheckoutLineItem[];
  appliedDiscounts: AppliedDiscount[];
  payments: PaymentEntry[];
  totals: CheckoutTotals;
  availableDiscounts: AvailableDiscount[];
  activeMemberships: MembershipInfo[];
  activePackages: PackageInfo[];
  isIgst: boolean;
  createdAt: string;
  expiresAt: string;
}
