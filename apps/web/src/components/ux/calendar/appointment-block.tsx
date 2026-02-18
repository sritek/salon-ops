/**
 * Appointment Block Component
 * Visual representation of an appointment in the calendar
 * Supports drag-and-drop for rescheduling
 */

'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth-store';
import { maskPhoneNumber, shouldMaskPhoneForRole } from '@/lib/phone-masking';
import type { CalendarAppointment } from '@/hooks/queries/use-resource-calendar';

interface AppointmentBlockProps {
  appointment: CalendarAppointment;
  stylistColor: string;
  height: number;
  isDragging?: boolean;
  onClick?: () => void;
}

// Status color mapping
const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  booked: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
  },
  confirmed: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-400',
    text: 'text-green-700 dark:text-green-300',
  },
  checked_in: {
    bg: 'bg-purple-100 dark:bg-purple-950/40',
    border: 'border-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
  },
  in_progress: {
    bg: 'bg-purple-200 dark:bg-purple-900/50',
    border: 'border-purple-600',
    text: 'text-purple-800 dark:text-purple-200',
  },
  completed: {
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    border: 'border-gray-400',
    text: 'text-gray-600 dark:text-gray-400',
  },
  cancelled: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-400',
    text: 'text-red-600 dark:text-red-400 line-through',
  },
  no_show: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-400',
    text: 'text-orange-600 dark:text-orange-400',
  },
};

// Status labels for display
const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

// Booking type labels
const BOOKING_TYPE_LABELS: Record<string, string> = {
  online: 'Online',
  phone: 'Phone',
  walk_in: 'Walk-in',
};

function AppointmentTooltip({ appointment }: { appointment: CalendarAppointment }) {
  const { user } = useAuthStore();
  const shouldMask = user?.role ? shouldMaskPhoneForRole(user.role) : false;

  // Safe access to services array
  const services = appointment.services || [];

  return (
    <div className="space-y-2 text-sm">
      <div className="font-semibold">{appointment.customerName || 'Unknown Customer'}</div>
      {appointment.customerPhone && (
        <div className="text-muted-foreground">
          {shouldMask ? maskPhoneNumber(appointment.customerPhone) : appointment.customerPhone}
        </div>
      )}
      {services.length > 0 && (
        <div className="border-t pt-2">
          <div className="font-medium">Services:</div>
          <ul className="list-disc list-inside">
            {services.map((service, idx) => (
              <li key={idx}>{service}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-between border-t pt-2">
        <span>Time:</span>
        <span className="font-medium">
          {appointment.startTime || '--:--'} - {appointment.endTime || '--:--'}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Status:</span>
        <span className="font-medium">
          {STATUS_LABELS[appointment.status] || appointment.status || 'Unknown'}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Type:</span>
        <span className="font-medium">
          {BOOKING_TYPE_LABELS[appointment.bookingType] || appointment.bookingType || 'Unknown'}
        </span>
      </div>
      {appointment.totalAmount != null && appointment.totalAmount > 0 && (
        <div className="flex justify-between border-t pt-2">
          <span>Total:</span>
          <span className="font-medium">₹{appointment.totalAmount.toLocaleString('en-IN')}</span>
        </div>
      )}
      {appointment.hasConflict && (
        <div className="text-red-500 font-medium border-t pt-2">
          ⚠️ This appointment has a conflict
        </div>
      )}
    </div>
  );
}

export function AppointmentBlock({
  appointment,
  stylistColor,
  height,
  isDragging = false,
  onClick,
}: AppointmentBlockProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: appointment.id,
    data: {
      appointment,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const statusStyle = STATUS_STYLES[appointment.status] || STATUS_STYLES.booked;
  const isCompact = height < 40;
  const showServices = height >= 50;
  const services = appointment.services || [];

  const blockContent = (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        height: `${height}px`,
        borderLeftColor: stylistColor,
      }}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'rounded-r-md border-l-4 px-2 py-1 overflow-hidden cursor-pointer relative',
        'transition-shadow hover:shadow-md',
        statusStyle.bg,
        statusStyle.border,
        isDragging && 'shadow-lg ring-2 ring-primary opacity-80',
        appointment.hasConflict && 'ring-2 ring-red-500'
      )}
    >
      {/* Customer Name */}
      <div
        className={cn('font-medium truncate', statusStyle.text, isCompact ? 'text-xs' : 'text-sm')}
      >
        {appointment.customerName || 'Unknown Customer'}
      </div>

      {/* Services */}
      {showServices && services.length > 0 && (
        <div className="text-xs text-muted-foreground truncate">{services.join(', ')}</div>
      )}

      {/* Time (only if enough space) */}
      {height >= 60 && (
        <div className="text-xs text-muted-foreground mt-0.5">
          {appointment.startTime} - {appointment.endTime}
        </div>
      )}

      {/* Booking type indicator */}
      {appointment.bookingType === 'walk_in' && (
        <span className="absolute top-1 right-1 text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1 rounded">
          W
        </span>
      )}

      {/* Conflict indicator */}
      {appointment.hasConflict && (
        <span className="absolute top-1 right-1 text-xs bg-red-500 text-white px-1 rounded">!</span>
      )}

      {/* In-progress animation */}
      {appointment.status === 'in_progress' && (
        <div className="absolute inset-0 bg-purple-400/10 animate-pulse pointer-events-none" />
      )}
    </div>
  );

  // Wrap with tooltip for hover details
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{blockContent}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <AppointmentTooltip appointment={appointment} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
