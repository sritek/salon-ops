/**
 * Customer Types
 * Based on: .cursor/rules/00-architecture.mdc lines 222-247
 */

export interface Customer {
  id: string;
  tenantId: string;
  phone: string;
  name: string;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  dateOfBirth?: Date | null;
  anniversaryDate?: Date | null;
  address?: string | null;
  preferences: CustomerPreferences;
  allergies: string[];
  tags: string[];
  loyaltyPoints: number;
  walletBalance: number;
  noShowCount: number;
  bookingStatus: BookingStatus;
  firstVisitBranchId?: string | null;
  marketingConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CustomerPreferences {
  preferredStylist?: string;
  preferredServices?: string[];
  preferredTimeSlots?: string[];
  preferredLanguage?: 'en' | 'hi';
  [key: string]: unknown;
}

export type BookingStatus = 'normal' | 'vip' | 'blocked' | 'restricted';

/**
 * Customer Note
 */
export interface CustomerNote {
  id: string;
  tenantId: string;
  customerId: string;
  content: string;
  createdBy?: string | null;
  createdAt: Date;
}

/**
 * Loyalty Transaction Types
 */
export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'adjusted' | 'expired';

export interface LoyaltyTransaction {
  id: string;
  tenantId: string;
  customerId: string;
  type: LoyaltyTransactionType;
  points: number;
  balance: number;
  reference?: string | null;
  reason?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

/**
 * Wallet Transaction Types
 */
export type WalletTransactionType = 'credit' | 'debit' | 'adjustment' | 'refund';

export interface WalletTransaction {
  id: string;
  tenantId: string;
  customerId: string;
  type: WalletTransactionType;
  amount: number;
  balance: number;
  reference?: string | null;
  reason?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

/**
 * Custom Tag
 */
export interface CustomTag {
  id: string;
  tenantId: string;
  name: string;
  color?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

/**
 * System tags that are auto-managed
 */
export const SYSTEM_TAGS = ['New', 'Regular', 'VIP', 'Inactive'] as const;
export type SystemTag = (typeof SYSTEM_TAGS)[number];

/**
 * Loyalty Configuration
 */
export interface LoyaltyConfig {
  id: string;
  tenantId: string;
  pointsPerUnit: number;
  redemptionValuePerPoint: number;
  expiryDays?: number | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Customer Filters for list/search
 */
export interface CustomerFilters {
  search?: string;
  tags?: string[];
  gender?: 'male' | 'female' | 'other';
  bookingStatus?: BookingStatus;
  branchId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'loyaltyPoints' | 'walletBalance';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Customer Statistics
 */
export interface CustomerStats {
  totalSpend: number;
  visitCount: number;
  avgTicketSize: number;
  firstVisitDate?: Date | null;
  lastVisitDate?: Date | null;
  firstVisitBranchId?: string | null;
  mostVisitedBranchId?: string | null;
  loyaltyPoints: number;
  walletBalance: number;
  noShowCount: number;
}

/**
 * Customer with related data
 */
export interface CustomerWithNotes extends Customer {
  customerNotes?: CustomerNote[];
}

/**
 * Loyalty balance response
 */
export interface LoyaltyBalanceResponse {
  balance: number;
  transactions: {
    data: LoyaltyTransaction[];
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Wallet balance response
 */
export interface WalletBalanceResponse {
  balance: number;
  transactions: {
    data: WalletTransaction[];
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Adjust loyalty points request
 */
export interface AdjustLoyaltyRequest {
  type: 'credit' | 'debit';
  points: number;
  reason: string;
}

/**
 * Adjust wallet balance request
 */
export interface AdjustWalletRequest {
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
}
