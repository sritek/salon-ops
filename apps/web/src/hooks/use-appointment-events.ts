/**
 * Appointment Event Handlers
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.2, 9.3
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useRealTimeEvent } from '@/components/ux/real-time';

interface AppointmentEventData {
  id: string;
  customerId: string;
  customerName: string;
  stylistId: string;
  stylistName: string;
  status: string;
  scheduledDate: string;
  startTime: string;
  services: string[];
}

interface UseAppointmentEventsOptions {
  branchId?: string;
  date?: string;
  showToasts?: boolean;
}

/**
 * Hook to handle appointment real-time events
 * Updates TanStack Query cache and shows toast notifications
 */
export function useAppointmentEvents({
  branchId,
  date,
  showToasts = true,
}: UseAppointmentEventsOptions = {}) {
  const queryClient = useQueryClient();

  // Invalidate relevant queries
  const invalidateQueries = useCallback(() => {
    // Invalidate command center
    if (branchId) {
      queryClient.invalidateQueries({ queryKey: ['command-center', branchId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
    }

    // Invalidate calendar resources
    queryClient.invalidateQueries({ queryKey: ['calendar', 'resources'] });

    // Invalidate appointments list
    if (date) {
      queryClient.invalidateQueries({ queryKey: ['appointments', date] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }

    // Invalidate dashboard stats
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient, branchId, date]);

  // Handle appointment created
  const handleAppointmentCreated = useCallback(
    (data: unknown) => {
      const event = data as AppointmentEventData;
      invalidateQueries();

      if (showToasts) {
        toast.info('New Appointment', {
          description: `${event.customerName} booked with ${event.stylistName}`,
        });
      }
    },
    [invalidateQueries, showToasts]
  );

  // Handle appointment updated
  const handleAppointmentUpdated = useCallback(
    (data: unknown) => {
      const event = data as AppointmentEventData;
      invalidateQueries();

      if (showToasts) {
        toast.info('Appointment Updated', {
          description: `${event.customerName}'s appointment was updated`,
        });
      }
    },
    [invalidateQueries, showToasts]
  );

  // Handle appointment status changed
  const handleAppointmentStatusChanged = useCallback(
    (data: unknown) => {
      const event = data as AppointmentEventData;
      invalidateQueries();

      if (showToasts) {
        const statusMessages: Record<string, string> = {
          confirmed: 'confirmed',
          checked_in: 'checked in',
          in_progress: 'started',
          completed: 'completed',
          cancelled: 'cancelled',
          no_show: 'marked as no-show',
        };

        const statusMessage = statusMessages[event.status] || event.status;
        toast.info('Status Changed', {
          description: `${event.customerName}'s appointment ${statusMessage}`,
        });
      }
    },
    [invalidateQueries, showToasts]
  );

  // Handle appointment cancelled
  const handleAppointmentCancelled = useCallback(
    (data: unknown) => {
      const event = data as AppointmentEventData;
      invalidateQueries();

      if (showToasts) {
        toast.warning('Appointment Cancelled', {
          description: `${event.customerName}'s appointment was cancelled`,
        });
      }
    },
    [invalidateQueries, showToasts]
  );

  // Handle customer checked in
  const handleCustomerCheckedIn = useCallback(
    (data: unknown) => {
      const event = data as AppointmentEventData;
      invalidateQueries();

      if (showToasts) {
        toast.success('Customer Checked In', {
          description: `${event.customerName} has arrived`,
        });
      }
    },
    [invalidateQueries, showToasts]
  );

  // Register event handlers
  useRealTimeEvent('appointment.created', handleAppointmentCreated);
  useRealTimeEvent('appointment.updated', handleAppointmentUpdated);
  useRealTimeEvent('appointment.status_changed', handleAppointmentStatusChanged);
  useRealTimeEvent('appointment.cancelled', handleAppointmentCancelled);
  useRealTimeEvent('customer.checked_in', handleCustomerCheckedIn);
}
