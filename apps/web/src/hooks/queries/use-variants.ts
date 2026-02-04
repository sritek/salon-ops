/**
 * Service Variants Hooks
 * React Query hooks for variant management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import type {
  CreateVariantInput,
  ServiceVariant,
  UpdateVariantInput,
} from '@/types/services';

import { serviceKeys } from './use-services';

// Query keys
export const variantKeys = {
  all: ['variants'] as const,
  lists: () => [...variantKeys.all, 'list'] as const,
  list: (serviceId: string) => [...variantKeys.lists(), serviceId] as const,
};

// Get all variants for a service
export function useVariants(serviceId: string) {
  return useQuery({
    queryKey: variantKeys.list(serviceId),
    queryFn: () =>
      api.get<ServiceVariant[]>(`/services/${serviceId}/variants`),
    enabled: !!serviceId,
  });
}

// Create variant
export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      data,
    }: {
      serviceId: string;
      data: CreateVariantInput;
    }) => api.post<ServiceVariant>(`/services/${serviceId}/variants`, data),
    onSuccess: (_, { serviceId }) => {
      queryClient.invalidateQueries({ queryKey: variantKeys.list(serviceId) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(serviceId) });
    },
  });
}

// Update variant
export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      variantId,
      data,
    }: {
      serviceId: string;
      variantId: string;
      data: UpdateVariantInput;
    }) =>
      api.patch<ServiceVariant>(
        `/services/${serviceId}/variants/${variantId}`,
        data
      ),
    onSuccess: (_, { serviceId }) => {
      queryClient.invalidateQueries({ queryKey: variantKeys.list(serviceId) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(serviceId) });
    },
  });
}

// Delete variant
export function useDeleteVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      variantId,
    }: {
      serviceId: string;
      variantId: string;
    }) =>
      api.delete<{ message: string }>(
        `/services/${serviceId}/variants/${variantId}`
      ),
    onSuccess: (_, { serviceId }) => {
      queryClient.invalidateQueries({ queryKey: variantKeys.list(serviceId) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(serviceId) });
    },
  });
}
