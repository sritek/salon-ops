/**
 * UI Store
 * Based on: .cursor/rules/14-frontend-implementation.mdc lines 600-630
 * Updated for UX Redesign: .kiro/specs/ux-redesign/design.md
 * Requirements: 2.1
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ActiveView = 'command-center' | 'calendar' | 'my-schedule' | 'analytics' | 'default';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  currentBranchId: string | null;

  // Command palette state (Requirement 2.1)
  commandPaletteOpen: boolean;

  // Active view for role-based dashboards
  activeView: ActiveView;

  // Mobile FAB menu state
  fabMenuOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setCurrentBranch: (branchId: string) => void;

  // Command palette actions
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // View actions
  setActiveView: (view: ActiveView) => void;

  // FAB actions
  setFabMenuOpen: (open: boolean) => void;
  toggleFabMenu: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileNavOpen: false,
      currentBranchId: null,
      commandPaletteOpen: false,
      activeView: 'default',
      fabMenuOpen: false,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),

      // Command palette actions
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      // View actions
      setActiveView: (view) => set({ activeView: view }),

      // FAB actions
      setFabMenuOpen: (open) => set({ fabMenuOpen: open }),
      toggleFabMenu: () => set((state) => ({ fabMenuOpen: !state.fabMenuOpen })),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        currentBranchId: state.currentBranchId,
        activeView: state.activeView,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useCommandPaletteOpen = () => useUIStore((state) => state.commandPaletteOpen);
export const useActiveView = () => useUIStore((state) => state.activeView);
export const useFabMenuOpen = () => useUIStore((state) => state.fabMenuOpen);
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
