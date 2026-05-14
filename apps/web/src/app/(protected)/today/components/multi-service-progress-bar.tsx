'use client';

/**
 * Multi-Service Progress Bar Component
 * Shows a segmented progress bar for multi-service appointments
 * Each segment represents a service with its own progress
 */

import { Clock, Pause, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ServiceProgressInfo } from '@/types/stations';

interface MultiServiceProgressBarProps {
  services: ServiceProgressInfo[];
  isPaused: boolean;
  totalElapsedMinutes: number | null;
  totalRemainingMinutes: number | null;
  isOvertime: boolean;
}

// Status colors for segments
const STATUS_COLORS = {
  completed: {
    bg: 'bg-green-500',
    border: 'border-green-600',
  },
  in_progress: {
    bg: 'bg-blue-500',
    border: 'border-blue-600',
  },
  waiting: {
    bg: 'bg-gray-200 dark:bg-gray-700',
    border: 'border-gray-300 dark:border-gray-600',
  },
  skipped: {
    bg: 'bg-gray-400',
    border: 'border-gray-500',
  },
};

export function MultiServiceProgressBar({
  services,
  isPaused,
  totalElapsedMinutes,
  totalRemainingMinutes,
  isOvertime,
}: MultiServiceProgressBarProps) {
  // Calculate total duration for proportional widths
  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="space-y-2">
      {/* Timer Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1">
          {isPaused ? (
            <>
              <Pause className="h-3 w-3 text-amber-600" />
              <span className="text-amber-600 font-medium">Paused</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              <span>{totalElapsedMinutes ?? 0}m elapsed</span>
            </>
          )}
        </span>
        {isOvertime ? (
          <span className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="h-3 w-3" />
            Overtime
          </span>
        ) : isPaused ? (
          <span className="text-amber-600">Waiting for next service</span>
        ) : (
          <span>{totalRemainingMinutes ?? 0}m left</span>
        )}
      </div>

      {/* Segmented Progress Bar */}
      <TooltipProvider>
        <div className="relative h-4 w-full flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
          {services.map((service, index) => {
            const widthPercent = (service.durationMinutes / totalDuration) * 100;
            const colors = STATUS_COLORS[service.status] || STATUS_COLORS.waiting;

            return (
              <Tooltip key={service.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'relative h-full transition-all overflow-hidden',
                      // Add right border for all segments except the last one
                      index < services.length - 1 && 'border-r-2 border-white dark:border-gray-900'
                    )}
                    style={{ width: `${widthPercent}%` }}
                  >
                    {/* Background (empty part) */}
                    <div
                      className={cn(
                        'absolute inset-0',
                        service.status === 'waiting'
                          ? 'bg-gray-200 dark:bg-gray-700'
                          : service.status === 'skipped'
                            ? 'bg-gray-300 dark:bg-gray-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    />

                    {/* Filled part (progress) */}
                    {service.status !== 'waiting' && (
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 transition-all',
                          colors.bg,
                          service.isOvertime && service.status === 'in_progress' && 'bg-red-500',
                          // Pulse animation for in-progress
                          service.status === 'in_progress' && !isPaused && 'animate-pulse'
                        )}
                        style={{
                          width: `${service.progressPercent}%`,
                        }}
                      />
                    )}

                    {/* Skipped pattern overlay */}
                    {service.status === 'skipped' && (
                      <div
                        className="absolute inset-0 opacity-50"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
                        }}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-1">
                      {service.status === 'completed' && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                      {service.serviceName}
                    </div>
                    <div className="text-muted-foreground">
                      {service.status === 'completed' && (
                        <span>
                          Completed in {service.elapsedMinutes}m / {service.durationMinutes}m
                        </span>
                      )}
                      {service.status === 'in_progress' && (
                        <span>
                          {service.elapsedMinutes}m / {service.durationMinutes}m
                          {service.isOvertime && ' (overtime)'}
                        </span>
                      )}
                      {service.status === 'waiting' && (
                        <span>Waiting ({service.durationMinutes}m)</span>
                      )}
                      {service.status === 'skipped' && <span>Skipped</span>}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Service Legend (compact) */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {services.map((service, index) => (
          <span
            key={service.id}
            className={cn(
              'flex items-center gap-1',
              service.status === 'in_progress' && 'text-blue-600 font-medium',
              service.status === 'completed' && 'text-green-600',
              service.status === 'skipped' && 'line-through'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                service.status === 'completed' && 'bg-green-500',
                service.status === 'in_progress' && 'bg-blue-500',
                service.status === 'waiting' && 'bg-gray-300 dark:bg-gray-600',
                service.status === 'skipped' && 'bg-gray-400'
              )}
            />
            {index + 1}. {service.serviceName}
          </span>
        ))}
      </div>
    </div>
  );
}
