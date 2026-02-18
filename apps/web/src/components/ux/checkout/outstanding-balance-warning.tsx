'use client';

/**
 * Outstanding Balance Warning Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.11
 *
 * Displays warning banner if customer has pending invoices.
 * Checks for outstanding balance before checkout.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  createdAt: string;
}

interface OutstandingBalanceResponse {
  hasOutstanding: boolean;
  totalOutstanding: number;
  invoices: OutstandingInvoice[];
}

interface OutstandingBalanceWarningProps {
  customerId?: string;
  className?: string;
  onViewInvoices?: () => void;
}

// ============================================
// Query Hook
// ============================================

function useOutstandingBalance(customerId?: string) {
  return useQuery({
    queryKey: ['customer-outstanding', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      return api.get<OutstandingBalanceResponse>(`/customers/${customerId}/outstanding`);
    },
    enabled: !!customerId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================
// Main Component
// ============================================

export function OutstandingBalanceWarning({
  customerId,
  className,
  onViewInvoices,
}: OutstandingBalanceWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const { data, isLoading, error } = useOutstandingBalance(customerId);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  const handleViewInvoices = useCallback(() => {
    if (onViewInvoices) {
      onViewInvoices();
    } else if (customerId) {
      window.open(`/customers/${customerId}?tab=invoices`, '_blank');
    }
  }, [customerId, onViewInvoices]);

  // Don't show if no customer
  if (!customerId) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // Error state - silently fail
  if (error) return null;

  // No outstanding balance
  if (!data?.hasOutstanding) return null;

  // Dismissed
  if (isDismissed) return null;

  const { totalOutstanding, invoices } = data;

  return (
    <Alert variant="destructive" className={cn('relative', className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Outstanding Balance</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p>
            This customer has an outstanding balance of{' '}
            <span className="font-semibold">₹{totalOutstanding.toFixed(2)}</span>
            {invoices.length > 0 && (
              <span className="text-muted-foreground">
                {' '}
                from {invoices.length} unpaid invoice{invoices.length > 1 ? 's' : ''}
              </span>
            )}
          </p>

          {invoices.length > 0 && invoices.length <= 3 && (
            <ul className="text-xs space-y-1 mt-2">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="flex justify-between">
                  <span>#{invoice.invoiceNumber}</span>
                  <span>₹{invoice.amountDue.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}

          <Button variant="outline" size="sm" className="mt-2" onClick={handleViewInvoices}>
            <ExternalLink className="h-3 w-3 mr-1" />
            View Invoices
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ============================================
// Compact Version for Inline Use
// ============================================

export function OutstandingBalanceBadge({
  customerId,
  className,
}: {
  customerId?: string;
  className?: string;
}) {
  const { data } = useOutstandingBalance(customerId);

  if (!customerId || !data?.hasOutstanding) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        className
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      <span>₹{data.totalOutstanding.toFixed(2)} due</span>
    </div>
  );
}
