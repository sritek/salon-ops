/**
 * Memberships & Packages Hooks
 * React Query hooks for memberships and packages management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type {
  MembershipConfig,
  UpdateMembershipConfigInput,
  MembershipPlan,
  MembershipPlanFilters,
  CreateMembershipPlanInput,
  UpdateMembershipPlanInput,
  CreateBenefitInput,
  MembershipBenefit,
  CustomerMembership,
  CustomerMembershipFilters,
  SellMembershipInput,
  SellMembershipResponse,
  FreezeMembershipInput,
  FreezeMembershipResponse,
  CancelMembershipInput,
  CancelResponse,
  MembershipUsage,
  Package,
  PackageFilters,
  CreatePackageInput,
  UpdatePackageInput,
  CustomerPackage,
  CustomerPackageFilters,
  SellPackageInput,
  SellPackageResponse,
  CancelPackageInput,
  PackageCredit,
  PackageRedemption,
  CheckBenefitsInput,
  CheckBenefitsResponse,
  ApplyMembershipInput,
  RedeemPackageInput,
  CustomerBenefitsSummary,
} from '@/types/memberships';

// ============================================
// Query Keys
// ============================================

export const membershipKeys = {
  all: ['memberships'] as const,
  // Config
  config: () => [...membershipKeys.all, 'config'] as const,
  // Plans
  plans: () => [...membershipKeys.all, 'plans'] as const,
  planList: (filters: MembershipPlanFilters) =>
    [...membershipKeys.plans(), 'list', filters] as const,
  planDetail: (id: string) => [...membershipKeys.plans(), 'detail', id] as const,
  // Customer Memberships
  customerMemberships: () => [...membershipKeys.all, 'customerMemberships'] as const,
  customerMembershipList: (filters: CustomerMembershipFilters) =>
    [...membershipKeys.customerMemberships(), 'list', filters] as const,
  customerMembershipDetail: (id: string) =>
    [...membershipKeys.customerMemberships(), 'detail', id] as const,
  customerMembershipUsage: (id: string) =>
    [...membershipKeys.customerMemberships(), id, 'usage'] as const,
  // Packages
  packages: () => [...membershipKeys.all, 'packages'] as const,
  packageList: (filters: PackageFilters) =>
    [...membershipKeys.packages(), 'list', filters] as const,
  packageDetail: (id: string) => [...membershipKeys.packages(), 'detail', id] as const,
  // Customer Packages
  customerPackages: () => [...membershipKeys.all, 'customerPackages'] as const,
  customerPackageList: (filters: CustomerPackageFilters) =>
    [...membershipKeys.customerPackages(), 'list', filters] as const,
  customerPackageDetail: (id: string) =>
    [...membershipKeys.customerPackages(), 'detail', id] as const,
  customerPackageCredits: (id: string) =>
    [...membershipKeys.customerPackages(), id, 'credits'] as const,
  customerPackageRedemptions: (id: string) =>
    [...membershipKeys.customerPackages(), id, 'redemptions'] as const,
  // Customer Benefits
  customerBenefits: (customerId: string) =>
    [...membershipKeys.all, 'customerBenefits', customerId] as const,
};

// ============================================
// Membership Config Hooks
// ============================================

/**
 * Get membership config for tenant
 */
export function useMembershipConfig() {
  return useQuery({
    queryKey: membershipKeys.config(),
    queryFn: () => api.get<MembershipConfig>('/membership-config'),
  });
}

/**
 * Update membership config
 */
export function useUpdateMembershipConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMembershipConfigInput) =>
      api.patch<MembershipConfig>('/membership-config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.config() });
    },
  });
}

/**
 * Reset membership config to defaults
 */
export function useResetMembershipConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<MembershipConfig>('/membership-config/reset'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.config() });
    },
  });
}

// ============================================
// Membership Plan Hooks
// ============================================

/**
 * Get membership plans with pagination
 */
