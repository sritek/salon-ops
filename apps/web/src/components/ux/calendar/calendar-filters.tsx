/**
 * Calendar Filters Component
 * Filter panel for resource calendar
 */

'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTranslations } from 'next-intl';
import { useCalendarStore, type AppointmentStatus } from '@/stores/calendar-store';
import type { CalendarStylist } from '@/hooks/queries/use-resource-calendar';

interface CalendarFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stylists: CalendarStylist[];
}

const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'booked', label: 'Booked', color: 'bg-blue-400' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-400' },
  { value: 'checked_in', label: 'Checked In', color: 'bg-purple-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-purple-600' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-400' },
  { value: 'no_show', label: 'No Show', color: 'bg-orange-400' },
];

export function CalendarFilters({ open, onOpenChange, stylists }: CalendarFiltersProps) {
  const t = useTranslations('calendar');
  const { filters, toggleStylistFilter, toggleStatusFilter, clearFilters } = useCalendarStore();

  const hasActiveFilters = filters.stylistIds.length > 0 || filters.statuses.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>{t('filter')}</SheetTitle>
          <SheetDescription>Filter appointments by stylist and status</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stylists Filter */}
          <div>
            <h4 className="font-medium mb-3">{t('stylists')}</h4>
            <div className="space-y-2">
              {stylists.map((stylist) => (
                <div key={stylist.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`stylist-${stylist.id}`}
                    checked={filters.stylistIds.includes(stylist.id)}
                    onCheckedChange={() => toggleStylistFilter(stylist.id)}
                  />
                  <Label
                    htmlFor={`stylist-${stylist.id}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stylist.color }}
                    />
                    {stylist.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <h4 className="font-medium mb-3">{t('filterByStatus')}</h4>
            <div className="space-y-2">
              {APPOINTMENT_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filters.statuses.includes(status.value)}
                    onCheckedChange={() => toggleStatusFilter(status.value)}
                  />
                  <Label
                    htmlFor={`status-${status.value}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className={`w-3 h-3 rounded-full ${status.color}`} />
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                clearFilters();
                onOpenChange(false);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              {t('clearFilters')}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
