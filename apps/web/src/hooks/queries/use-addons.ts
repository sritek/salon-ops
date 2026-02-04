/**
 * Service Add-ons Hooks
 * React Query hooks for add-on management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import type {
  CreateAddOnInput,
  MapAddOnsToServiceInput,
  ServiceAddOn,
  UpdateAddOnInput,
} from '@/types/services';

import { serviceKeys } from './use-services';

// Query keys
export const addOnKeys = {
  all: ['addons'] as const,
  lists: () => [...addOnKeys.all, 'list'] as const,
  list: (includeInactive?: boolean) =>
    [...addOnKeys.lists(), { includeInactive }] as const,
};

// Get all add-ons
export function useAddOns(includeInactive = false) {
  return useQuery({
    queryKey: addOnKeys.list(includeInactive),
    queryFn: () =>
      api.get<ServiceAddOn[]>('/service-add-ons', { includeInactive }),
  });
}

// Create add-on
export function useCreateAddOn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAddOnInput) =>
      api.post<ServiceAddOn>('/service-add-ons', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addOnKeys.lists() });
    },
  });
}

// Update add-on
export function useUpdateAddOn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAddOnInput }) =>
      api.patch<ServiceAddOn>(`/service-add-ons/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addOnKeys.lists() });
    },
  });
}

// Delete add-on
export function useDeleteAddOn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/service-add-ons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addOnKeys.lists() });
    },
  });
}

// Map add-ons to a service
export function useMapAddOnsToService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      data,
    }: {
      serviceId: string;
      data: MapAddOnsToServiceInput;
    }) => api.post<{ mapped: number }>(`/services/${serviceId}/add-ons`, data),
    onSuccess: (_, { serviceId }) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(serviceId) });
    },
  });
}
