/**
 * Checkout Query Hooks
 * TanStack Query hooks for checkout session management
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  CheckoutSession,
  StartCheckoutInput,
  AddItemInput,
  RemoveItemInput,
  ApplyDiscountInput,
  RemoveDiscountInput,
  ProcessPaymentInput,
  CompleteCheckoutInput,
  CheckoutCompleteResult,
} from '@/types/checkout';

// ============================================
// Query Keys
// ============================================

export const checkoutKeys = {
  all: ['checkout'] as const,
  sessions: () => [...checkoutKeys.all, 'session'] as const,
  session: (id: string) => [...checkoutKeys.sessions(), id] as const,
};

// ============================================
// Get Checkout Session
// ============================================

export function useCheckoutSession(sessionId: string | null) {
  return useQuery({
    queryKey: checkoutKeys.session(sessionId || ''),
    queryFn: () => api.get<CheckoutSession>(`/checkout/${sessionId}`),
    enabled: !!sessionId,
    staleTime: 0, // Always refetch to get latest session state
    refetchOnWindowFocus: true,
  });
}

// ============================================
// Start Checkout Session
// ============================================

export function useStartCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartCheckoutInput) => api.post<CheckoutSession>('/checkout/start', data),
    onSuccess: (session) => {
      queryClient.setQueryData(checkoutKeys.session(session.id), session);
    },
  });
}

// ============================================
// Add Item to Checkout
// ============================================

export function useAddCheckoutItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddItemInput) => api.post<CheckoutSession>('/checkout/add-item', data),
    onSuccess: (session) => {
      queryClient.setQueryData(checkoutKeys.session(session.id), session);
    },
  });
}

// ============================================
// Remove Item from Checkout
// ============================================

export function useRemoveCheckoutItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RemoveItemInput) => api.post<CheckoutSession>('/checkout/remove-item', data),
    onSuccess: (session) => {
      queryClient.setQueryData(checkoutKeys.session(session.id), session);
    },
  });
}

// ============================================
// Apply Discount
// ============================================

export function useApplyCheckoutDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApplyDiscountInput) =>
      api.post<CheckoutSession>('/checkout/apply-discount', data),
    onSuccess: (session) => {
      queryClient.setQueryData(checkoutKeys.session(session.id), session);
    },
  });
}

// ============================================
// Remove Discount
// ============================================

export function useRemoveCheckoutDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RemoveDiscountInput) =>
      api.post<CheckoutSession>('/checkout/remove-discount', data),
    onSuccess: (session) => {
      queryClient.setQueryData(checkoutKeys.session(session.id), session);
    },
  });
}

// ============================================
// Process Payment
// ============================================

export function useProcessCheckoutPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProcessPaymentInput) =>
      api.post<CheckoutSession>('/checkout/process-payment', data),
    onSuccess: (session) => {
      queryClient.setQueryData(checkoutKeys.session(session.id), session);
    },
  });
}

// ============================================
// Complete Checkout
// ============================================

export function useCompleteCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CompleteCheckoutInput) =>
      api.post<CheckoutCompleteResult>('/checkout/complete', data),
    onSuccess: (result) => {
      // Remove session from cache after completion
      queryClient.removeQueries({ queryKey: checkoutKeys.session(result.session.id) });
      // Invalidate invoices to show the new invoice
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Invalidate appointments if there was an appointment
      if (result.session.appointmentId) {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    },
  });
}
