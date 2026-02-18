'use client';

/**
 * Station Card Component
 * Displays individual stylist station status
 * Requirements: 4.1, 4.2, 4.12
 */

import { memo } from 'react';
import { User, Coffee, Clock, Play } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Station } from '@/types/dashboard';

interface StationCardProps {
  station: Station;
  onClick?: (station: Station) => void;
  onQuickAction?: (station: Station, action: 'book' | 'start') => void;
}

const STATUS_STYLES = {
  available: {
    border: 'border-green-200 dark:border-green-800',
    bg: 'bg-green-50 dark:bg-green-950/30',
    indicator: 'bg-green-500',
    label: 'Available',
  },
  occupied: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    indicator: 'bg-blue-500',
    label: 'Occupied',
  },
  break: {
    border: 'border-yellow-200 dark:border-yellow-800',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    indicator: 'bg-yellow-500',
    label: 'On Break',
  },
  offline: {
    border: 'border-gray-200 dark:border-gray-700',
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    indicator: 'bg-gray-400',
    label: 'Offline',
  },
};

function StationCardComponent({ station, onClick, onQuickAction }: StationCardProps) {
  const styles = STATUS_STYLES[station.status];
  const initials = station.stylistName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleClick = () => {
    if (onClick) {
      onClick(station);
    }
  };

  const handleQuickAction = (e: React.MouseEvent, action: 'book' | 'start') => {
    e.stopPropagation();
    if (onQuickAction) {
      onQuickAction(station, action);
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 p-4 transition-all cursor-pointer hover:shadow-md',
        styles.border,
        styles.bg
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className={cn('h-2 w-2 rounded-full', styles.indicator)} />
        <span className="text-xs text-muted-foreground">{styles.label}</span>
      </div>

      {/* Stylist info */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10">
          {station.stylistAvatar && (
            <AvatarImage src={station.stylistAvatar} alt={station.stylistName || ''} />
          )}
          <AvatarFallback className="text-sm">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{station.stylistName || 'Unassigned'}</p>
          <p className="text-xs text-muted-foreground">{station.name}</p>
        </div>
      </div>

      {/* Current appointment or status */}
      {station.status === 'occupied' && station.currentAppointment ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate">{station.currentAppointment.customerName}</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {station.currentAppointment.timeRemaining}m
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {station.currentAppointment.serviceName}
          </p>
          <Progress value={station.currentAppointment.progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">
            {station.currentAppointment.startTime} - {station.currentAppointment.endTime}
          </p>
        </div>
      ) : station.status === 'break' ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Coffee className="h-5 w-5 mr-2" />
          <span className="text-sm">On Break</span>
        </div>
      ) : station.status === 'available' ? (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => handleQuickAction(e, 'book')}
          >
            <Play className="h-3 w-3 mr-1" />
            Book Now
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <span className="text-sm">Not Available</span>
        </div>
      )}
    </div>
  );
}

export const StationCard = memo(StationCardComponent);
