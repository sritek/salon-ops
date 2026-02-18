/**
 * Throttled Updates Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.10
 */

import { useRef, useCallback, useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

// Default throttle interval (1 second)
const DEFAULT_THROTTLE_MS = 1000;

interface UseThrottledUpdatesOptions {
  /** Throttle interval in milliseconds */
  throttleMs?: number;
}

/**
 * Hook to throttle query invalidations to max 1 per second per query key
 */
export function useThrottledUpdates({
  throttleMs = DEFAULT_THROTTLE_MS,
}: UseThrottledUpdatesOptions = {}) {
  const queryClient = useQueryClient();
  const lastUpdatesRef = useRef<Map<string, number>>(new Map());
  const pendingUpdatesRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Get a string key for the query key array
  const getKeyString = useCallback((queryKey: QueryKey): string => {
    return JSON.stringify(queryKey);
  }, []);

  // Throttled invalidate function
  const throttledInvalidate = useCallback(
    (queryKey: QueryKey) => {
      const keyString = getKeyString(queryKey);
      const now = Date.now();
      const lastUpdate = lastUpdatesRef.current.get(keyString) || 0;
      const timeSinceLastUpdate = now - lastUpdate;

      // If enough time has passed, invalidate immediately
      if (timeSinceLastUpdate >= throttleMs) {
        lastUpdatesRef.current.set(keyString, now);
        queryClient.invalidateQueries({ queryKey });
        return;
      }

      // Otherwise, schedule the update for later (debounce)
      // Clear any existing pending update for this key
      const existingTimeout = pendingUpdatesRef.current.get(keyString);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Schedule new update
      const timeout = setTimeout(() => {
        lastUpdatesRef.current.set(keyString, Date.now());
        queryClient.invalidateQueries({ queryKey });
        pendingUpdatesRef.current.delete(keyString);
      }, throttleMs - timeSinceLastUpdate);

      pendingUpdatesRef.current.set(keyString, timeout);
    },
    [queryClient, throttleMs, getKeyString]
  );

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      pendingUpdatesRef.current.forEach((timeout) => clearTimeout(timeout));
      pendingUpdatesRef.current.clear();
    };
  }, []);

  return { throttledInvalidate };
}

/**
 * Hook to batch rapid events and process them together
 */
export function useBatchedUpdates<T>(
  processor: (items: T[]) => void,
  options: { batchMs?: number; maxBatchSize?: number } = {}
) {
  const { batchMs = 100, maxBatchSize = 50 } = options;
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processBatch = useCallback(() => {
    if (batchRef.current.length > 0) {
      processor([...batchRef.current]);
      batchRef.current = [];
    }
    timeoutRef.current = null;
  }, [processor]);

  const addToBatch = useCallback(
    (item: T) => {
      batchRef.current.push(item);

      // Process immediately if batch is full
      if (batchRef.current.length >= maxBatchSize) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        processBatch();
        return;
      }

      // Otherwise, schedule batch processing
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(processBatch, batchMs);
      }
    },
    [processBatch, batchMs, maxBatchSize]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Process any remaining items
      if (batchRef.current.length > 0) {
        processor([...batchRef.current]);
      }
    };
  }, [processor]);

  return { addToBatch };
}

/**
 * Hook for throttled real-time event handling
 */
export function useThrottledEventHandler<T>(
  handler: (events: T[]) => void,
  options: { throttleMs?: number } = {}
) {
  const { throttleMs = DEFAULT_THROTTLE_MS } = options;
  const eventsRef = useRef<T[]>([]);
  const lastProcessedRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processEvents = useCallback(() => {
    if (eventsRef.current.length > 0) {
      handler([...eventsRef.current]);
      eventsRef.current = [];
      lastProcessedRef.current = Date.now();
    }
    timeoutRef.current = null;
  }, [handler]);

  const handleEvent = useCallback(
    (event: T) => {
      eventsRef.current.push(event);

      const now = Date.now();
      const timeSinceLastProcess = now - lastProcessedRef.current;

      // If enough time has passed, process immediately
      if (timeSinceLastProcess >= throttleMs) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        processEvents();
        return;
      }

      // Otherwise, schedule processing
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(processEvents, throttleMs - timeSinceLastProcess);
      }
    },
    [processEvents, throttleMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { handleEvent };
}
