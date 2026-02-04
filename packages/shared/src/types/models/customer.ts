/**
 * Customer Types
 * Based on: .cursor/rules/00-architecture.mdc lines 222-247
 */

export interface Customer {
  id: string;
  tenantId: string;
  phone: string;
  name: string;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: Date;
  anniversaryDate?: Date;
  address?: string;
  notes?: string;
  preferences: CustomerPreferences;
  allergies: string[];
  tags: string[];
  loyaltyPoints: number;
  walletBalance: number;
  noShowCount: number;
  bookingStatus: BookingStatus;
  firstVisitBranchId?: string;
  marketingConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CustomerPreferences {
  preferredStylist?: string;
  preferredServices?: string[];
  preferredTimeSlots?: string[];
  preferredLanguage?: 'en' | 'hi';
  [key: string]: unknown;
}

export type BookingStatus = 'normal' | 'vip' | 'blocked' | 'restricted';
