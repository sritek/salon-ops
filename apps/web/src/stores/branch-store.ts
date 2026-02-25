/**
 * Branch Store
 * Manages the selected branch state for multi-branch users
 * Persists selection to localStorage for session continuity
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface BranchState {
  selectedBranchId: string | null;

  // Actions
  setSelectedBranch: (branchId: string) => void;
  clearSelectedBranch: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: null,

      setSelectedBranch: (branchId: string) => set({ selectedBranchId: branchId }),

      clearSelectedBranch: () => set({ selectedBranchId: null }),
    }),
    {
      name: 'branch-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ selectedBranchId: state.selectedBranchId }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useSelectedBranchId = () => useBranchStore((state) => state.selectedBranchId);

export const useBranchActions = () =>
  useBranchStore((state) => ({
    setSelectedBranch: state.setSelectedBranch,
    clearSelectedBranch: state.clearSelectedBranch,
  }));
