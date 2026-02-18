/**
 * useCommandPalette Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 2.1, 2.9
 *
 * Hook for controlling the command palette.
 */

import { useCallback } from 'react';
import { useUIStore, useCommandPaletteOpen } from '@/stores/ui-store';

export interface UseCommandPaletteReturn {
  /** Open the command palette */
  open: () => void;
  /** Close the command palette */
  close: () => void;
  /** Toggle the command palette */
  toggle: () => void;
  /** Whether the command palette is open */
  isOpen: boolean;
}

/**
 * Hook for controlling the command palette
 *
 * @example
 * ```tsx
 * const { open, close, toggle, isOpen } = useCommandPalette();
 *
 * // Open the command palette
 * open();
 *
 * // Toggle with a button
 * <button onClick={toggle}>Search</button>
 * ```
 */
export function useCommandPalette(): UseCommandPaletteReturn {
  const store = useUIStore();
  const isOpen = useCommandPaletteOpen();

  const open = useCallback(() => {
    store.openCommandPalette();
  }, [store]);

  const close = useCallback(() => {
    store.closeCommandPalette();
  }, [store]);

  const toggle = useCallback(() => {
    store.toggleCommandPalette();
  }, [store]);

  return {
    open,
    close,
    toggle,
    isOpen,
  };
}
