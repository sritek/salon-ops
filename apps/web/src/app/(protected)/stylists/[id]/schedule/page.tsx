'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Ban } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer, PageHeader, LoadingSpinner, ErrorState } from '@/components/common';
import { useStylistSchedule } from '@/hooks/queries/use-appointments';

import { ScheduleGrid } from './components/schedule-grid';
import { AddBreakDialog } from './components/add-break-dialog';
import { BlockSlotDialog } from './components/block-slot-dialog';

import type { StylistBreak, StylistBlockedSlot } from '@/types/appointments';

export default function StylistSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('stylistSchedule');
  const stylistId = params.id as string;

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [showAddBreak, setShowAddBreak] = useState(false);
  const [showBlockSlot, setShowBlockSlot] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const {
    data: scheduleData,
    isLoading,
    error,
    refetch,
  } = useStylistSchedule(stylistId, {
    dateFrom: format(currentWeekStart, 'yyyy-MM-dd'),
    dateTo: format(weekEnd, 'yyyy-MM-dd'),
  });

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleAddBreakSuccess = () => {
    setShowAddBreak(false);
    refetch();
  };

  const handleBlockSlotSuccess = () => {
    setShowBlockSlot(false);
    setSelectedDate(null);
    refetch();
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setShowBlockSlot(true);
  };

  // Group breaks by day of week
  const breaksByDay = useMemo(() => {
    if (!scheduleData?.breaks) return {};
    return scheduleData.breaks.reduce(
      (acc, brk) => {
        const day = brk.dayOfWeek ?? -1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(brk);
        return acc;
      },
      {} as Record<number, StylistBreak[]>
    );
  }, [scheduleData?.breaks]);

  // Group blocked slots by date
  const blockedByDate = useMemo(() => {
    if (!scheduleData?.blockedSlots) return {};
    return scheduleData.blockedSlots.reduce(
      (acc, slot) => {
        const date = slot.blockedDate;
        if (!acc[date]) acc[date] = [];
        acc[date].push(slot);
        return acc;
      },
      {} as Record<string, StylistBlockedSlot[]>
    );
  }, [scheduleData?.blockedSlots]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    if (!scheduleData?.appointments) return {};
    return scheduleData.appointments.reduce(
      (acc, apt) => {
        const date = apt.scheduledDate;
        if (!acc[date]) acc[date] = [];
        acc[date].push(apt);
        return acc;
      },
      {} as Record<string, typeof scheduleData.appointments>
    );
  }, [scheduleData?.appointments]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState
          title={t('error.title')}
          description={t('error.description')}
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={
          scheduleData?.stylist?.name ? `${scheduleData.stylist.name} - ${t('title')}` : t('title')
        }
        description={t('description')}
        backHref="/staff"
        backLabel={t('backToStaff')}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddBreak(true)}>
            <Clock className="h-4 w-4 mr-2" />
            {t('addBreak')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBlockSlot(true)}>
            <Ban className="h-4 w-4 mr-2" />
            {t('blockSlot')}
          </Button>
        </div>
      </PageHeader>

      {/* Week Navigation */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                {t('today')}
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-lg font-medium">
              {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>{t('legend.appointment')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>{t('legend.break')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>{t('legend.blocked')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <ScheduleGrid
        weekDays={weekDays}
        breaksByDay={breaksByDay}
        blockedByDate={blockedByDate}
        appointmentsByDate={appointmentsByDate}
        onDayClick={handleDayClick}
        stylistId={stylistId}
      />

      {/* Add Break Dialog */}
      <AddBreakDialog
        open={showAddBreak}
        onOpenChange={setShowAddBreak}
        stylistId={stylistId}
        onSuccess={handleAddBreakSuccess}
      />

      {/* Block Slot Dialog */}
      <BlockSlotDialog
        open={showBlockSlot}
        onOpenChange={setShowBlockSlot}
        stylistId={stylistId}
        initialDate={selectedDate}
        onSuccess={handleBlockSlotSuccess}
      />
    </PageContainer>
  );
}
