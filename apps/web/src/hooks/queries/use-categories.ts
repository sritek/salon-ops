/**
 * Service Categories Hooks
 * React Query hooks for category management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import type {
  CreateCategoryInput,
  ReorderCategoriesInput,
  ServiceCategory,
  UpdateCategoryInput,
} from '@/types/services';

interface CategoryQueryOptions {
  includeInactive?: boolean;
  parentId?: string | null;
  flat?: boolean;
}

// Query keys
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters: CategoryQueryOptions) => [...categoryKeys.lists(), filters] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

// Get all categories
export function useCategories(options: CategoryQueryOptions = {}) {
  return useQuery({
    queryKey: categoryKeys.list(options),
    queryFn: () =>
      api.get<ServiceCategory[]>('/service-categories', options as Record<string, unknown>),
  });
}

// Get single category
export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => api.get<ServiceCategory>(`/service-categories/${id}`),
    enabled: !!id,
  });
}

// Create category
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryInput) =>
      api.post<ServiceCategory>('/service-categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

// Update category
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      api.patch<ServiceCategory>(`/service-categories/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(id) });
    },
  });
}

// Delete category
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/service-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

// Reorder categories
export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderCategoriesInput) =>
      api.patch<{ message: string }>('/service-categories/reorder', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}
