/**
 * Checkout Types
 * TypeScript types for checkout session management
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

// ============================================
// Checkout Line Item
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

// ============================================
// Applied Discount
// ============================================

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

// ============================================
// Payment Entry
// ============================================

export interface PaymentEntry {
  id: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'wallet' | 'loyalty';
  amount: number;
  cardLastFour?: string;
  cardType?: string;
  upiId?: string;
  transactionId?: string;
}

// ============================================
// Checkout Totals
// ============================================

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

// ============================================
// Available Discount
// ============================================

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

// ============================================
// Customer Info
// ============================================

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  walletBalance: number;
  loyaltyPoints: number;
  loyaltyPointValue: number;
}

// ============================================
// Membership Info
// ============================================

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

// ============================================
// Package Info
// ============================================

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

// ============================================
// Checkout Session
// ============================================

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

// ============================================
// Input Types
// ============================================

export interface StartCheckoutInput {
  appointmentId?: string;
  customerId?: string;
  branchId: string;
}

export interface AddItemInput {
  sessionId: string;
  itemType: 'service' | 'product' | 'combo' | 'package';
  referenceId: string;
  variantId?: string;
  quantity?: number;
  stylistId?: string;
  assistantId?: string;
}

export interface RemoveItemInput {
  sessionId: string;
  itemId: string;
}

export interface ApplyDiscountInput {
  sessionId: string;
  discountType: 'membership' | 'package' | 'coupon' | 'loyalty' | 'manual';
  discountSource?: string;
  calculationType: 'percentage' | 'flat';
  calculationValue: number;
  appliedTo: 'subtotal' | 'item';
  appliedItemId?: string;
  reason?: string;
}

export interface RemoveDiscountInput {
  sessionId: string;
  discountId: string;
}

export interface ProcessPaymentInput {
  sessionId: string;
  payments: Array<{
    paymentMethod: 'cash' | 'card' | 'upi' | 'wallet' | 'loyalty';
    amount: number;
    cardLastFour?: string;
    cardType?: 'visa' | 'mastercard' | 'rupay' | 'amex';
    upiId?: string;
    transactionId?: string;
  }>;
}

export interface CompleteCheckoutInput {
  sessionId: string;
  sendReceipt?: boolean;
  receiptMethod?: 'whatsapp' | 'email' | 'print';
  tipAmount?: number;
}

export interface CheckoutCompleteResult {
  session: CheckoutSession;
  invoiceId: string;
}