export function useMembershipPlans(filters: MembershipPlanFilters = {}) {
  return useQuery({
    queryKey: membershipKeys.planList(filters),
    queryFn: () =>
      api.getPaginated<MembershipPlan>('/membership-plans', {
        page: filters.page,
        limit: filters.limit,
        isActive: filters.isActive,
        tier: filters.tier,
        branchId: filters.branchId,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });
}

/**
 * Get single membership plan by ID
 */
export function useMembershipPlan(id: string) {
  return useQuery({
    queryKey: membershipKeys.planDetail(id),
    queryFn: () => api.get<MembershipPlan>(`/membership-plans/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new membership plan
 */
export function useCreateMembershipPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMembershipPlanInput) =>
      api.post<MembershipPlan>('/membership-plans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.plans() });
    },
  });
}

/**
 * Update a membership plan
 */
export function useUpdateMembershipPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMembershipPlanInput }) =>
      api.patch<MembershipPlan>(`/membership-plans/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.plans() });
      queryClient.invalidateQueries({ queryKey: membershipKeys.planDetail(id) });
    },
  });
}

/**
 * Delete a membership plan
 */
export function useDeleteMembershipPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/membership-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.plans() });
    },
  });
}

// ============================================
// Membership Benefit Hooks
// ============================================

/**
 * Add benefit to membership plan
 */
export function useAddMembershipBenefit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: CreateBenefitInput }) =>
      api.post<MembershipBenefit>(`/membership-plans/${planId}/benefits`, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.planDetail(planId) });
    },
  });
}

/**
 * Update benefit on membership plan
 */
export function useUpdateMembershipBenefit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      benefitId,
      data,
    }: {
      planId: string;
      benefitId: string;
      data: Partial<CreateBenefitInput>;
    }) => api.patch<MembershipBenefit>(`/membership-plans/${planId}/benefits/${benefitId}`, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.planDetail(planId) });
    },
  });
}

/**
 * Remove benefit from membership plan
 */
export function useRemoveMembershipBenefit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, benefitId }: { planId: string; benefitId: string }) =>
      api.delete<{ message: string }>(`/membership-plans/${planId}/benefits/${benefitId}`),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.planDetail(planId) });
    },
  });
}

// ============================================
// Customer Membership Hooks
// ============================================

/**
 * Get customer memberships with pagination
 */
export function useCustomerMemberships(filters: CustomerMembershipFilters = {}) {
  return useQuery({
    queryKey: membershipKeys.customerMembershipList(filters),
    queryFn: () =>
      api.getPaginated<CustomerMembership>('/memberships', {
        page: filters.page,
        limit: filters.limit,
        customerId: filters.customerId,
        planId: filters.planId,
        branchId: filters.branchId,
        status: filters.status,
        expiringWithinDays: filters.expiringWithinDays,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });
}

/**
 * Get single customer membership by ID
 */
export function useCustomerMembership(id: string) {
  return useQuery({
    queryKey: membershipKeys.customerMembershipDetail(id),
    queryFn: () => api.get<CustomerMembership>(`/memberships/${id}`),
    enabled: !!id,
  });
}

/**
 * Get membership usage history
 */
export function useMembershipUsage(id: string) {
  return useQuery({
    queryKey: membershipKeys.customerMembershipUsage(id),
    queryFn: () => api.get<MembershipUsage[]>(`/memberships/${id}/usage`),
    enabled: !!id,
  });
}

/**
 * Sell membership to customer
 */
export function useSellMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SellMembershipInput) =>
      api.post<SellMembershipResponse>('/memberships', data),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerMemberships() });
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerBenefits(customerId) });
    },
  });
}

/**
 * Freeze membership
 */
export function useFreezeMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FreezeMembershipInput }) =>
      api.post<FreezeMembershipResponse>(`/memberships/${id}/freeze`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerMemberships() });
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerMembershipDetail(id) });
    },
  });
}

/**
 * Unfreeze membership
 */
export function useUnfreezeMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<CustomerMembership>(`/memberships/${id}/unfreeze`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerMemberships() });
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerMembershipDetail(id) });
    },
  });
}

/**
 * Cancel membership
 */
export function useCancelMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelMembershipInput }) =>
      api.post<CancelResponse>(`/memberships/${id}/cancel`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerMemberships() });
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerMembershipDetail(id) });
    },
  });
}

// ============================================
// Package Hooks
// ============================================

/**
 * Get packages with pagination
 */
