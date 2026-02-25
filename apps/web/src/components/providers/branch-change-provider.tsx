/**
 * Branch Change Provider
 * Client component that handles branch change query invalidation
 */

'use client';

import { useBranchChangeHandler } from '@/hooks/use-branch-change-handler';

interface BranchChangeProviderProps {
  children: React.ReactNode;
}

export function BranchChangeProvider({ children }: BranchChangeProviderProps) {
  // This hook watches for branch changes and invalidates queries
  useBranchChangeHandler();

  return <>{children}</>;
}
