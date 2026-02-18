/**
 * Optimistic Update Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.8
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseOptimisticUpdateOptions<TData, TVariables> {
  /** Query key to update optimistically */
  queryKey: QueryKey;
  /** Function to perform the actual mutation */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Function to update the cache optimistically */
  optimisticUpdate: (oldData: TData | undefined, variables: TVariables) => TData;
  /** Optional callback on success */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Optional callback on error */
  onError?: (error: Error, variables: TVariables) => void;
  /** Whether to show error toast on failure */
  showErrorToast?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Hook for optimistic updates with automatic rollback on error
 */
export function useOptimisticUpdate<TData, TVariables>({
  queryKey,
  mutationFn,
  optimisticUpdate,
  onSuccess,
  onError,
  showErrorToast = true,
  errorMessage = 'Action failed. Changes have been reverted.',
}: UseOptimisticUpdateOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) => optimisticUpdate(old, variables));

      // Return context with the previous value
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      if (showErrorToast) {
        toast.error('Error', {
          description: errorMessage,
        });
      }

      onError?.(error as Error, variables);
    },
    onSuccess: (data, variables) => {
      onSuccess?.(data, variables);
    },
    onSettled: () => {
      // Refetch to ensure consistency with server
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Hook for optimistic status change on appointments
 */
export function useOptimisticStatusChange() {
  const queryClient = useQueryClient();

  const updateStatus = useCallback(
    async <T extends { id: string; status: string }>(
      queryKey: QueryKey,
      itemId: string,
      newStatus: string,
      mutationFn: () => Promise<T>
    ) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<T[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<T[]>(queryKey, (old) =>
        old?.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
      );

      try {
        // Perform the actual mutation
        await mutationFn();
      } catch (error) {
        // Rollback on error
        if (previousData !== undefined) {
          queryClient.setQueryData(queryKey, previousData);
        }
        toast.error('Error', {
          description: 'Status change failed. Changes have been reverted.',
        });
        throw error;
      } finally {
        // Refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient]
  );

  return { updateStatus };
}

/**
 * Hook for optimistic check-in
 */
export function useOptimisticCheckIn(queryKey: QueryKey) {
  return useOptimisticUpdate<
    { id: string; status: string }[],
    { appointmentId: string; checkInFn: () => Promise<unknown> }
  >({
    queryKey,
    mutationFn: async ({ checkInFn }) => {
      await checkInFn();
      return [];
    },
    optimisticUpdate: (oldData, { appointmentId }) =>
      oldData?.map((apt) => (apt.id === appointmentId ? { ...apt, status: 'checked_in' } : apt)) ||
      [],
    errorMessage: 'Check-in failed. Please try again.',
  });
}

/**
 * Hook for optimistic item removal from list
 */
export function useOptimisticRemove<T extends { id: string }>(
  queryKey: QueryKey,
  mutationFn: (id: string) => Promise<void>
) {
  return useOptimisticUpdate<T[], string>({
    queryKey,
    mutationFn: mutationFn as unknown as (id: string) => Promise<T[]>,
    optimisticUpdate: (oldData, id) => oldData?.filter((item) => item.id !== id) || [],
    errorMessage: 'Remove failed. Item has been restored.',
  });
}

/**
 * Hook for optimistic item update in list
 */
export function useOptimisticItemUpdate<T extends { id: string }>(
  queryKey: QueryKey,
  mutationFn: (item: Partial<T> & { id: string }) => Promise<T>
) {
  return useOptimisticUpdate<T[], Partial<T> & { id: string }>({
    queryKey,
    mutationFn: mutationFn as unknown as (item: Partial<T> & { id: string }) => Promise<T[]>,
    optimisticUpdate: (oldData, updates) =>
      oldData?.map((item) => (item.id === updates.id ? { ...item, ...updates } : item)) || [],
    errorMessage: 'Update failed. Changes have been reverted.',
  });
}
