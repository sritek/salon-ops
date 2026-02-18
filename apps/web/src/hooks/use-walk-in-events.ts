/**
 * Walk-In Event Handlers
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.4, 4.11
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useRealTimeEvent } from '@/components/ux/real-time';

interface WalkInEventData {
  id: string;
  tokenNumber: number;
  customerName: string;
  customerPhone?: string;
  services: string[];
  status: string;
  waitTime?: number;
  stylistId?: string;
  stylistName?: string;
}

interface UseWalkInEventsOptions {
  branchId?: string;
  showToasts?: boolean;
}

/**
 * Hook to handle walk-in real-time events
 * Updates TanStack Query cache and shows toast notifications
 */
export function useWalkInEvents({ branchId, showToasts = true }: UseWalkInEventsOptions = {}) {
  const queryClient = useQueryClient();

  // Invalidate relevant queries
  const invalidateQueries = useCallback(() => {
    // Invalidate walk-ins list
    queryClient.invalidateQueries({ queryKey: ['walk-ins'] });

    // Invalidate command center
    if (branchId) {
      queryClient.invalidateQueries({ queryKey: ['command-center', branchId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
    }

    // Invalidate dashboard stats
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient, branchId]);

  // Handle walk-in added
  const handleWalkInAdded = useCallback(
    (data: unknown) => {
      const event = data as WalkInEventData;
      invalidateQueries();

      if (showToasts) {
        toast.info('New Walk-In', {
          description: `Token #${event.tokenNumber}: ${event.customerName}`,
          action: {
            label: 'View Queue',
            onClick: () => {
              // Navigate to queue or scroll to queue section
              const queueSection = document.getElementById('walk-in-queue');
              queueSection?.scrollIntoView({ behavior: 'smooth' });
            },
          },
        });
      }
    },
    [invalidateQueries, showToasts]
  );

  // Handle walk-in called
  const handleWalkInCalled = useCallback(
    (data: unknown) => {
      const event = data as WalkInEventData;
      invalidateQueries();

      if (showToasts) {
        toast.success('Walk-In Called', {
          description: `Token #${event.tokenNumber}: ${event.customerName} - ${event.stylistName || 'Ready'}`,
        });
      }
    },
    [invalidateQueries, showToasts]
  );

  // Handle walk-in status changed
  const handleWalkInStatusChanged = useCallback(
    (data: unknown) => {
      const event = data as WalkInEventData;
      invalidateQueries();

      if (showToasts) {
        const statusMessages: Record<string, string> = {
          waiting: 'is waiting',
          called: 'has been called',
          serving: 'is being served',
          completed: 'service completed',
          left: 'has left',
        };

        const statusMessage = statusMessages[event.status] || event.status;
        toast.info('Walk-In Update', {
          description: `Token #${event.tokenNumber}: ${event.customerName} ${statusMessage}`,
        });
      }
    },
    [invalidateQueries, showToasts]
  );

  // Register event handlers
  useRealTimeEvent('walk_in.added', handleWalkInAdded);
  useRealTimeEvent('walk_in.called', handleWalkInCalled);
  useRealTimeEvent('walk_in.status_changed', handleWalkInStatusChanged);
}
