/**
 * Resource Calendar Component
 * Visual calendar with stylists as columns and time slots as rows
 */

'use client';

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { format, addMinutes } from 'date-fns';
import { AlertCircle, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarHeader } from './calendar-header';
import { StylistColumnHeader } from './stylist-column';
import { AppointmentBlock } from './appointment-block';
import { CurrentTimeIndicator } from './current-time-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common';
import { useCalendarStore } from '@/stores/calendar-store';
import type {
  CalendarAppointment,
  ResourceCalendarData,
} from '@/hooks/queries/use-resource-calendar';
import type { AppointmentStatus } from '@/stores/calendar-store';

interface ResourceCalendarProps {
  data: ResourceCalendarData | undefined;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onAppointmentClick: (appointmentId: string) => void;
  onSlotClick: (stylistId: string, date: string, time: string) => void;
  onAppointmentMove: (
    appointmentId: string,
    newStylistId: string | undefined,
    newDate: string,
    newTime: string
  ) => void;
  onNewAppointment?: () => void;
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
}

export function ResourceCalendar({
  data,
  isLoading,
  error,
  onRetry,
  onAppointmentClick,
  onSlotClick,
  onAppointmentMove,
  onNewAppointment,
  onFilterClick,
  hasActiveFilters = false,
}: ResourceCalendarProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<CalendarAppointment | null>(null);

  const {
    selectedDate,
    timeSlotInterval,
    setTimeSlotInterval,
    goToToday,
    goToNextDay,
    goToPreviousDay,
    filters,
  } = useCalendarStore();

  // Generate time slots based on working hours and interval
  const timeSlots = useMemo(() => {
    if (!data?.workingHours) return [];

    const slots: string[] = [];
    const [startHour, startMin] = data.workingHours.start.split(':').map(Number);
    const [endHour, endMin] = data.workingHours.end.split(':').map(Number);

    let currentTime = new Date();
    currentTime.setHours(startHour, startMin, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHour, endMin, 0, 0);

    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, timeSlotInterval);
    }

    return slots;
  }, [data?.workingHours, timeSlotInterval]);

  // Calculate slot height based on interval
  const slotHeight = useMemo(() => {
    switch (timeSlotInterval) {
      case 15:
        return 20;
      case 30:
        return 30;
      case 60:
        return 50;
      default:
        return 30;
    }
  }, [timeSlotInterval]);

  // Filter stylists based on active filters
  const filteredStylists = useMemo(() => {
    if (!data?.stylists) return [];
    if (filters.stylistIds.length === 0) return data.stylists;
    return data.stylists.filter((s) => filters.stylistIds.includes(s.id));
  }, [data?.stylists, filters.stylistIds]);

  // Filter appointments based on active filters
  const filteredAppointments = useMemo(() => {
    if (!data?.appointments) return [];
    let filtered = data.appointments;

    if (filters.stylistIds.length > 0) {
      filtered = filtered.filter(
        (apt) => apt.stylistId && filters.stylistIds.includes(apt.stylistId)
      );
    }

    if (filters.statuses.length > 0) {
      filtered = filtered.filter((apt) =>
        filters.statuses.includes(apt.status as AppointmentStatus)
      );
    }

    return filtered;
  }, [data?.appointments, filters]);

  // Handle date navigation - day view only
  const handleDateChange = useCallback(
    (direction: 'prev' | 'next' | 'today') => {
      if (direction === 'today') {
        goToToday();
      } else if (direction === 'next') {
        goToNextDay();
      } else {
        goToPreviousDay();
      }
    },
    [goToToday, goToNextDay, goToPreviousDay]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const appointmentId = event.active.id as string;
      const appointment = data?.appointments.find((apt) => apt.id === appointmentId);
      if (appointment) {
        setDraggedAppointment(appointment);
      }
    },
    [data?.appointments]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedAppointment(null);

      const { over } = event;
      if (!over || !draggedAppointment) return;

      const dropData = over.data.current as
        | {
            stylistId: string;
            date: string;
            time: string;
          }
        | undefined;

      if (!dropData) return;

      // Check if position changed
      const samePosition =
        dropData.stylistId === draggedAppointment.stylistId &&
        dropData.date === draggedAppointment.date &&
        dropData.time === draggedAppointment.startTime;

      if (samePosition) return;

      // Trigger move
      onAppointmentMove(
        draggedAppointment.id,
        dropData.stylistId !== draggedAppointment.stylistId ? dropData.stylistId : undefined,
        dropData.date,
        dropData.time
      );
    },
    [draggedAppointment, onAppointmentMove]
  );

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollContainerRef.current || !data?.workingHours) return;

    const now = new Date();
    const [startHour] = data.workingHours.start.split(':').map(Number);
    const currentHour = now.getHours();

    if (currentHour >= startHour) {
      const minutesSinceStart = (currentHour - startHour) * 60 + now.getMinutes();
      const scrollPosition = (minutesSinceStart / timeSlotInterval) * slotHeight;
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition - 100);
    }
  }, [data?.workingHours, timeSlotInterval, slotHeight]);

  // Render appointment block
  const renderAppointment = useCallback(
    (appointment: CalendarAppointment, height: number) => {
      const stylist = data?.stylists.find((s) => s.id === appointment.stylistId);
      return (
        <AppointmentBlock
          appointment={appointment}
          stylistColor={stylist?.color || '#6366f1'}
          height={height}
          onClick={() => onAppointmentClick(appointment.id)}
        />
      );
    },
    [data?.stylists, onAppointmentClick]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="flex-1 p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1">
                <Skeleton className="h-16 w-full mb-2" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={AlertCircle}
            title="Failed to load calendar"
            description={
              error.message || 'An error occurred while loading the calendar. Please try again.'
            }
            action={
              onRetry && (
                <Button onClick={onRetry} variant="outline">
                  Try Again
                </Button>
              )
            }
          />
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={AlertCircle}
            title="No calendar data"
            description="Unable to load calendar data. Please try refreshing the page."
            action={
              onRetry && (
                <Button onClick={onRetry} variant="outline">
                  Refresh
                </Button>
              )
            }
          />
        </div>
      </div>
    );
  }

  // No stylists assigned state
  if (!data.stylists || data.stylists.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={Users}
            title="No stylists assigned"
            description="Assign stylists to this branch to see the calendar and manage appointments."
            action={
              <Button onClick={() => router.push('/staff')} variant="outline">
                Manage Staff
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4">
          <CalendarHeader
            date={selectedDate}
            timeSlotInterval={timeSlotInterval}
            onDateChange={handleDateChange}
            onIntervalChange={setTimeSlotInterval}
            onNewAppointment={onNewAppointment}
            onFilterClick={onFilterClick}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Time Column */}
            <div className="flex flex-col border-r bg-muted/30 sticky left-0 z-20">
              {/* Empty header cell */}
              <div className="h-[72px] border-b flex items-end justify-center pb-2">
                <span className="text-xs text-muted-foreground">Time</span>
              </div>
              {/* Time labels */}
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="flex items-start justify-end pr-2 text-xs text-muted-foreground border-b"
                  style={{ height: `${slotHeight}px` }}
                >
                  <span className="-mt-2">{time}</span>
                </div>
              ))}
            </div>

            {/* Scrollable content */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
              {/* Stylist Headers */}
              <div className="flex sticky top-0 z-10 bg-background">
                {filteredStylists.map((stylist) => (
                  <StylistColumnHeader key={stylist.id} stylist={stylist} className="flex-1" />
                ))}
              </div>

              {/* Grid Content */}
              <div className="flex relative">
                {/* Current Time Indicator */}
                <CurrentTimeIndicator
                  workingHours={data.workingHours}
                  timeSlotInterval={timeSlotInterval}
                  slotHeight={slotHeight}
                />

                {/* Stylist Columns */}
                {filteredStylists.map((stylist) => (
                  <div key={stylist.id} className="flex flex-col flex-1 min-w-[120px]">
                    {timeSlots.map((time) => {
                      const appointment = filteredAppointments.find(
                        (apt) =>
                          apt.stylistId === stylist.id &&
                          apt.date === selectedDate &&
                          apt.startTime === time
                      );

                      const isOccupied = filteredAppointments.some(
                        (apt) =>
                          apt.stylistId === stylist.id &&
                          apt.date === selectedDate &&
                          apt.startTime <= time &&
                          apt.endTime > time
                      );

                      const isBreak = stylist.breaks.some((b) => time >= b.start && time < b.end);

                      const isBlocked = stylist.blockedSlots.some(
                        (s) => s.isFullDay || (time >= s.start && time < s.end)
                      );

                      const isOutsideHours =
                        !stylist.workingHours ||
                        time < stylist.workingHours.start ||
                        time >= stylist.workingHours.end;

                      // Render appointment at start time
                      if (appointment) {
                        const startMins =
                          parseInt(appointment.startTime.split(':')[0]) * 60 +
                          parseInt(appointment.startTime.split(':')[1]);
                        const endMins =
                          parseInt(appointment.endTime.split(':')[0]) * 60 +
                          parseInt(appointment.endTime.split(':')[1]);
                        const duration = endMins - startMins;
                        const height = (duration / timeSlotInterval) * slotHeight;

                        return (
                          <div
                            key={time}
                            className="relative border-b border-r"
                            style={{ height: `${slotHeight}px` }}
                          >
                            <div
                              className="absolute left-0.5 right-0.5 top-0 z-10 cursor-pointer"
                              style={{ height: `${height}px` }}
                            >
                              {renderAppointment(appointment, height)}
                            </div>
                          </div>
                        );
                      }

                      // Skip rendering for occupied slots (appointment spans multiple)
                      if (isOccupied && !appointment) {
                        return (
                          <div
                            key={time}
                            className="border-b border-r"
                            style={{ height: `${slotHeight}px` }}
                          />
                        );
                      }

                      // Regular empty slot
                      return (
                        <div
                          key={time}
                          onClick={() => {
                            if (!isBreak && !isBlocked && !isOutsideHours) {
                              onSlotClick(stylist.id, selectedDate, time);
                            }
                          }}
                          style={{ height: `${slotHeight}px` }}
                          className={cn(
                            'border-b border-r transition-colors',
                            isOutsideHours && 'bg-muted/50',
                            isBlocked && 'bg-red-50 dark:bg-red-950/20',
                            isBreak && 'bg-amber-50 dark:bg-amber-950/20',
                            !isBreak &&
                              !isBlocked &&
                              !isOutsideHours &&
                              'cursor-pointer hover:bg-primary/5'
                          )}
                        >
                          {isBreak && (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-xs text-amber-600 dark:text-amber-400 truncate px-1">
                                Break
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedAppointment && (
          <div className="opacity-80">
            <AppointmentBlock
              appointment={draggedAppointment}
              stylistColor={
                data.stylists.find((s) => s.id === draggedAppointment.stylistId)?.color || '#6366f1'
              }
              height={60}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
