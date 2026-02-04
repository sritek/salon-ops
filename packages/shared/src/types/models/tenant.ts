/**
 * Tenant (Business) Types
 * Based on: .cursor/rules/00-architecture.mdc lines 149-166
 */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  legalName?: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  settings: TenantSettings;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface TenantSettings {
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  theme?: string;
  [key: string]: unknown;
}

export type SubscriptionPlan = 'trial' | 'starter' | 'professional' | 'enterprise';

export type SubscriptionStatus = 'active' | 'inactive' | 'suspended' | 'cancelled';

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  timezone: string;
  currency: string;
  workingHours?: WorkingHours;
  settings: BranchSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface WorkingHours {
  [day: string]: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    breaks?: { start: string; end: string }[];
  };
}

export interface BranchSettings {
  [key: string]: unknown;
}
