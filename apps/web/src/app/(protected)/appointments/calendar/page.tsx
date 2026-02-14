'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  parseISO,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
} from 'date-fns';
import { AlertTriangle, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { PERMISSIONS } from '@salon-ops/shared';

import { useCalendar } from '@/hooks/queries/use-appointments';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useAppointmentsUIStore, type CalendarView } from '@/stores/appointments-ui-store';

import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { AppointmentStatusBadge } from '../components/appointment-status-badge';

import type { CalendarAppointment, CalendarFilters } from '@/types/appointments';

export default function AppointmentCalendarPage() {
  const t = useTranslations('appointments');
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.APPOINTMENTS_WRITE);

  // Use persisted store for state
  const { currentDate, calendarView, setCurrentDate, setCalendarView } = useAppointmentsUIStore();

  // Convert stored date string to Date object
  const selectedDate = useMemo(() => {
    try {
      return parseISO(currentDate);
    } catch {
      return new Date();
    }
  }, [currentDate]);

  // Get branch from auth store (first branch)
  const user = useAuthStore((state) => state.user);
  const branchId = user?.branchIds?.[0] || '';

  const filters: CalendarFilters = {
    branchId,
    view: calendarView,
    date: format(selectedDate, 'yyyy-MM-dd'),
  };

  const { data: calendarData } = useCalendar(filters);

  // Navigation handlers
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);

  const goToPrevious = useCallback(() => {
    switch (calendarView) {
      case 'day':
        setCurrentDate(subDays(selectedDate, 1));
        break;
      case 'week':
        setCurrentDate(subWeeks(selectedDate, 1));
        break;
      case 'month':
        setCurrentDate(subMonths(selectedDate, 1));
        break;
    }
  }, [calendarView, selectedDate, setCurrentDate]);

  const goToNext = useCallback(() => {
    switch (calendarView) {
      case 'day':
        setCurrentDate(addDays(selectedDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(selectedDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(selectedDate, 1));
        break;
    }
  }, [calendarView, selectedDate, setCurrentDate]);

  const handleViewChange = useCallback(
    (view: string) => {
      setCalendarView(view as CalendarView);
    },
    [setCalendarView]
  );

  const handleDayClick = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      setCalendarView('day');
    },
    [setCurrentDate, setCalendarView]
  );

  const headerTitle = useMemo(() => {
    switch (calendarView) {
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
    }
  }, [selectedDate, calendarView]);

  return (
    <PermissionGuard permission={PERMISSIONS.APPOINTMENTS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('calendar.title')}
          description={t('calendar.description')}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/appointments">
                  <List className="mr-2 h-4 w-4" />
                  {t('calendar.listView')}
                </Link>
              </Button>
              {canWrite && (
                <Button asChild>
                  <Link href="/appointments/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('list.newAppointment')}
                  </Link>
                </Button>
              )}
            </div>
          }
        />

        <PageContent>
          {/* Calendar Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                {t('calendar.today')}
              </Button>
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold ml-2">{headerTitle}</span>
            </div>

            <Select value={calendarView} onValueChange={handleViewChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t('calendar.dayView')}</SelectItem>
                <SelectItem value="week">{t('calendar.weekView')}</SelectItem>
                <SelectItem value="month">{t('calendar.monthView')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calendar View */}
          {calendarView === 'day' && (
            <DayView
              date={selectedDate}
              appointments={calendarData?.appointments || []}
              onAppointmentClick={(id) => router.push(`/appointments/${id}`)}
            />
          )}
          {calendarView === 'week' && (
            <WeekView
              date={selectedDate}
              appointments={calendarData?.appointments || []}
              onAppointmentClick={(id) => router.push(`/appointments/${id}`)}
            />
          )}
          {calendarView === 'month' && (
            <MonthView
              date={selectedDate}
              appointments={calendarData?.appointments || []}
              onDayClick={handleDayClick}
            />
          )}

          {/* Summary */}
          {calendarData?.summary && (
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
              <span>
                {t('calendar.total')}: {calendarData.summary.total}
              </span>
              {Object.entries(calendarData.summary.byStatus).map(([status, count]) => (
                <span key={status}>
                  {status}: {count}
                </span>
              ))}
            </div>
          )}
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}

