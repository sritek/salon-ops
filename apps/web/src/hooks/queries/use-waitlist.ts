/**
 * Waitlist Hooks
 * React Query hooks for waitlist management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type {
  WaitlistEntry,
  WaitlistMatch,
  CreateWaitlistEntryRequest,
  UpdateWaitlistEntryRequest,
  ConvertWaitlistRequest,
  ListWaitlistParams,
  MatchWaitlistParams,
} from '@/types/waitlist';

// ============================================
// Query Keys
// ============================================

export const waitlistKeys = {
  all: ['waitlist'] as const,
  lists: () => [...waitlistKeys.all, 'list'] as const,
  list: (filters: ListWaitlistParams) => [...waitlistKeys.lists(), filters] as const,
  details: () => [...waitlistKeys.all, 'detail'] as const,
  detail: (id: string) => [...waitlistKeys.details(), id] as const,
  count: (branchId: string) => [...waitlistKeys.all, 'count', branchId] as const,
  matches: (params: MatchWaitlistParams) => [...waitlistKeys.all, 'matches', params] as const,
};

// ============================================
// Waitlist CRUD Hooks
// ============================================

/**
 * Get waitlist entries with pagination and filtering
 */
export function useWaitlist(filters: ListWaitlistParams = {}) {
  return useQuery({
    queryKey: waitlistKeys.list(filters),
    queryFn: () =>
      api.getPaginated<WaitlistEntry>('/waitlist', {
        branchId: filters.branchId,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: filters.page,
        limit: filters.limit,
      }),
  });
}

/**
 * Get single waitlist entry by ID
 */
export function useWaitlistEntry(id: string) {
  return useQuery({
    queryKey: waitlistKeys.detail(id),
    queryFn: () => api.get<WaitlistEntry>(`/waitlist/${id}`),
    enabled: !!id,
  });
}

/**
 * Get active waitlist count for a branch
 */
export function useWaitlistCount(branchId: string) {
  return useQuery({
    queryKey: waitlistKeys.count(branchId),
    queryFn: () => api.get<{ count: number }>('/waitlist/count', { branchId }),
    enabled: !!branchId,
  });
}

/**
 * Create a new waitlist entry
 */
export function useCreateWaitlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWaitlistEntryRequest) => api.post<WaitlistEntry>('/waitlist', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.lists() });
      queryClient.invalidateQueries({ queryKey: waitlistKeys.count(variables.branchId) });
    },
  });
}

/**
 * Update a waitlist entry
 */
export function useUpdateWaitlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWaitlistEntryRequest }) =>
      api.patch<WaitlistEntry>(`/waitlist/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.lists() });
      queryClient.invalidateQueries({ queryKey: waitlistKeys.detail(id) });
    },
  });
}

/**
 * Delete (remove) a waitlist entry
 */
export function useDeleteWaitlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/waitlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.lists() });
      queryClient.invalidateQueries({ queryKey: waitlistKeys.all });
    },
  });
}

// ============================================
// Waitlist Actions Hooks
// ============================================

/**
 * Convert waitlist entry to appointment
 * Returns appointment data to be used with appointment creation
 */
export function useConvertWaitlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertWaitlistRequest }) =>
      api.post<{
        waitlistEntry: WaitlistEntry;
        appointmentData: {
          branchId: string;
          customerId?: string;
          customerName: string;
          customerPhone?: string;
          serviceIds: string[];
          scheduledDate: string;
          scheduledTime: string;
          stylistId?: string;
        };
      }>(`/waitlist/${id}/convert`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.lists() });
      queryClient.invalidateQueries({ queryKey: waitlistKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: waitlistKeys.all });
    },
  });
}

/**
 * Find matching waitlist entries for a time slot
 * Used for smart matching in the new appointment panel
 */
export function useWaitlistMatches(params: MatchWaitlistParams, enabled = true) {
  return useQuery({
    queryKey: waitlistKeys.matches(params),
    queryFn: () =>
      api.get<WaitlistMatch[]>('/waitlist/match', {
        branchId: params.branchId,
        date: params.date,
        time: params.time,
        durationMinutes: params.durationMinutes,
      }),
    enabled: enabled && !!params.branchId && !!params.date && !!params.time,
  });
}
