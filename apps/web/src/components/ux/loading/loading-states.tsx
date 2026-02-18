/**
 * Loading States Components
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 10.4, 10.5
 *
 * Provides skeleton loaders and inline button loading states
 * without layout shift.
 */

'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Skeleton loader for async content
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-muted';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-md',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], animationClasses[animation], className)}
      style={style}
      aria-hidden="true"
    />
  );
}

// Skeleton for table rows
interface TableRowSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableRowSkeleton({ columns, rows = 5 }: TableRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="p-4">
              <Skeleton variant="text" className="h-4 w-full max-w-[200px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Skeleton for cards
interface CardSkeletonProps {
  showImage?: boolean;
  showActions?: boolean;
  className?: string;
}

export function CardSkeleton({ showImage, showActions, className }: CardSkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
      {showImage && <Skeleton variant="rectangular" className="h-32 w-full rounded-md" />}
      <Skeleton variant="text" className="h-5 w-3/4" />
      <Skeleton variant="text" className="h-4 w-1/2" />
      <Skeleton variant="text" className="h-4 w-full" />
      {showActions && (
        <div className="flex gap-2 pt-2">
          <Skeleton variant="rounded" className="h-8 w-20" />
          <Skeleton variant="rounded" className="h-8 w-20" />
        </div>
      )}
    </div>
  );
}

// Skeleton for list items
interface ListItemSkeletonProps {
  showAvatar?: boolean;
  showSecondaryText?: boolean;
  count?: number;
}

export function ListItemSkeleton({
  showAvatar,
  showSecondaryText,
  count = 5,
}: ListItemSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-2">
          {showAvatar && <Skeleton variant="circular" width={40} height={40} />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/3" />
            {showSecondaryText && <Skeleton variant="text" className="h-3 w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  );
}

// Inline button loading state (no layout shift)
interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export function ButtonLoading({ isLoading, children, loadingText, className }: ButtonLoadingProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText || 'Loading...'}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}

// Loading spinner with optional text
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

// Full page loading overlay
interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

export function LoadingOverlay({ isLoading, text }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    </div>
  );
}

// Skeleton for stats cards
export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <Skeleton variant="text" className="h-3 w-20" />
      <Skeleton variant="text" className="h-8 w-24" />
      <Skeleton variant="text" className="h-3 w-16" />
    </div>
  );
}

// Skeleton for calendar
export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton variant="rounded" className="h-8 w-8" />
          <Skeleton variant="rounded" className="h-8 w-8" />
        </div>
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" className="h-24 rounded" />
        ))}
      </div>
    </div>
  );
}
