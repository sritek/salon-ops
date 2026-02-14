/**
 * Invoice Query Hooks
 * TanStack Query hooks for invoice management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  Invoice,
  CreateInvoiceInput,
  QuickBillInput,
  PaymentInput,
  InvoiceItemInput,
  ListInvoicesQuery,
  CreditNote,
  CreateCreditNoteInput,
  ListCreditNotesQuery,
  DayClosure,
  OpenDayInput,
  CloseDayInput,
  ListDayClosuresQuery,
  CashDrawerTransaction,
  CashDrawerBalance,
  CashAdjustmentInput,
  ListCashTransactionsQuery,
} from '@/types/billing';

// ============================================
// Query Keys
// ============================================

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters: ListInvoicesQuery) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

// ============================================
// List Invoices
// ============================================

export function useInvoices(filters: ListInvoicesQuery = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      return api.getPaginated<Invoice>(`/invoices?${params.toString()}`);
    },
  });
}

// ============================================
// Get Single Invoice
// ============================================

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => api.get<Invoice>(`/invoices/${id}`),
    enabled: !!id,
  });
}

// ============================================
// Create Invoice (Draft)
// ============================================

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => api.post<Invoice>('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Update Invoice
// ============================================

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInvoiceInput> }) =>
      api.patch<Invoice>(`/invoices/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Delete Invoice
// ============================================

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Add Item to Invoice
// ============================================

export function useAddInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, item }: { invoiceId: string; item: InvoiceItemInput }) =>
      api.post<Invoice>(`/invoices/${invoiceId}/items`, item),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
  });
}

// ============================================
// Remove Item from Invoice
// ============================================

export function useRemoveInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, itemId }: { invoiceId: string; itemId: string }) =>
      api.delete(`/invoices/${invoiceId}/items/${itemId}`),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
  });
}

// ============================================
// Add Payment
// ============================================

export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, payments }: { invoiceId: string; payments: PaymentInput[] }) =>
      api.post<Invoice>(`/invoices/${invoiceId}/payments`, { payments }),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Finalize Invoice
// ============================================

export function useFinalizeInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, payments }: { invoiceId: string; payments?: PaymentInput[] }) =>
      api.post<Invoice>(`/invoices/${invoiceId}/finalize`, { payments }),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Cancel Invoice
// ============================================

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      api.post<Invoice>(`/invoices/${invoiceId}/cancel`, { reason }),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Quick Bill (Create + Finalize)
// ============================================

export function useQuickBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: QuickBillInput) => api.post<Invoice>('/invoices/quick-bill', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Calculate Totals (Preview)
// ============================================

export function useCalculateTotals() {
  return useMutation({
    mutationFn: (data: {
      branchId: string;
      items: InvoiceItemInput[];
      discounts?: any[];
      redeemLoyaltyPoints?: number;
      useWalletAmount?: number;
      isIgst?: boolean;
    }) => api.post('/invoices/calculate', data),
  });
}

// ============================================
// Credit Note Query Keys
// ============================================

export const creditNoteKeys = {
  all: ['creditNotes'] as const,
  lists: () => [...creditNoteKeys.all, 'list'] as const,
  list: (filters: ListCreditNotesQuery) => [...creditNoteKeys.lists(), filters] as const,
  details: () => [...creditNoteKeys.all, 'detail'] as const,
  detail: (id: string) => [...creditNoteKeys.details(), id] as const,
};

// ============================================
// List Credit Notes
// ============================================

export function useCreditNotes(filters: ListCreditNotesQuery = {}) {
  return useQuery({
    queryKey: creditNoteKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      return api.getPaginated<CreditNote>(`/invoices/credit-notes?${params.toString()}`);
    },
  });
}

// ============================================
// Get Single Credit Note
// ============================================

export function useCreditNote(id: string) {
  return useQuery({
    queryKey: creditNoteKeys.detail(id),
    queryFn: () => api.get<CreditNote>(`/invoices/credit-notes/${id}`),
    enabled: !!id,
  });
}

// ============================================
// Create Credit Note
// ============================================

export function useCreateCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCreditNoteInput) =>
      api.post<CreditNote>('/invoices/credit-notes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditNoteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Day Closure Query Keys
// ============================================

export const dayClosureKeys = {
  all: ['dayClosures'] as const,
  lists: () => [...dayClosureKeys.all, 'list'] as const,
  list: (filters: ListDayClosuresQuery) => [...dayClosureKeys.lists(), filters] as const,
  current: (branchId: string) => [...dayClosureKeys.all, 'current', branchId] as const,
};

// ============================================
// List Day Closures
// ============================================

export function useDayClosures(filters: ListDayClosuresQuery = {}) {
  return useQuery({
    queryKey: dayClosureKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      return api.getPaginated<DayClosure>(`/invoices/day-closures?${params.toString()}`);
    },
  });
}

// ============================================
// Get Current Day Status
// ============================================

export function useCurrentDay(branchId: string) {
  return useQuery({
    queryKey: dayClosureKeys.current(branchId),
    queryFn: () => api.get<DayClosure>(`/invoices/day-closures/current?branchId=${branchId}`),
    enabled: !!branchId,
  });
}

// ============================================
// Open Day
// ============================================

export function useOpenDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OpenDayInput) => api.post<DayClosure>('/invoices/day-closures/open', data),
    onSuccess: (_, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: dayClosureKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dayClosureKeys.current(branchId) });
    },
  });
}

// ============================================
// Close Day
// ============================================

export function useCloseDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dayClosureId, data }: { dayClosureId: string; data: CloseDayInput }) =>
      api.post<DayClosure>(`/invoices/day-closures/${dayClosureId}/close`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dayClosureKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dayClosureKeys.all });
    },
  });
}

// ============================================
// Cash Drawer Query Keys
// ============================================

export const cashDrawerKeys = {
  all: ['cashDrawer'] as const,
  balance: (branchId: string) => [...cashDrawerKeys.all, 'balance', branchId] as const,
  transactions: (filters: ListCashTransactionsQuery) =>
    [...cashDrawerKeys.all, 'transactions', filters] as const,
};

// ============================================
// Get Cash Drawer Balance
// ============================================

export function useCashDrawerBalance(branchId: string) {
  return useQuery({
    queryKey: cashDrawerKeys.balance(branchId),
    queryFn: () => api.get<CashDrawerBalance>(`/invoices/cash-drawer/balance?branchId=${branchId}`),
    enabled: !!branchId,
  });
}

// ============================================
// Get Cash Drawer Transactions
// ============================================

export function useCashDrawerTransactions(filters: ListCashTransactionsQuery) {
  return useQuery({
    queryKey: cashDrawerKeys.transactions(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      return api.getPaginated<CashDrawerTransaction>(
        `/invoices/cash-drawer/transactions?${params.toString()}`
      );
    },
    enabled: !!filters.branchId,
  });
}

// ============================================
// Make Cash Adjustment
// ============================================

export function useCashAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: CashAdjustmentInput }) =>
      api.post<CashDrawerTransaction>(
        `/invoices/cash-drawer/adjustment?branchId=${branchId}`,
        data
      ),
    onSuccess: (_, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: cashDrawerKeys.balance(branchId) });
      queryClient.invalidateQueries({ queryKey: cashDrawerKeys.all });
    },
  });
}
