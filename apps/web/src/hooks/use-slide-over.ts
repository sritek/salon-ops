/**
 * useSlideOver Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 1.1, 1.2, 1.5, 1.6
 *
 * Hook for opening and managing slide-over panels.
 * Provides a simple API for opening panels with components and props.
 */

import { useCallback } from 'react';
import {
  useSlideOverStore,
  useSlideOverTopPanel,
  useSlideOverIsOpen,
  useSlideOverCanPush,
  type SlideOverWidth,
} from '@/stores/slide-over-store';

export interface UseSlideOverReturn {
  /** Open a new panel */
  openPanel: (
    componentId: string,
    props: Record<string, unknown>,
    options: {
      width?: SlideOverWidth;
      title: string;
      replace?: boolean;
    }
  ) => string;
  /** Close the current panel or a specific panel by ID */
  closePanel: (id?: string) => void;
  /** Close all panels */
  closeAll: () => void;
  /** Mark the current panel as having unsaved changes */
  setUnsavedChanges: (hasChanges: boolean) => void;
  /** ID of the current (top) panel */
  currentPanelId: string | null;
  /** Whether any panel is open */
  isOpen: boolean;
  /** Whether a new panel can be pushed (not at max depth) */
  canPush: boolean;
}

/**
 * Hook for managing slide-over panels
 *
 * @example
 * ```tsx
 * const { openPanel, closePanel } = useSlideOver();
 *
 * // Open a customer details panel
 * openPanel('customer-details', { customerId: '123' }, {
 *   width: 'medium',
 *   title: 'Customer Details',
 * });
 *
 * // Open a nested panel (replaces current if at max depth)
 * openPanel('appointment-form', { customerId: '123' }, {
 *   width: 'wide',
 *   title: 'New Appointment',
 * });
 *
 * // Close the current panel
 * closePanel();
 * ```
 */
export function useSlideOver(): UseSlideOverReturn {
  const store = useSlideOverStore();
  const topPanel = useSlideOverTopPanel();
  const isOpen = useSlideOverIsOpen();
  const canPush = useSlideOverCanPush();

  const openPanel = useCallback(
    (
      componentId: string,
      props: Record<string, unknown>,
      options: {
        width?: SlideOverWidth;
        title: string;
        replace?: boolean;
      }
    ): string => {
      const panelConfig = {
        componentId,
        props,
        width: options.width || 'medium',
        title: options.title,
      };

      // If replace is requested or we're at max depth, replace the current panel
      if (options.replace || !store.canPush()) {
        return store.replace(panelConfig);
      }

      return store.push(panelConfig);
    },
    [store]
  );

  const closePanel = useCallback(
    (id?: string) => {
      if (id) {
        store.close(id);
      } else {
        store.pop();
      }
    },
    [store]
  );

  const closeAll = useCallback(() => {
    store.closeAll();
  }, [store]);

  const setUnsavedChanges = useCallback(
    (hasChanges: boolean) => {
      if (topPanel) {
        store.setUnsavedChanges(topPanel.id, hasChanges);
      }
    },
    [store, topPanel]
  );

  return {
    openPanel,
    closePanel,
    closeAll,
    setUnsavedChanges,
    currentPanelId: topPanel?.id || null,
    isOpen,
    canPush,
  };
}

/**
 * Hook for accessing the current panel's ID within a panel component
 */
export function useCurrentPanelId(): string | null {
  const topPanel = useSlideOverTopPanel();
  return topPanel?.id || null;
}

/**
 * Hook for marking the current panel as having unsaved changes
 * Useful for form components within panels
 */
export function useSlideOverUnsavedChanges() {
  const store = useSlideOverStore();
  const topPanel = useSlideOverTopPanel();

  const setUnsavedChanges = useCallback(
    (hasChanges: boolean) => {
      if (topPanel) {
        store.setUnsavedChanges(topPanel.id, hasChanges);
      }
    },
    [store, topPanel]
  );

  const hasUnsavedChanges = topPanel?.hasUnsavedChanges || false;

  return {
    hasUnsavedChanges,
    setUnsavedChanges,
  };
}