export function usePackages(filters: PackageFilters = {}) {
  return useQuery({
    queryKey: membershipKeys.packageList(filters),
    queryFn: () =>
      api.getPaginated<Package>('/packages', {
        page: filters.page,
        limit: filters.limit,
        isActive: filters.isActive,
        packageType: filters.packageType,
        branchId: filters.branchId,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });
}

/**
 * Get single package by ID
 */
export function usePackage(id: string) {
  return useQuery({
    queryKey: membershipKeys.packageDetail(id),
    queryFn: () => api.get<Package>(`/packages/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new package
 */
export function useCreatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePackageInput) => api.post<Package>('/packages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.packages() });
    },
  });
}

/**
 * Update a package
 */
export function useUpdatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePackageInput }) =>
      api.patch<Package>(`/packages/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.packages() });
      queryClient.invalidateQueries({ queryKey: membershipKeys.packageDetail(id) });
    },
  });
}

/**
 * Delete a package
 */
export function useDeletePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/packages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.packages() });
    },
  });
}

// ============================================
// Customer Package Hooks
// ============================================

/**
 * Get customer packages with pagination
 */
export function useCustomerPackages(filters: CustomerPackageFilters = {}) {
  return useQuery({
    queryKey: membershipKeys.customerPackageList(filters),
    queryFn: () =>
      api.getPaginated<CustomerPackage>('/customer-packages', {
        page: filters.page,
        limit: filters.limit,
        customerId: filters.customerId,
        packageId: filters.packageId,
        branchId: filters.branchId,
        status: filters.status,
        packageType: filters.packageType,
        expiringWithinDays: filters.expiringWithinDays,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });
}

/**
 * Get single customer package by ID
 */
export function useCustomerPackage(id: string) {
  return useQuery({
    queryKey: membershipKeys.customerPackageDetail(id),
    queryFn: () => api.get<CustomerPackage>(`/customer-packages/${id}`),
    enabled: !!id,
  });
}

/**
 * Get package credits
 */
export function usePackageCredits(id: string) {
  return useQuery({
    queryKey: membershipKeys.customerPackageCredits(id),
    queryFn: () => api.get<PackageCredit[]>(`/customer-packages/${id}/credits`),
    enabled: !!id,
  });
}

/**
 * Get package redemption history
 */
export function usePackageRedemptions(id: string) {
  return useQuery({
    queryKey: membershipKeys.customerPackageRedemptions(id),
    queryFn: () => api.get<PackageRedemption[]>(`/customer-packages/${id}/redemptions`),
    enabled: !!id,
  });
}

/**
 * Sell package to customer
 */
export function useSellPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SellPackageInput) =>
      api.post<SellPackageResponse>('/customer-packages', data),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerPackages() });
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerBenefits(customerId) });
    },
  });
}

/**
 * Cancel package
 */
export function useCancelPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelPackageInput }) =>
      api.post<CancelResponse>(`/customer-packages/${id}/cancel`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerPackages() });
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerPackageDetail(id) });
    },
  });
}

// ============================================
// Redemption Hooks
// ============================================

/**
 * Check available benefits for customer
 */
export function useCheckBenefits() {
  return useMutation({
    mutationFn: (data: CheckBenefitsInput) =>
      api.post<CheckBenefitsResponse>('/redemption/check', data),
  });
}

/**
 * Apply membership discount
 */
export function useApplyMembershipDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApplyMembershipInput) =>
      api.post<{ usage: MembershipUsage }>('/redemption/apply-membership', data),
    onSuccess: (_, { membershipId }) => {
      queryClient.invalidateQueries({
        queryKey: membershipKeys.customerMembershipDetail(membershipId),
      });
      queryClient.invalidateQueries({
        queryKey: membershipKeys.customerMembershipUsage(membershipId),
      });
    },
  });
}

/**
 * Redeem package credits
 */
export function useRedeemPackageCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RedeemPackageInput) =>
      api.post<{ redemption: PackageRedemption }>('/redemption/redeem-package', data),
    onSuccess: (_, { customerPackageId }) => {
      queryClient.invalidateQueries({
        queryKey: membershipKeys.customerPackageDetail(customerPackageId),
      });
      queryClient.invalidateQueries({
        queryKey: membershipKeys.customerPackageCredits(customerPackageId),
      });
      queryClient.invalidateQueries({
        queryKey: membershipKeys.customerPackageRedemptions(customerPackageId),
      });
    },
  });
}

/**
 * Get customer benefits summary
 */
export function useCustomerBenefits(customerId: string) {
  return useQuery({
    queryKey: membershipKeys.customerBenefits(customerId),
    queryFn: () => api.get<CustomerBenefitsSummary>(`/customers/${customerId}/benefits`),
    enabled: !!customerId,
  });
}
