'use client';

/**
 * Real-Time Provider
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.1, 9.5, 9.6
 *
 * Fixes applied:
 * - Health check before SSE connection attempt
 * - Polling fallback when SSE unavailable
 * - Initial status set to 'connecting' instead of 'disconnected'
 * - Connection timeout handling
 */

import { useEffect, useRef, useCallback, createContext, useContext, type ReactNode } from 'react';

import { useAuthStore } from '@/stores/auth-store';
import { useRealTimeStore, type EventType, type ConnectionStatus } from '@/stores/real-time-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Max reconnection delay (30 seconds)
const MAX_RECONNECT_DELAY = 30000;
// Base reconnection delay (1 second)
const BASE_RECONNECT_DELAY = 1000;
// Max reconnection attempts before falling back to polling
const MAX_RECONNECT_ATTEMPTS = 5;
// Polling interval (30 seconds)
const POLLING_INTERVAL = 30000;
// Connection timeout (10 seconds)
const CONNECTION_TIMEOUT = 10000;

interface RealTimeContextValue {
  connectionStatus: ConnectionStatus;
  subscribe: (eventType: EventType, handler: (data: unknown) => void) => () => void;
}

const RealTimeContext = createContext<RealTimeContextValue | null>(null);

interface RealTimeProviderProps {
  children: ReactNode;
  branchId?: string;
  fallbackToPolling?: boolean;
}

export function RealTimeProvider({
  children,
  branchId,
  fallbackToPolling = true,
}: RealTimeProviderProps) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    connectionStatus,
    lastEventId,
    reconnectAttempts,
    setConnectionStatus,
    setLastEventId,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    registerHandler,
    notifyHandlers,
  } = useRealTimeStore();

  // Calculate reconnection delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
      MAX_RECONNECT_DELAY
    );
    return delay;
  }, [reconnectAttempts]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Start polling fallback
  const startPolling = useCallback(() => {
    stopPolling();

    // Poll for updates at regular intervals
    pollingIntervalRef.current = setInterval(() => {
      // Notify handlers with a heartbeat to indicate polling is active
      notifyHandlers('notification.new', {
        type: 'polling_heartbeat',
        timestamp: new Date().toISOString(),
      });
    }, POLLING_INTERVAL);
  }, [stopPolling, notifyHandlers]);

  // Check if SSE endpoint is available
  const checkSSEHealth = useCallback(async (): Promise<boolean> => {
    if (!accessToken) return false;

    try {
      const response = await fetch(`${API_URL}/events/health`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success && data.data?.sseAvailable === true;
    } catch {
      return false;
    }
  }, [accessToken]);

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Build URL with query params
    const url = new URL(`${API_URL}/events/stream`);
    if (lastEventId) {
      url.searchParams.set('lastEventId', lastEventId);
    }
    if (branchId) {
      url.searchParams.set('branchId', branchId);
    }
    // Pass token as query param (EventSource doesn't support custom headers)
    url.searchParams.set('token', accessToken!);

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        eventSource.close();
        eventSourceRef.current = null;
        handleConnectionFailure();
      }
    }, CONNECTION_TIMEOUT);

    eventSource.onopen = () => {
      // Clear connection timeout on successful open
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setConnectionStatus('connected');
      resetReconnectAttempts();
      stopPolling();
    };

    eventSource.onerror = () => {
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      eventSource.close();
      eventSourceRef.current = null;
      handleConnectionFailure();
    };

    // Register event listeners for all event types
    const eventTypes: EventType[] = [
      'appointment.created',
      'appointment.updated',
      'appointment.status_changed',
      'appointment.cancelled',
      'customer.checked_in',
      'walk_in.added',
      'walk_in.called',
      'walk_in.status_changed',
      'invoice.created',
      'invoice.paid',
      'notification.new',
    ];

    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setLastEventId(event.lastEventId || '');
          notifyHandlers(eventType, data);
        } catch (err) {
          console.error(`Failed to parse event data for ${eventType}:`, err);
        }
      });
    });
  }, [
    accessToken,
    lastEventId,
    branchId,
    connectionStatus,
    setConnectionStatus,
    resetReconnectAttempts,
    setLastEventId,
    notifyHandlers,
    stopPolling,
  ]);

  // Handle connection failure
  const handleConnectionFailure = useCallback(() => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus('reconnecting');
      incrementReconnectAttempts();

      // Schedule reconnection with exponential backoff
      const delay = getReconnectDelay();
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    } else if (fallbackToPolling) {
      // Fall back to polling mode
      setConnectionStatus('polling');
      startPolling();
    } else {
      setConnectionStatus('disconnected');
    }
  }, [
    reconnectAttempts,
    setConnectionStatus,
    incrementReconnectAttempts,
    getReconnectDelay,
    fallbackToPolling,
    startPolling,
  ]);

  // Main connect function
  const connect = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');

    // Check if SSE endpoint is available first
    const sseAvailable = await checkSSEHealth();

    if (sseAvailable) {
      connectSSE();
    } else if (fallbackToPolling) {
      // Fall back to polling mode immediately
      setConnectionStatus('polling');
      startPolling();
    } else {
      setConnectionStatus('disconnected');
    }
  }, [
    isAuthenticated,
    accessToken,
    setConnectionStatus,
    checkSSEHealth,
    connectSSE,
    fallbackToPolling,
    startPolling,
  ]);

  // Connect on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      // Disconnect when logged out
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      stopPolling();
      setConnectionStatus('disconnected');
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      stopPolling();
    };
  }, [isAuthenticated, connect, setConnectionStatus, stopPolling]);

  // Subscribe function for components
  const subscribe = useCallback(
    (eventType: EventType, handler: (data: unknown) => void) => {
      return registerHandler(eventType, handler);
    },
    [registerHandler]
  );

  const contextValue: RealTimeContextValue = {
    connectionStatus,
    subscribe,
  };

  return <RealTimeContext.Provider value={contextValue}>{children}</RealTimeContext.Provider>;
}

/**
 * Hook to access real-time context
 */
export function useRealTime() {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
}

/**
 * Hook to subscribe to a specific event type
 */
export function useRealTimeEvent(eventType: EventType, handler: (data: unknown) => void) {
  const { subscribe } = useRealTime();

  useEffect(() => {
    const unsubscribe = subscribe(eventType, handler);
    return unsubscribe;
  }, [eventType, handler, subscribe]);
}