// Time slots for day/week view
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

interface DayViewProps {
  date: Date;
  appointments: CalendarAppointment[];
  onAppointmentClick: (id: string) => void;
}

function DayView({ date, appointments, onAppointmentClick }: DayViewProps) {
  const dayAppointments = appointments.filter(
    (apt) => apt.scheduledDate === format(date, 'yyyy-MM-dd')
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {TIME_SLOTS.slice(8, 21).map((time) => {
            const slotAppointments = dayAppointments.filter((apt) =>
              apt.scheduledTime.startsWith(time.split(':')[0])
            );
            return (
              <div key={time} className="flex min-h-[60px]">
                <div className="w-20 p-2 text-sm text-muted-foreground border-r">{time}</div>
                <div className="flex-1 p-2 space-y-1">
                  {slotAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onClick={() => onAppointmentClick(apt.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface WeekViewProps {
  date: Date;
  appointments: CalendarAppointment[];
  onAppointmentClick: (id: string) => void;
}

function WeekView({ date, appointments, onAppointmentClick }: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(date, { weekStartsOn: 1 }),
  });

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 border-r" />
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-r last:border-r-0 ${
                isToday(day) ? 'bg-primary/10' : ''
              }`}
            >
              <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
              <div className={`text-lg ${isToday(day) ? 'font-bold text-primary' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        {TIME_SLOTS.slice(8, 21).map((time) => (
          <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
            <div className="p-2 text-sm text-muted-foreground border-r">{time}</div>
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const slotAppointments = appointments.filter(
                (apt) =>
                  apt.scheduledDate === dayStr && apt.scheduledTime.startsWith(time.split(':')[0])
              );
              return (
                <div key={day.toISOString()} className="p-1 border-r last:border-r-0 min-h-[50px]">
                  {slotAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      compact
                      onClick={() => onAppointmentClick(apt.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface MonthViewProps {
  date: Date;
  appointments: CalendarAppointment[];
  onDayClick: (date: Date) => void;
}

function MonthView({ date, appointments, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    appointments.forEach((apt) => {
      if (!map[apt.scheduledDate]) map[apt.scheduledDate] = [];
      map[apt.scheduledDate].push(apt);
    });
    return map;
  }, [appointments]);

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header */}
        <div className="grid grid-cols-7 border-b">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayAppointments = appointmentsByDate[dayStr] || [];
            const isCurrentMonth = day.getMonth() === date.getMonth();

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-muted/50 ${
                  !isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''
                } ${isToday(day) ? 'bg-primary/10' : ''}`}
                onClick={() => onDayClick(day)}
              >
                <div className={`text-sm mb-1 ${isToday(day) ? 'font-bold text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                {dayAppointments.slice(0, 3).map((apt) => (
                  <div key={apt.id} className="text-xs p-1 mb-1 rounded bg-primary/20 truncate">
                    {apt.scheduledTime} {apt.customerName}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface AppointmentCardProps {
  appointment: CalendarAppointment;
  compact?: boolean;
  onClick: () => void;
}

function AppointmentCard({ appointment, compact, onClick }: AppointmentCardProps) {
  if (compact) {
    return (
      <div
        className={`text-xs p-1 rounded cursor-pointer hover:bg-primary/30 truncate flex items-center gap-1 ${
          appointment.hasConflict ? 'bg-yellow-200' : 'bg-primary/20'
        }`}
        onClick={onClick}
      >
        {appointment.hasConflict && (
          <AlertTriangle className="h-3 w-3 text-yellow-600 flex-shrink-0" />
        )}
        <span className="truncate">{appointment.customerName}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-2 rounded border cursor-pointer hover:bg-muted/50 ${
        appointment.hasConflict ? 'border-yellow-400 bg-yellow-50' : 'bg-card'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {appointment.hasConflict && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          <span className="font-medium text-sm">{appointment.customerName}</span>
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {appointment.scheduledTime} - {appointment.endTime}
      </div>
      <div className="text-xs text-muted-foreground">{appointment.services.join(', ')}</div>
      {appointment.hasConflict && (
        <div className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Has scheduling conflict
        </div>
      )}
    </div>
  );
}
