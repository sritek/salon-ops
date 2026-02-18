/**
 * Update Highlighting Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.11
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Default highlight duration (2 seconds)
const DEFAULT_HIGHLIGHT_DURATION = 2000;

interface UseHighlightUpdateOptions {
  /** Duration of highlight in milliseconds */
  duration?: number;
}

/**
 * Hook to track and highlight recently updated items
 */
export function useHighlightUpdate<T extends string | number>(
  options: UseHighlightUpdateOptions = {}
) {
  const { duration = DEFAULT_HIGHLIGHT_DURATION } = options;
  const [highlightedIds, setHighlightedIds] = useState<Set<T>>(new Set());
  const timeoutsRef = useRef<Map<T, NodeJS.Timeout>>(new Map());

  // Highlight an item
  const highlight = useCallback(
    (id: T) => {
      // Clear existing timeout for this id
      const existingTimeout = timeoutsRef.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Add to highlighted set
      setHighlightedIds((prev) => new Set(prev).add(id));

      // Schedule removal
      const timeout = setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        timeoutsRef.current.delete(id);
      }, duration);

      timeoutsRef.current.set(id, timeout);
    },
    [duration]
  );

  // Highlight multiple items
  const highlightMany = useCallback(
    (ids: T[]) => {
      ids.forEach(highlight);
    },
    [highlight]
  );

  // Check if an item is highlighted
  const isHighlighted = useCallback((id: T) => highlightedIds.has(id), [highlightedIds]);

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setHighlightedIds(new Set());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  return {
    highlightedIds,
    highlight,
    highlightMany,
    isHighlighted,
    clearHighlights,
  };
}

/**
 * Hook to get highlight class for an item
 */
export function useHighlightClass(
  isHighlighted: boolean,
  options: { highlightClass?: string; baseClass?: string } = {}
) {
  const { highlightClass = 'animate-pulse bg-primary/10 ring-2 ring-primary/20', baseClass = '' } =
    options;

  return isHighlighted ? `${baseClass} ${highlightClass}` : baseClass;
}

/**
 * Component wrapper that adds highlight animation
 */
export function useHighlightedItem<T extends string | number>(id: T, highlightedIds: Set<T>) {
  const isHighlighted = highlightedIds.has(id);

  return {
    isHighlighted,
    className: isHighlighted
      ? 'animate-pulse bg-primary/10 ring-2 ring-primary/20 transition-all duration-300'
      : 'transition-all duration-300',
    style: isHighlighted ? { animation: 'pulse 1s ease-in-out 2' } : undefined,
  };
}

/**
 * CSS keyframes for pulse animation (add to global styles)
 *
 * @keyframes highlight-pulse {
 *   0%, 100% {
 *     background-color: transparent;
 *     box-shadow: none;
 *   }
 *   50% {
 *     background-color: hsl(var(--primary) / 0.1);
 *     box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
 *   }
 * }
 */
