'use client';

import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/common';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { BookingStatus, CustomTag } from '@/types/customers';

// ============================================
// Constants
// ============================================

const SYSTEM_TAGS = ['New', 'Regular', 'VIP', 'Inactive'];

// ============================================
// Types
// ============================================

export interface CustomerFiltersState {
  search: string;
  tag: string;
  status: string;
}

interface CustomerFiltersProps {
  filters: CustomerFiltersState;
  onFiltersChange: (filters: CustomerFiltersState) => void;
  customTags?: CustomTag[];
}

// ============================================
// Component
// ============================================

export function CustomerFilters({
  filters,
  onFiltersChange,
  customTags = [],
}: CustomerFiltersProps) {
  const t = useTranslations('customers');
  const allTags = [...SYSTEM_TAGS, ...customTags.map((t) => t.name)];

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleTagChange = (value: string) => {
    onFiltersChange({ ...filters, tag: value });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value });
  };

  const statusOptions: { value: BookingStatus | 'all'; labelKey: string }[] = [
    { value: 'all', labelKey: 'allStatus' },
    { value: 'normal', labelKey: 'normal' },
    { value: 'vip', labelKey: 'vip' },
    { value: 'blocked', labelKey: 'blocked' },
    { value: 'restricted', labelKey: 'restricted' },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <SearchInput
        value={filters.search}
        onChange={handleSearchChange}
        placeholder={t('list.searchPlaceholder')}
        className="flex-1 max-w-sm"
      />

      <div className="flex flex-wrap gap-2">
        <Select value={filters.tag} onValueChange={handleTagChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('filters.allTags')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allTags')}</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('filters.allStatus')} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`filters.${option.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
