/**
 * Branch Context Hook
 * Combines auth store (branchIds) with branch store (selection)
 * Returns the effective branchId for API calls with fallback logic
 */

'use client';

import { useMemo, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';

export interface Branch {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface BranchContext {
  /** Effective branch ID for API calls */
  branchId: string | null;
  /** All branch IDs the user has access to */
  branchIds: string[];
  /** Currently selected branch ID from store */
  selectedBranchId: string | null;
  /** Set the selected branch */
  setSelectedBranch: (branchId: string) => void;
  /** Clear the selected branch */
  clearSelectedBranch: () => void;
  /** Whether user can switch between branches (has multiple branches) */
  canSwitchBranches: boolean;
  /** User's role */
  role: string | null;
}

/**
 * Hook to access branch context throughout the application
 * Handles fallback logic for invalid/missing selections
 */
export function useBranchContext(): BranchContext {
  const user = useAuthStore((state) => state.user);
  const { selectedBranchId, setSelectedBranch, clearSelectedBranch } = useBranchStore();

  const branchIds = user?.branchIds || [];
  const role = user?.role || null;

  // Determine if user can switch branches
  // Only super_owner and regional_manager with multiple branches can switch
  const canSwitchBranches = useMemo(() => {
    const isMultiBranchRole = role === 'super_owner' || role === 'regional_manager';
    return isMultiBranchRole && branchIds.length > 1;
  }, [role, branchIds.length]);

  // Calculate effective branchId with fallback logic
  const branchId = useMemo(() => {
    // No branches assigned
    if (branchIds.length === 0) {
      return null;
    }

    // If selected branch is valid (exists in user's branches), use it
    if (selectedBranchId && branchIds.includes(selectedBranchId)) {
      return selectedBranchId;
    }

    // Fallback to first branch
    return branchIds[0];
  }, [selectedBranchId, branchIds]);

  // Clear invalid selection if persisted branch is no longer accessible
  useEffect(() => {
    if (selectedBranchId && branchIds.length > 0 && !branchIds.includes(selectedBranchId)) {
      clearSelectedBranch();
    }
  }, [selectedBranchId, branchIds, clearSelectedBranch]);

  return {
    branchId,
    branchIds,
    selectedBranchId,
    setSelectedBranch,
    clearSelectedBranch,
    canSwitchBranches,
    role,
  };
}
