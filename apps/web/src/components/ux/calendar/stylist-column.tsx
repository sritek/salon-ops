/**
 * Stylist Column Component
 * Individual stylist column in the resource calendar
 */

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CalendarStylist, CalendarAppointment } from '@/hooks/queries/use-resource-calendar';

interface StylistColumnHeaderProps {
  stylist: CalendarStylist;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StylistColumnHeader({
  stylist,
  isSelected = false,
  onClick,
  className,
}: StylistColumnHeaderProps) {
  const initials = stylist.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-2 border-b border-r bg-muted/30',
        'min-w-[120px] sticky top-0 z-10',
        onClick && 'cursor-pointer hover:bg-muted/50',
        isSelected && 'bg-primary/10 border-primary',
        className
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={stylist.avatar || undefined} alt={stylist.name} />
          <AvatarFallback
            style={{ backgroundColor: stylist.color }}
            className="text-white text-sm font-medium"
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Availability indicator */}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
            stylist.isAvailable ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      </div>
      <span className="text-sm font-medium truncate max-w-[100px]">{stylist.name}</span>
      {!stylist.isAvailable && <span className="text-xs text-muted-foreground">Unavailable</span>}
    </div>
  );
}

interface StylistColumnProps {
  stylist: CalendarStylist;
  appointments: CalendarAppointment[];
  timeSlots: string[];
  date: string;
  slotHeight: number;
  onSlotClick: (stylistId: string, time: string) => void;
  onAppointmentClick: (appointmentId: string) => void;
  renderAppointment: (appointment: CalendarAppointment, slotHeight: number) => React.ReactNode;
}

export function StylistColumn({
  stylist,
  appointments,
  timeSlots,
  date,
  slotHeight,
  onSlotClick,
  onAppointmentClick,
  renderAppointment,
}: StylistColumnProps) {
  // Check if a time is within a break
  const isBreakTime = (time: string): { isBreak: boolean; name?: string } => {
    for (const breakItem of stylist.breaks) {
      if (time >= breakItem.start && time < breakItem.end) {
        return { isBreak: true, name: breakItem.name };
      }
    }
    return { isBreak: false };
  };

  // Check if a time is blocked
  const isBlockedTime = (time: string): boolean => {
    for (const slot of stylist.blockedSlots) {
      if (slot.isFullDay) return true;
      if (time >= slot.start && time < slot.end) return true;
    }
    return false;
  };

  // Check if time is outside working hours
  const isOutsideWorkingHours = (time: string): boolean => {
    if (!stylist.workingHours) return true;
    return time < stylist.workingHours.start || time >= stylist.workingHours.end;
  };

  // Get appointment at a specific time slot
  const getAppointmentAtTime = (time: string): CalendarAppointment | undefined => {
    return appointments.find(
      (apt) =>
        apt.stylistId === stylist.id &&
        apt.date === date &&
        apt.startTime <= time &&
        apt.endTime > time
    );
  };

  // Check if this is the start of an appointment
  const isAppointmentStart = (time: string): CalendarAppointment | undefined => {
    return appointments.find(
      (apt) => apt.stylistId === stylist.id && apt.date === date && apt.startTime === time
    );
  };

  return (
    <div className="flex flex-col min-w-[120px]">
      {timeSlots.map((time) => {
        const breakInfo = isBreakTime(time);
        const blocked = isBlockedTime(time);
        const outsideHours = isOutsideWorkingHours(time);
        const appointmentStart = isAppointmentStart(time);
        const appointmentAtTime = getAppointmentAtTime(time);

        // If this slot has an appointment starting, render it
        if (appointmentStart) {
          // Calculate appointment height based on duration
          const startMinutes =
            parseInt(appointmentStart.startTime.split(':')[0]) * 60 +
            parseInt(appointmentStart.startTime.split(':')[1]);
          const endMinutes =
            parseInt(appointmentStart.endTime.split(':')[0]) * 60 +
            parseInt(appointmentStart.endTime.split(':')[1]);
          const durationMinutes = endMinutes - startMinutes;
          const appointmentHeight = (durationMinutes / 30) * slotHeight; // Assuming 30min base

          return (
            <div
              key={time}
              className="relative border-b border-r"
              style={{ height: `${slotHeight}px` }}
            >
              <div
                className="absolute left-0 right-0 top-0 z-10"
                style={{ height: `${appointmentHeight}px` }}
                onClick={() => onAppointmentClick(appointmentStart.id)}
              >
                {renderAppointment(appointmentStart, appointmentHeight)}
              </div>
            </div>
          );
        }

        // If this slot is covered by an ongoing appointment, render empty
        if (appointmentAtTime) {
          return (
            <div key={time} className="border-b border-r" style={{ height: `${slotHeight}px` }} />
          );
        }

        // Regular slot
        return (
          <div
            key={time}
            onClick={() => {
              if (!breakInfo.isBreak && !blocked && !outsideHours) {
                onSlotClick(stylist.id, time);
              }
            }}
            style={{ height: `${slotHeight}px` }}
            className={cn(
              'border-b border-r transition-colors',
              outsideHours && 'bg-muted/50',
              blocked && 'bg-red-50 dark:bg-red-950/20',
              breakInfo.isBreak && 'bg-amber-50 dark:bg-amber-950/20',
              !breakInfo.isBreak && !blocked && !outsideHours && 'cursor-pointer hover:bg-primary/5'
            )}
            title={breakInfo.isBreak ? breakInfo.name : blocked ? 'Blocked' : undefined}
          >
            {breakInfo.isBreak && (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-amber-600 dark:text-amber-400 truncate px-1">
                  {breakInfo.name || 'Break'}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
