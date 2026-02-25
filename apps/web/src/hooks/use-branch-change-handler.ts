/**
 * Branch Change Handler Hook
 * Invalidates branch-scoped queries when the selected branch changes
 */

'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBranchContext } from './use-branch-context';

/**
 * Query key prefixes that are branch-scoped and need invalidation
 */
const BRANCH_SCOPED_QUERY_KEYS = [
  'appointments',
  'calendar',
  'resourceCalendar',
  'customers',
  'invoices',
  'billing',
  'staff',
  'inventory',
  'walkInQueue',
  'dashboard',
  'commandCenter',
  'stylists',
  'services', // Some service queries may be branch-scoped
];

/**
 * Hook that watches for branch changes and invalidates relevant queries
 * Should be used once at the app level (e.g., in protected layout)
 */
export function useBranchChangeHandler() {
  const queryClient = useQueryClient();
  const { branchId } = useBranchContext();
  const previousBranchIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip on initial mount or if branchId is null
    if (branchId === null) {
      return;
    }

    // Skip if this is the first time we're setting the branch
    if (previousBranchIdRef.current === null) {
      previousBranchIdRef.current = branchId;
      return;
    }

    // Skip if branch hasn't actually changed
    if (previousBranchIdRef.current === branchId) {
      return;
    }

    // Branch has changed - invalidate all branch-scoped queries
    console.log(
      `Branch changed from ${previousBranchIdRef.current} to ${branchId}, invalidating queries...`
    );

    // Invalidate each branch-scoped query key
    BRANCH_SCOPED_QUERY_KEYS.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });

    // Update the ref
    previousBranchIdRef.current = branchId;
  }, [branchId, queryClient]);
}
