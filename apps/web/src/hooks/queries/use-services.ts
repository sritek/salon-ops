/**
 * Services Hooks
 * React Query hooks for service management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import type {
  CreateServiceInput,
  PaginatedResponse,
  Service,
  ServiceCatalog,
  ServiceFilters,
  UpdateServiceInput,
} from '@/types/services';

// Query keys
export const serviceKeys = {
  all: ['services'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (filters: ServiceFilters) => [...serviceKeys.lists(), filters] as const,
  details: () => [...serviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
  catalog: (branchId?: string) => [...serviceKeys.all, 'catalog', branchId] as const,
};

// Get all services with pagination
export function useServices(filters: ServiceFilters = {}) {
  return useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: () =>
      api.get<Service[]>('/services', {
        page: filters.page,
        limit: filters.limit,
        categoryId: filters.categoryId,
        search: filters.search,
        isActive: filters.isActive,
        isPopular: filters.isPopular,
        isFeatured: filters.isFeatured,
        isOnlineBookable: filters.isOnlineBookable,
        genderApplicable: filters.genderApplicable,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });
}

// Get services with pagination meta
export function useServicesPaginated(filters: ServiceFilters = {}) {
  return useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: async () => {
      // The API returns { success: true, data: [...], meta: {...} }
      // but our api client only returns data, so we need direct fetch for meta
      const { accessToken } = await import('@/stores/auth-store').then(m => m.useAuthStore.getState());
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/services?${new URLSearchParams(
          Object.entries(filters).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ).toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
        }
      );
      const json = await response.json();
      return {
        data: json.data as Service[],
        meta: json.meta as PaginatedResponse<Service>['meta'],
      };
    },
  });
}

// Get single service
export function useService(id: string) {
  return useQuery({
    queryKey: serviceKeys.detail(id),
    queryFn: () => api.get<Service>(`/services/${id}`),
    enabled: !!id,
  });
}

// Get service catalog
export function useServiceCatalog(branchId?: string, includeInactive = false) {
  return useQuery({
    queryKey: serviceKeys.catalog(branchId),
    queryFn: () =>
      api.get<ServiceCatalog[]>('/services/catalog', {
        branchId,
        includeInactive,
      }),
  });
}

// Create service
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceInput) =>
      api.post<Service>('/services', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.catalog() });
    },
  });
}

// Update service
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceInput }) =>
      api.patch<Service>(`/services/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.catalog() });
    },
  });
}

// Delete service
export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.catalog() });
    },
  });
}

// Duplicate service
export function useDuplicateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<Service>(`/services/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
    },
  });
}
