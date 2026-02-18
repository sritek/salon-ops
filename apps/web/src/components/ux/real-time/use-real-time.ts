/**
 * Real-Time Hooks
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useRealTimeEvent } from './real-time-provider';
import type { EventType } from '@/stores/real-time-store';

/**
 * Hook to invalidate queries when real-time events occur
 */
export function useRealTimeQueryInvalidation(eventType: EventType, queryKeys: string[][]) {
  const queryClient = useQueryClient();

  const handler = useCallback(() => {
    queryKeys.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  }, [queryClient, queryKeys]);

  useRealTimeEvent(eventType, handler);
}

/**
 * Hook to update query cache directly when real-time events occur
 */
export function useRealTimeQueryUpdate<T>(
  eventType: EventType,
  queryKey: string[],
  updater: (oldData: T | undefined, eventData: unknown) => T
) {
  const queryClient = useQueryClient();

  const handler = useCallback(
    (eventData: unknown) => {
      queryClient.setQueryData<T>(queryKey, (oldData) => updater(oldData, eventData));
    },
    [queryClient, queryKey, updater]
  );

  useRealTimeEvent(eventType, handler);
}

/**
 * Hook for appointment real-time updates
 */
export function useAppointmentRealTimeUpdates(date?: string) {
  const queryClient = useQueryClient();

  // Invalidate appointments query on any appointment event
  const appointmentQueryKeys = date
    ? [
        ['appointments', date],
        ['calendar', 'resources'],
      ]
    : [['appointments'], ['calendar', 'resources']];

  const handleAppointmentEvent = useCallback(() => {
    appointmentQueryKeys.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
    // Also invalidate command center data
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'command-center'] });
  }, [queryClient, appointmentQueryKeys]);

  useRealTimeEvent('appointment.created', handleAppointmentEvent);
  useRealTimeEvent('appointment.updated', handleAppointmentEvent);
  useRealTimeEvent('appointment.status_changed', handleAppointmentEvent);
  useRealTimeEvent('appointment.cancelled', handleAppointmentEvent);
  useRealTimeEvent('customer.checked_in', handleAppointmentEvent);
}

/**
 * Hook for walk-in real-time updates
 */
export function useWalkInRealTimeUpdates() {
  const queryClient = useQueryClient();

  const handleWalkInEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['walk-ins'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'command-center'] });
  }, [queryClient]);

  useRealTimeEvent('walk_in.added', handleWalkInEvent);
  useRealTimeEvent('walk_in.called', handleWalkInEvent);
  useRealTimeEvent('walk_in.status_changed', handleWalkInEvent);
}

/**
 * Hook for invoice real-time updates
 */
export function useInvoiceRealTimeUpdates() {
  const queryClient = useQueryClient();

  const handleInvoiceEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'command-center'] });
  }, [queryClient]);

  useRealTimeEvent('invoice.created', handleInvoiceEvent);
  useRealTimeEvent('invoice.paid', handleInvoiceEvent);
}
