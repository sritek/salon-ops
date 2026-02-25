/**
 * Users Hooks
 * React Query hooks for user management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { tenantKeys } from './use-tenant';

// ============================================
// Types
// ============================================

export interface UserBranchAssignment {
  branchId: string;
  isPrimary: boolean;
  branch: {
    id: string;
    name: string;
  };
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  gender: string | null;
  isActive: boolean;
  createdAt: string;
  branchAssignments: UserBranchAssignment[];
}

export interface UsersFilters {
  page?: number;
  limit?: number;
  branchId?: string;
  role?: string;
  search?: string;
  isActive?: boolean;
}

export interface CreateUserInput {
  name: string;
  phone: string;
  email?: string | null;
  password: string;
  role: 'regional_manager' | 'branch_manager' | 'receptionist' | 'stylist' | 'accountant';
  gender?: 'male' | 'female' | 'other' | null;
  branchAssignments: Array<{
    branchId: string;
    isPrimary: boolean;
  }>;
}

export interface UpdateUserInput {
  name?: string;
  email?: string | null;
  role?: 'regional_manager' | 'branch_manager' | 'receptionist' | 'stylist' | 'accountant';
  gender?: 'male' | 'female' | 'other' | null;
  isActive?: boolean;
  branchAssignments?: Array<{
    branchId: string;
    isPrimary: boolean;
  }>;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// Query Keys
// ============================================

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UsersFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// ============================================
// Hooks
// ============================================

/**
 * Get users with pagination and filtering
 */
export function useUsers(filters: UsersFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () =>
      api.getPaginated<User>('/users', {
        page: filters.page,
        limit: filters.limit,
        branchId: filters.branchId,
        role: filters.role,
        search: filters.search,
        isActive: filters.isActive,
      }),
  });
}

/**
 * Get a single user by ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => api.get<User>(`/users/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => api.post<User>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      // Also invalidate tenant to update usage stats
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail() });
    },
  });
}

/**
 * Update a user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      api.patch<User>(`/users/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

/**
 * Delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      // Also invalidate tenant to update usage stats
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail() });
    },
  });
}

/**
 * Change own password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      api.patch<{ message: string }>('/users/me/password', data),
  });
}
