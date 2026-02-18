/**
 * useLongPress Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 3.7
 *
 * Hook for detecting long-press gestures on touch devices.
 * Used to trigger action menus on mobile.
 */

import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  /** Duration in ms to trigger long press (default: 500ms) */
  threshold?: number;
  /** Callback when long press is triggered */
  onLongPress: () => void;
  /** Optional callback for regular click */
  onClick?: () => void;
  /** Disable long press detection */
  disabled?: boolean;
}

interface UseLongPressReturn {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

/**
 * Hook for detecting long-press gestures
 *
 * @example
 * ```tsx
 * const longPressHandlers = useLongPress({
 *   onLongPress: () => setShowActions(true),
 *   onClick: () => handleClick(),
 * });
 *
 * return <div {...longPressHandlers}>Press and hold</div>;
 * ```
 */
export function useLongPress({
  threshold = 500,
  onLongPress,
  onClick,
  disabled = false,
}: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (x: number, y: number) => {
      if (disabled) return;

      isLongPressRef.current = false;
      startPosRef.current = { x, y };

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
      }, threshold);
    },
    [disabled, onLongPress, threshold]
  );

  const cancel = useCallback(
    (shouldTriggerClick = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (shouldTriggerClick && !isLongPressRef.current && onClick) {
        onClick();
      }

      startPosRef.current = null;
    },
    [onClick]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      start(e.clientX, e.clientY);
    },
    [start]
  );

  const onMouseUp = useCallback(() => {
    cancel(true);
  }, [cancel]);

  const onMouseLeave = useCallback(() => {
    cancel(false);
  }, [cancel]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        start(touch.clientX, touch.clientY);
      }
    },
    [start]
  );

  const onTouchEnd = useCallback(() => {
    cancel(true);
  }, [cancel]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Cancel if user moves finger more than 10px (scrolling)
      if (startPosRef.current && e.touches[0]) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startPosRef.current.x);
        const dy = Math.abs(touch.clientY - startPosRef.current.y);

        if (dx > 10 || dy > 10) {
          cancel(false);
        }
      }
    },
    [cancel]
  );

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
  };
}
