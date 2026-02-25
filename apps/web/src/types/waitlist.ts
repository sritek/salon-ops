/**
 * Waitlist Types
 * Based on: .kiro/specs/waitlist-unassigned-appointments/design.md
 */

import type { Customer } from './customers';
import type { Service } from './services';

// Time period options for waitlist preferences
export type TimePeriod = 'morning' | 'afternoon' | 'evening';

// Waitlist entry status
export type WaitlistStatus = 'active' | 'converted' | 'expired' | 'removed';

// Waitlist entry interface
export interface WaitlistEntry {
  id: string;
  tenantId: string;
  branchId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  serviceIds: string[];
  preferredStylistId?: string;
  preferredStartDate: string; // YYYY-MM-DD
  preferredEndDate: string; // YYYY-MM-DD
  timePreferences: TimePeriod[];
  status: WaitlistStatus;
  appointmentId?: string;
  convertedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  // Populated relations
  customer?: Customer;
  services?: Service[];
  preferredStylist?: {
    id: string;
    name: string;
  };
}

// Waitlist entry with smart matching score
export interface WaitlistMatch extends WaitlistEntry {
  matchScore: number; // 0-100, higher is better match
  matchReasons: string[];
}

// Create waitlist entry request
export interface CreateWaitlistEntryRequest {
  branchId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  serviceIds: string[];
  preferredStylistId?: string;
  preferredStartDate: string;
  preferredEndDate: string;
  timePreferences: TimePeriod[];
  notes?: string;
}

// Update waitlist entry request
export interface UpdateWaitlistEntryRequest {
  customerName?: string;
  customerPhone?: string;
  serviceIds?: string[];
  preferredStylistId?: string;
  preferredStartDate?: string;
  preferredEndDate?: string;
  timePreferences?: TimePeriod[];
  notes?: string;
}

// Convert waitlist entry to appointment request
export interface ConvertWaitlistRequest {
  scheduledDate: string;
  scheduledTime: string;
  stylistId?: string;
}

// List waitlist query params
export interface ListWaitlistParams {
  branchId?: string;
  status?: WaitlistStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Match waitlist query params
export interface MatchWaitlistParams {
  branchId: string;
  date: string;
  time: string;
  durationMinutes: number;
}

// Time period display info
export const TIME_PERIOD_INFO: Record<TimePeriod, { label: string; range: string }> = {
  morning: { label: 'Morning', range: '9:00 AM - 12:00 PM' },
  afternoon: { label: 'Afternoon', range: '12:00 PM - 5:00 PM' },
  evening: { label: 'Evening', range: '5:00 PM - 9:00 PM' },
};

// Waitlist status display info
export const WAITLIST_STATUS_INFO: Record<WaitlistStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'green' },
  converted: { label: 'Converted', color: 'blue' },
  expired: { label: 'Expired', color: 'gray' },
  removed: { label: 'Removed', color: 'red' },
};
