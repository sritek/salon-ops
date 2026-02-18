'use client';

/**
 * Station View Component
 * Grid layout showing all stylist stations
 * Requirements: 4.1, 4.2, 4.12
 */

import { memo, useCallback } from 'react';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { StationCard } from './station-card';
import type { Station } from '@/types/dashboard';

interface StationViewProps {
  stations: Station[];
  isLoading?: boolean;
  onStationClick?: (station: Station) => void;
  onQuickAction?: (station: Station, action: 'book' | 'start') => void;
  className?: string;
}

function StationViewComponent({
  stations,
  isLoading,
  onStationClick,
  onQuickAction,
  className,
}: StationViewProps) {
  const handleStationClick = useCallback(
    (station: Station) => {
      if (onStationClick) {
        onStationClick(station);
      }
    },
    [onStationClick]
  );

  const handleQuickAction = useCallback(
    (station: Station, action: 'book' | 'start') => {
      if (onQuickAction) {
        onQuickAction(station, action);
      }
    },
    [onQuickAction]
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Stations</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Stations</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p>No stations configured for this branch.</p>
        </div>
      </div>
    );
  }

  // Group stations by status for summary
  const statusCounts = stations.reduce(
    (acc, station) => {
      acc[station.status] = (acc[station.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Stations</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {statusCounts.available && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {statusCounts.available} available
            </span>
          )}
          {statusCounts.occupied && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {statusCounts.occupied} occupied
            </span>
          )}
          {statusCounts.break && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              {statusCounts.break} on break
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stations.map((station) => (
          <StationCard
            key={station.id}
            station={station}
            onClick={handleStationClick}
            onQuickAction={handleQuickAction}
          />
        ))}
      </div>
    </div>
  );
}

function StationSkeleton() {
  return (
    <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-1.5 w-full" />
    </div>
  );
}

export const StationView = memo(StationViewComponent);
