/**
 * Pull to Refresh Component
 * Wrapper component that adds pull-to-refresh functionality
 * Requirements: 8.4
 */

'use client';

import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/use-mobile-gestures';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const { isRefreshing, pullProgress, containerRef } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  const showIndicator = pullProgress > 0 || isRefreshing;
  const indicatorProgress = Math.min(pullProgress / 80, 1);

  return (
    <div ref={containerRef} className={cn('relative overflow-auto', className)}>
      {/* Pull indicator */}
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: indicatorProgress,
            y: pullProgress - 40,
          }}
          className="absolute left-1/2 -translate-x-1/2 z-10"
        >
          <div
            className={cn(
              'flex items-center justify-center',
              'w-10 h-10 rounded-full bg-background shadow-md border'
            )}
          >
            <RefreshCw
              className={cn('h-5 w-5 text-muted-foreground', isRefreshing && 'animate-spin')}
              style={{
                transform: isRefreshing ? undefined : `rotate(${indicatorProgress * 360}deg)`,
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div
        style={{
          transform: pullProgress > 0 ? `translateY(${pullProgress}px)` : undefined,
          transition: pullProgress === 0 ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
