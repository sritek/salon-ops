'use client';

/**
 * Quick Stats Component
 * Displays key metrics for the Command Center dashboard
 * Requirements: 4.8
 */

import { memo } from 'react';
import { DollarSign, Calendar, Users, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PulseOnChange } from '@/components/ux/feedback';
import type { QuickStats as QuickStatsType } from '@/types/dashboard';

interface QuickStatsProps {
  stats: QuickStatsType | null;
  isLoading?: boolean;
  className?: string;
}

interface StatCardProps {
  icon: typeof DollarSign;
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  iconColor?: string;
}

function StatCard({ icon: Icon, label, value, trend, trendLabel, iconColor }: StatCardProps) {
  const TrendIcon =
    trend === undefined || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendColor =
    trend === undefined || trend === 0
      ? 'text-muted-foreground'
      : trend > 0
        ? 'text-green-500'
        : 'text-red-500';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-muted', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <div className="flex items-center gap-2">
              <PulseOnChange value={value}>
                <span className="text-2xl font-bold tabular-nums">{value}</span>
              </PulseOnChange>
              {trend !== undefined && (
                <div className={cn('flex items-center gap-0.5 text-xs', trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(trend)}%</span>
                </div>
              )}
            </div>
            {trendLabel && <p className="text-xs text-muted-foreground">{trendLabel}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function QuickStatsComponent({ stats, isLoading, className }: QuickStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <StatCard
        icon={DollarSign}
        label="Today's Revenue"
        value={formatCurrency(stats.todayRevenue)}
        trend={stats.revenueChange}
        trendLabel="vs yesterday"
        iconColor="text-green-600"
      />
      <StatCard
        icon={Calendar}
        label="Appointments"
        value={`${stats.appointmentsCompleted}/${stats.appointmentsCompleted + stats.appointmentsRemaining}`}
        trendLabel={`${stats.appointmentsRemaining} remaining`}
        iconColor="text-blue-600"
      />
      <StatCard
        icon={Users}
        label="Walk-ins Served"
        value={stats.walkInsServed}
        trendLabel={stats.noShows > 0 ? `${stats.noShows} no-shows` : 'No no-shows'}
        iconColor="text-purple-600"
      />
      <StatCard
        icon={Clock}
        label="Avg Wait Time"
        value={`${stats.averageWaitTime}m`}
        trendLabel={`${stats.occupancyRate}% occupancy`}
        iconColor="text-orange-600"
      />
    </div>
  );
}

export const QuickStats = memo(QuickStatsComponent);
