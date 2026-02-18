/**
 * Offline Support Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 8.10
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Storage keys
const OFFLINE_APPOINTMENTS_KEY = 'offline_appointments';
const OFFLINE_MUTATIONS_KEY = 'offline_mutations';
const LAST_SYNC_KEY = 'last_sync_timestamp';

interface OfflineAppointment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  stylistId: string;
  stylistName: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  services: string[];
  status: string;
  totalAmount: number;
}

interface OfflineMutation {
  id: string;
  type: 'check_in' | 'status_change' | 'cancel' | 'no_show';
  entityType: 'appointment' | 'walk_in';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface UseOfflineSupportOptions {
  /** Branch ID to cache appointments for */
  branchId?: string;
  /** Whether to auto-sync when online */
  autoSync?: boolean;
}

/**
 * Hook for offline support with local caching and mutation queue
 */
export function useOfflineSupport({ branchId }: UseOfflineSupportOptions = {}) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingMutations, setPendingMutations] = useState<OfflineMutation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgressRef = useRef(false);

  // Get storage key with branch
  const getStorageKey = useCallback(
    (key: string) => (branchId ? `${key}_${branchId}` : key),
    [branchId]
  );

  // Load cached appointments
  const getCachedAppointments = useCallback((): OfflineAppointment[] => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(getStorageKey(OFFLINE_APPOINTMENTS_KEY));
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }, [getStorageKey]);

  // Cache appointments
  const cacheAppointments = useCallback(
    (appointments: OfflineAppointment[]) => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(getStorageKey(OFFLINE_APPOINTMENTS_KEY), JSON.stringify(appointments));
        localStorage.setItem(getStorageKey(LAST_SYNC_KEY), Date.now().toString());
      } catch (error) {
        console.error('Failed to cache appointments:', error);
      }
    },
    [getStorageKey]
  );

  // Get today's cached appointments
  const getTodaysCachedAppointments = useCallback((): OfflineAppointment[] => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return getCachedAppointments().filter((apt) => apt.scheduledDate === today);
  }, [getCachedAppointments]);

  // Load pending mutations
  const loadPendingMutations = useCallback((): OfflineMutation[] => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(getStorageKey(OFFLINE_MUTATIONS_KEY));
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }, [getStorageKey]);

  // Save pending mutations
  const savePendingMutations = useCallback(
    (mutations: OfflineMutation[]) => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(getStorageKey(OFFLINE_MUTATIONS_KEY), JSON.stringify(mutations));
      } catch (error) {
        console.error('Failed to save pending mutations:', error);
      }
    },
    [getStorageKey]
  );

  // Queue a mutation for later sync
  const queueMutation = useCallback(
    (mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'retryCount'>) => {
      const newMutation: OfflineMutation = {
        ...mutation,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      setPendingMutations((prev) => {
        const updated = [...prev, newMutation];
        savePendingMutations(updated);
        return updated;
      });

      // Also update local cache optimistically
      if (mutation.entityType === 'appointment' && mutation.type === 'status_change') {
        const cached = getCachedAppointments();
        const updated = cached.map((apt) =>
          apt.id === mutation.entityId ? { ...apt, status: mutation.data.status as string } : apt
        );
        cacheAppointments(updated);
      }

      toast.info('Queued for sync', {
        description: "This action will be synced when you're back online.",
      });

      return newMutation;
    },
    [savePendingMutations, getCachedAppointments, cacheAppointments]
  );

  // Process a single mutation
  const processMutation = useCallback(
    async (
      mutation: OfflineMutation,
      syncFn: (mutation: OfflineMutation) => Promise<void>
    ): Promise<boolean> => {
      try {
        await syncFn(mutation);
        return true;
      } catch (error) {
        console.error('Failed to sync mutation:', error);
        return false;
      }
    },
    []
  );

  // Sync all pending mutations
  const syncPendingMutations = useCallback(
    async (syncFn: (mutation: OfflineMutation) => Promise<void>) => {
      if (syncInProgressRef.current || !isOnline) return;

      syncInProgressRef.current = true;
      setIsSyncing(true);

      const mutations = loadPendingMutations();
      const failedMutations: OfflineMutation[] = [];

      for (const mutation of mutations) {
        const success = await processMutation(mutation, syncFn);
        if (!success) {
          // Increment retry count and keep for later
          if (mutation.retryCount < 3) {
            failedMutations.push({
              ...mutation,
              retryCount: mutation.retryCount + 1,
            });
          } else {
            // Give up after 3 retries
            toast.error('Sync failed', {
              description: 'Some changes could not be synced. Please try again.',
            });
          }
        }
      }

      setPendingMutations(failedMutations);
      savePendingMutations(failedMutations);

      if (mutations.length > 0 && failedMutations.length === 0) {
        toast.success('Synced', {
          description: `${mutations.length} pending changes synced successfully.`,
        });
      }

      setIsSyncing(false);
      syncInProgressRef.current = false;
    },
    [isOnline, loadPendingMutations, processMutation, savePendingMutations]
  );

  // Clear all cached data
  const clearCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getStorageKey(OFFLINE_APPOINTMENTS_KEY));
    localStorage.removeItem(getStorageKey(OFFLINE_MUTATIONS_KEY));
    localStorage.removeItem(getStorageKey(LAST_SYNC_KEY));
    setPendingMutations([]);
  }, [getStorageKey]);

  // Get last sync timestamp
  const getLastSyncTime = useCallback((): Date | null => {
    if (typeof window === 'undefined') return null;
    const timestamp = localStorage.getItem(getStorageKey(LAST_SYNC_KEY));
    return timestamp ? new Date(parseInt(timestamp, 10)) : null;
  }, [getStorageKey]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online', {
        description: 'Your connection has been restored.',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're offline", {
        description: "Changes will be synced when you're back online.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending mutations on mount
  useEffect(() => {
    setPendingMutations(loadPendingMutations());
  }, [loadPendingMutations]);

  return {
    isOnline,
    isSyncing,
    pendingMutations,
    pendingCount: pendingMutations.length,
    getCachedAppointments,
    getTodaysCachedAppointments,
    cacheAppointments,
    queueMutation,
    syncPendingMutations,
    clearCache,
    getLastSyncTime,
  };
}

/**
 * Hook to check if we should use cached data
 */
export function useOfflineData<T>(
  onlineData: T | undefined,
  getCachedData: () => T,
  isOnline: boolean
): T | undefined {
  if (!isOnline && !onlineData) {
    return getCachedData();
  }
  return onlineData;
}
