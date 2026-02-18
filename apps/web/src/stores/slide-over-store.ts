/**
 * Slide-Over Panel Store
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 1.1, 1.2, 1.6
 *
 * Manages the stack of slide-over panels with support for:
 * - Push/pop/replace operations
 * - Nested panels (max depth 2)
 * - Unsaved changes tracking
 * - Panel width variants
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type SlideOverWidth = 'narrow' | 'medium' | 'wide';

export interface SlideOverPanel {
  id: string;
  componentId: string;
  props: Record<string, unknown>;
  width: SlideOverWidth;
  title: string;
  hasUnsavedChanges: boolean;
  onClose?: () => void;
}

interface SlideOverState {
  panels: SlideOverPanel[];
  maxDepth: number;

  // Actions
  push: (panel: Omit<SlideOverPanel, 'id' | 'hasUnsavedChanges'>) => string;
  pop: () => void;
  replace: (panel: Omit<SlideOverPanel, 'id' | 'hasUnsavedChanges'>) => string;
  close: (id: string) => void;
  closeAll: () => void;
  setUnsavedChanges: (id: string, hasChanges: boolean) => void;
  getPanelById: (id: string) => SlideOverPanel | undefined;
  getTopPanel: () => SlideOverPanel | undefined;
  canPush: () => boolean;
}

// Width mappings for CSS classes
export const PANEL_WIDTHS: Record<SlideOverWidth, string> = {
  narrow: 'w-[400px]',
  medium: 'w-[600px]',
  wide: 'w-[800px]',
} as const;

// Width values in pixels for calculations
export const PANEL_WIDTH_VALUES: Record<SlideOverWidth, number> = {
  narrow: 400,
  medium: 600,
  wide: 800,
} as const;

// Offset for nested panels
export const NESTED_PANEL_OFFSET = 40;

export const useSlideOverStore = create<SlideOverState>((set, get) => ({
  panels: [],
  maxDepth: 2,

  push: (panel) => {
    const state = get();

    // Enforce max depth
    if (state.panels.length >= state.maxDepth) {
      console.warn(
        `Cannot push panel: max depth (${state.maxDepth}) reached. Use replace() instead.`
      );
      return '';
    }

    const id = nanoid();
    const newPanel: SlideOverPanel = {
      ...panel,
      id,
      hasUnsavedChanges: false,
    };

    set((state) => ({
      panels: [...state.panels, newPanel],
    }));

    return id;
  },

  pop: () => {
    const state = get();
    if (state.panels.length === 0) return;

    const topPanel = state.panels[state.panels.length - 1];

    // Call onClose callback if provided
    topPanel?.onClose?.();

    set((state) => ({
      panels: state.panels.slice(0, -1),
    }));
  },

  replace: (panel) => {
    const state = get();
    if (state.panels.length === 0) {
      // If no panels, just push
      return get().push(panel);
    }

    const id = nanoid();
    const newPanel: SlideOverPanel = {
      ...panel,
      id,
      hasUnsavedChanges: false,
    };

    // Call onClose callback of the panel being replaced
    const topPanel = state.panels[state.panels.length - 1];
    topPanel?.onClose?.();

    set((state) => ({
      panels: [...state.panels.slice(0, -1), newPanel],
    }));

    return id;
  },

  close: (id) => {
    const state = get();
    const panelIndex = state.panels.findIndex((p) => p.id === id);

    if (panelIndex === -1) return;

    // Close this panel and all panels above it
    const panelsToClose = state.panels.slice(panelIndex);
    panelsToClose.forEach((p) => p.onClose?.());

    set((state) => ({
      panels: state.panels.slice(0, panelIndex),
    }));
  },

  closeAll: () => {
    const state = get();

    // Call onClose for all panels
    state.panels.forEach((p) => p.onClose?.());

    set({ panels: [] });
  },

  setUnsavedChanges: (id, hasChanges) => {
    set((state) => ({
      panels: state.panels.map((p) => (p.id === id ? { ...p, hasUnsavedChanges: hasChanges } : p)),
    }));
  },

  getPanelById: (id) => {
    return get().panels.find((p) => p.id === id);
  },

  getTopPanel: () => {
    const panels = get().panels;
    return panels.length > 0 ? panels[panels.length - 1] : undefined;
  },

  canPush: () => {
    return get().panels.length < get().maxDepth;
  },
}));

// Selector hooks for common use cases
export const useSlideOverPanels = () => useSlideOverStore((state) => state.panels);
export const useSlideOverTopPanel = () =>
  useSlideOverStore((state) =>
    state.panels.length > 0 ? state.panels[state.panels.length - 1] : undefined
  );
export const useSlideOverIsOpen = () => useSlideOverStore((state) => state.panels.length > 0);
export const useSlideOverCanPush = () =>
  useSlideOverStore((state) => state.panels.length < state.maxDepth);
