'use client';

/**
 * Next Up Queue Component
 * Displays upcoming appointments and walk-ins
 * Requirements: 4.3
 */

import { memo, useCallback } from 'react';
import { Clock, UserCheck, AlertCircle, Hash, Phone } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UpcomingAppointment, WalkInEntry } from '@/types/dashboard';

interface NextUpQueueProps {
  appointments: UpcomingAppointment[];
  walkIns: WalkInEntry[];
  isLoading?: boolean;
  onAppointmentClick?: (id: string) => void;
  onCheckIn?: (id: string) => void;
  onWalkInClick?: (id: string) => void;
  onCallWalkIn?: (id: string) => void;
  className?: string;
}

const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  booked: 'outline',
  confirmed: 'secondary',
  checked_in: 'default',
  waiting: 'outline',
  called: 'secondary',
  serving: 'default',
};

function NextUpQueueComponent({
  appointments,
  walkIns,
  isLoading,
  onAppointmentClick,
  onCheckIn,
  onWalkInClick,
  onCallWalkIn,
  className,
}: NextUpQueueProps) {
  const handleAppointmentClick = useCallback(
    (id: string) => {
      if (onAppointmentClick) {
        onAppointmentClick(id);
      }
    },
    [onAppointmentClick]
  );

  const handleCheckIn = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (onCheckIn) {
        onCheckIn(id);
      }
    },
    [onCheckIn]
  );

  const handleWalkInClick = useCallback(
    (id: string) => {
      if (onWalkInClick) {
        onWalkInClick(id);
      }
    },
    [onWalkInClick]
  );

  const handleCallWalkIn = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (onCallWalkIn) {
        onCallWalkIn(id);
      }
    },
    [onCallWalkIn]
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <h3 className="text-lg font-semibold">Next Up</h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <QueueItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const hasItems = appointments.length > 0 || walkIns.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Next Up</h3>
        {hasItems && (
          <span className="text-sm text-muted-foreground">
            {appointments.length} appointments, {walkIns.length} walk-ins
          </span>
        )}
      </div>

      {!hasItems ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No upcoming appointments or walk-ins</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {/* Appointments */}
            {appointments.map((apt) => (
              <AppointmentRow
                key={apt.id}
                appointment={apt}
                onClick={() => handleAppointmentClick(apt.id)}
                onCheckIn={(e) => handleCheckIn(e, apt.id)}
              />
            ))}

            {/* Walk-ins */}
            {walkIns.map((walkIn) => (
              <WalkInRow
                key={walkIn.id}
                walkIn={walkIn}
                onClick={() => handleWalkInClick(walkIn.id)}
                onCall={(e) => handleCallWalkIn(e, walkIn.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface AppointmentRowProps {
  appointment: UpcomingAppointment;
  onClick: () => void;
  onCheckIn: (e: React.MouseEvent) => void;
}

function AppointmentRow({ appointment, onClick, onCheckIn }: AppointmentRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50',
        appointment.isLate && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Time */}
      <div className="flex flex-col items-center min-w-[50px]">
        <span className="text-sm font-medium">{appointment.scheduledTime}</span>
        {appointment.isLate && <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{appointment.customerName}</span>
          <Badge
            variant={STATUS_BADGE_VARIANTS[appointment.status] || 'outline'}
            className="text-xs"
          >
            {appointment.status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {appointment.services.join(', ')} • {appointment.stylistName}
        </p>
      </div>

      {/* Actions */}
      {appointment.status !== 'checked_in' && (
        <Button variant="outline" size="sm" onClick={onCheckIn} className="shrink-0">
          <UserCheck className="h-3 w-3 mr-1" />
          Check In
        </Button>
      )}
    </div>
  );
}

interface WalkInRowProps {
  walkIn: WalkInEntry;
  onClick: () => void;
  onCall: (e: React.MouseEvent) => void;
}

function WalkInRow({ walkIn, onClick, onCall }: WalkInRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50',
        'border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30',
        walkIn.waitTime >= 20 &&
          'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Token */}
      <div className="flex flex-col items-center min-w-[50px]">
        <div className="flex items-center gap-1 text-lg font-bold text-purple-600 dark:text-purple-400">
          <Hash className="h-4 w-4" />
          {walkIn.tokenNumber}
        </div>
        <span className="text-xs text-muted-foreground">{walkIn.waitTime}m wait</span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{walkIn.customerName}</span>
          <Badge variant={STATUS_BADGE_VARIANTS[walkIn.status] || 'outline'} className="text-xs">
            {walkIn.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{walkIn.services.join(', ')}</p>
      </div>

      {/* Actions */}
      {walkIn.status === 'waiting' && (
        <Button variant="outline" size="sm" onClick={onCall} className="shrink-0">
          <Phone className="h-3 w-3 mr-1" />
          Call
        </Button>
      )}
    </div>
  );
}

function QueueItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <Skeleton className="h-10 w-12" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

export const NextUpQueue = memo(NextUpQueueComponent);
