/**
 * Combo Services Hooks
 * React Query hooks for combo service management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import type {
  ComboService,
  CreateComboInput,
  UpdateComboInput,
} from '@/types/services';

// Query keys
export const comboKeys = {
  all: ['combos'] as const,
  lists: () => [...comboKeys.all, 'list'] as const,
  list: (includeInactive?: boolean) =>
    [...comboKeys.lists(), { includeInactive }] as const,
  details: () => [...comboKeys.all, 'detail'] as const,
  detail: (id: string) => [...comboKeys.details(), id] as const,
};

// Get all combos
export function useCombos(includeInactive = false) {
  return useQuery({
    queryKey: comboKeys.list(includeInactive),
    queryFn: () =>
      api.get<ComboService[]>('/combo-services', { includeInactive }),
  });
}

// Get single combo
export function useCombo(id: string) {
  return useQuery({
    queryKey: comboKeys.detail(id),
    queryFn: () => api.get<ComboService>(`/combo-services/${id}`),
    enabled: !!id,
  });
}

// Create combo
export function useCreateCombo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateComboInput) =>
      api.post<ComboService>('/combo-services', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comboKeys.lists() });
    },
  });
}

// Update combo
export function useUpdateCombo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateComboInput }) =>
      api.patch<ComboService>(`/combo-services/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: comboKeys.lists() });
      queryClient.invalidateQueries({ queryKey: comboKeys.detail(id) });
    },
  });
}

// Delete combo
export function useDeleteCombo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/combo-services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comboKeys.lists() });
    },
  });
}
