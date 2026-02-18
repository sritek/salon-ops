/**
 * Calendar Header Component
 * Date navigation and controls for resource calendar
 */

'use client';

import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { TimeSlotInterval } from '@/stores/calendar-store';

interface CalendarHeaderProps {
  date: string;
  timeSlotInterval: TimeSlotInterval;
  onDateChange: (direction: 'prev' | 'next' | 'today') => void;
  onIntervalChange: (interval: TimeSlotInterval) => void;
  onNewAppointment?: () => void;
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
}

export function CalendarHeader({
  date,
  timeSlotInterval,
  onDateChange,
  onIntervalChange,
  onNewAppointment,
  onFilterClick,
  hasActiveFilters = false,
}: CalendarHeaderProps) {
  const t = useTranslations('calendar');
  const dateObj = parseISO(date);

  const isToday = format(new Date(), 'yyyy-MM-dd') === date;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
      {/* Date Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange('prev')}
          aria-label={t('previousDay')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant={isToday ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateChange('today')}
        >
          {t('today')}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange('next')}
          aria-label={t('nextDay')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <span className="ml-2 text-lg font-semibold">{format(dateObj, 'EEEE, MMMM d, yyyy')}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Time Interval Selector */}
        <div className="hidden sm:flex rounded-lg border p-1">
          {([15, 30, 60] as TimeSlotInterval[]).map((interval) => (
            <Button
              key={interval}
              variant={timeSlotInterval === interval ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onIntervalChange(interval)}
              className="px-2 text-xs"
            >
              {interval}m
            </Button>
          ))}
        </div>

        {/* Filter Button */}
        {onFilterClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFilterClick}
            className={cn(hasActiveFilters && 'border-primary text-primary')}
          >
            <Filter className="h-4 w-4 mr-1" />
            {t('filter')}
            {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
          </Button>
        )}

        {/* New Appointment Button */}
        {onNewAppointment && (
          <Button size="sm" onClick={onNewAppointment}>
            <Plus className="h-4 w-4 mr-1" />
            {t('newAppointment')}
          </Button>
        )}
      </div>
    </div>
  );
}
