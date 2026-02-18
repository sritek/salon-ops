/**
 * Mobile Gestures Hook
 * Provides pull-to-refresh and swipe navigation functionality
 * Requirements: 8.4, 8.6, 8.9
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullProgress: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for pull-to-refresh functionality
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;

      startY.current = e.touches[0].clientY;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing || startY.current === 0) return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) {
        startY.current = 0;
        setPullProgress(0);
        return;
      }

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      if (diff > 0) {
        // Prevent default scroll when pulling down
        e.preventDefault();
        // Apply resistance to pull
        const progress = Math.min(diff * 0.5, threshold * 1.5);
        setPullProgress(progress);
      }
    },
    [disabled, isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullProgress >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    startY.current = 0;
    currentY.current = 0;
    setPullProgress(0);
  }, [disabled, isRefreshing, onRefresh, pullProgress, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isRefreshing,
    pullProgress,
    containerRef,
  };
}

interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  disabled?: boolean;
}

interface UseSwipeNavigationReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  swipeDirection: 'left' | 'right' | null;
}

/**
 * Hook for swipe navigation between views
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  disabled = false,
}: UseSwipeNavigationOptions): UseSwipeNavigationReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    [disabled]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX.current;
      const diffY = endY - startY.current;

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
        if (diffX > 0 && onSwipeRight) {
          setSwipeDirection('right');
          onSwipeRight();
        } else if (diffX < 0 && onSwipeLeft) {
          setSwipeDirection('left');
          onSwipeLeft();
        }

        // Reset direction after animation
        setTimeout(() => setSwipeDirection(null), 300);
      }

      startX.current = 0;
      startY.current = 0;
    },
    [disabled, onSwipeLeft, onSwipeRight, threshold]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return {
    containerRef,
    swipeDirection,
  };
}

/**
 * Hook to make phone numbers tappable to call
 */
export function useTappablePhone(phone: string | null | undefined): {
  href: string | undefined;
  onClick: () => void;
} {
  const href = phone ? `tel:${phone.replace(/\D/g, '')}` : undefined;

  const onClick = useCallback(() => {
    if (phone && typeof window !== 'undefined') {
      window.location.href = `tel:${phone.replace(/\D/g, '')}`;
    }
  }, [phone]);

  return { href, onClick };
}

/**
 * Hook to detect if device supports touch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    );
  }, []);

  return isTouch;
}
