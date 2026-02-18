'use client';

import { useTranslations } from 'next-intl';

import { SearchInput, DatePicker } from '@/components/common';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStaffList } from '@/hooks/queries/use-staff';

import type { AppointmentStatus, BookingType } from '@/types/appointments';

// ============================================
// Types
// ============================================

export interface AppointmentFiltersState {
  search: string;
  date: Date | undefined;
  status: string;
  bookingType: string;
  stylistId: string;
}

interface AppointmentFiltersProps {
  filters: AppointmentFiltersState;
  onFiltersChange: (filters: AppointmentFiltersState) => void;
}

// ============================================
// Constants
// ============================================

const statusOptions: { value: AppointmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'booked', label: 'Booked' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const bookingTypeOptions: { value: BookingType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'online', label: 'Online' },
  { value: 'phone', label: 'Phone' },
  { value: 'walk_in', label: 'Walk-in' },
];

// ============================================
// Component
// ============================================

export function AppointmentFilters({ filters, onFiltersChange }: AppointmentFiltersProps) {
  const t = useTranslations('appointments');

  // Get stylists for filter dropdown
  const { data: staffData } = useStaffList({ role: 'stylist', limit: 100 });
  const stylists = (staffData?.data || []).map((staff) => ({
    id: staff.user?.id || staff.userId,
    name: staff.user?.name || 'Unknown',
  }));

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleDateChange = (date: Date | undefined) => {
    onFiltersChange({ ...filters, date });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handleBookingTypeChange = (value: string) => {
    onFiltersChange({ ...filters, bookingType: value });
  };

  const handleStylistChange = (value: string) => {
    onFiltersChange({ ...filters, stylistId: value });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <SearchInput
        value={filters.search}
        onChange={handleSearchChange}
        placeholder={t('list.searchPlaceholder')}
        className="flex-1 max-w-sm"
      />

      <div className="flex flex-wrap gap-2">
        {/* Date Picker */}
        <DatePicker
          value={filters.date}
          onChange={handleDateChange}
          placeholder={t('filters.selectDate')}
          className="w-[180px]"
          align="end"
        />

        {/* Stylist Filter */}
        <Select value={filters.stylistId} onValueChange={handleStylistChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Stylists" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stylists</SelectItem>
            {stylists.map((stylist) => (
              <SelectItem key={stylist.id} value={stylist.id}>
                {stylist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('filters.allStatus')} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Booking Type Filter */}
        <Select value={filters.bookingType} onValueChange={handleBookingTypeChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t('filters.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            {bookingTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
