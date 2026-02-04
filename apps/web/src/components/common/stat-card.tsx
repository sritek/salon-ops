/**
 * StatCard - Dashboard statistics card with optional trend indicator
 */

'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  format?: 'number' | 'currency' | 'percentage';
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  href?: string;
  className?: string;
}

function formatValue(value: number | string, format?: string): string {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-IN').format(value);
  }
}

export function StatCard({
  title,
  value,
  format,
  icon: Icon,
  trend,
  href,
  className,
}: StatCardProps) {
  const content = (
    <Card className={cn('transition-colors', href && 'hover:bg-accent/50 cursor-pointer', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{formatValue(value, format)}</p>
            
            {/* Trend indicator */}
            {trend && (
              <div className={cn(
                'flex items-center text-sm',
                trend.direction === 'up' && 'text-green-600',
                trend.direction === 'down' && 'text-red-600',
                trend.direction === 'neutral' && 'text-muted-foreground'
              )}>
                {trend.direction === 'up' && <ArrowUp className="h-4 w-4 mr-1" />}
                {trend.direction === 'down' && <ArrowDown className="h-4 w-4 mr-1" />}
                <span>{trend.value}%</span>
                <span className="ml-1 text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          
          {/* Icon */}
          {Icon && (
            <div className="rounded-full bg-primary/10 p-3">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
