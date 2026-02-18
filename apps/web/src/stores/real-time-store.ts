/**
 * Real-Time Store
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.1, 9.5, 9.6
 */

import { create } from 'zustand';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'polling';

export type EventType =
  | 'appointment.created'
  | 'appointment.updated'
  | 'appointment.status_changed'
  | 'appointment.cancelled'
  | 'customer.checked_in'
  | 'walk_in.added'
  | 'walk_in.called'
  | 'walk_in.status_changed'
  | 'invoice.created'
  | 'invoice.paid'
  | 'notification.new';

export interface SSEEvent {
  id: string;
  type: EventType;
  data: unknown;
  timestamp: string;
  branchId: string;
  tenantId: string;
}

type EventHandler = (data: unknown) => void;

interface RealTimeState {
  connectionStatus: ConnectionStatus;
  lastEventId: string | null;
  reconnectAttempts: number;
  handlers: Map<EventType, Set<EventHandler>>;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastEventId: (id: string) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  registerHandler: (eventType: EventType, handler: EventHandler) => () => void;
  notifyHandlers: (eventType: EventType, data: unknown) => void;
}

export const useRealTimeStore = create<RealTimeState>()((set, get) => ({
  connectionStatus: 'disconnected',
  lastEventId: null,
  reconnectAttempts: 0,
  handlers: new Map(),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setLastEventId: (id) => set({ lastEventId: id }),

  incrementReconnectAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  registerHandler: (eventType, handler) => {
    const { handlers } = get();
    if (!handlers.has(eventType)) {
      handlers.set(eventType, new Set());
    }
    handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const eventHandlers = handlers.get(eventType);
      if (eventHandlers) {
        eventHandlers.delete(handler);
      }
    };
  },

  notifyHandlers: (eventType, data) => {
    const { handlers } = get();
    const eventHandlers = handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in event handler for ${eventType}:`, err);
        }
      });
    }
  },
}));

// Selector hooks
export const useConnectionStatus = () => useRealTimeStore((state) => state.connectionStatus);
export const useLastEventId = () => useRealTimeStore((state) => state.lastEventId);
