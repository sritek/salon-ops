'use client';

/**
 * Slide-Over Provider
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 1.1, 1.2, 1.6, 1.9
 *
 * Provides the slide-over panel context and renders the panel stack.
 * Uses a portal to render panels at the root level.
 */

import { createContext, useContext, useCallback, useEffect, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSlideOverStore, type SlideOverWidth } from '@/stores/slide-over-store';
import { SlideOverPanel } from './slide-over-panel';

// Component registry for dynamic rendering
type ComponentRegistry = Map<string, React.ComponentType<Record<string, unknown>>>;

interface SlideOverContextValue {
  openPanel: <T extends Record<string, unknown>>(
    componentId: string,
    props: T,
    options: {
      width?: SlideOverWidth;
      title: string;
      replace?: boolean;
    }
  ) => string;
  closePanel: (id?: string) => void;
  closeAll: () => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
  currentPanelId: string | null;
  registerComponent: (id: string, component: React.ComponentType<Record<string, unknown>>) => void;
  getComponent: (id: string) => React.ComponentType<Record<string, unknown>> | undefined;
}

const SlideOverContext = createContext<SlideOverContextValue | null>(null);

// Global component registry
const componentRegistry: ComponentRegistry = new Map();

interface SlideOverProviderProps {
  children: ReactNode;
}

export function SlideOverProvider({ children }: SlideOverProviderProps) {
  const store = useSlideOverStore();
  const panels = store.panels;
  const topPanel = panels.length > 0 ? panels[panels.length - 1] : null;

  // Register a component for dynamic rendering
  const registerComponent = useCallback(
    (id: string, component: React.ComponentType<Record<string, unknown>>) => {
      componentRegistry.set(id, component);
    },
    []
  );

  // Get a registered component
  const getComponent = useCallback((id: string) => {
    return componentRegistry.get(id);
  }, []);

  // Open a panel
  const openPanel = useCallback(
    <T extends Record<string, unknown>>(
      componentId: string,
      props: T,
      options: {
        width?: SlideOverWidth;
        title: string;
        replace?: boolean;
      }
    ): string => {
      const panelConfig = {
        componentId,
        props: props as Record<string, unknown>,
        width: options.width || 'medium',
        title: options.title,
      };

      if (options.replace) {
        return store.replace(panelConfig);
      }
      return store.push(panelConfig);
    },
    [store]
  );

  // Close a panel
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

  // Close all panels
  const closeAll = useCallback(() => {
    store.closeAll();
  }, [store]);

  // Set unsaved changes for current panel
  const setUnsavedChanges = useCallback(
    (hasChanges: boolean) => {
      if (topPanel) {
        store.setUnsavedChanges(topPanel.id, hasChanges);
      }
    },
    [store, topPanel]
  );

  // Handle escape key to close panels
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && panels.length > 0) {
        const currentPanel = panels[panels.length - 1];
        if (currentPanel && !currentPanel.hasUnsavedChanges) {
          store.pop();
        }
        // If there are unsaved changes, the panel component will handle the confirmation
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [panels, store]);

  const contextValue: SlideOverContextValue = {
    openPanel,
    closePanel,
    closeAll,
    setUnsavedChanges,
    currentPanelId: topPanel?.id || null,
    registerComponent,
    getComponent,
  };

  return (
    <SlideOverContext.Provider value={contextValue}>
      {children}
      <AnimatePresence mode="sync">
        {panels.map((panel, index) => (
          <SlideOverPanel key={panel.id} panel={panel} index={index} getComponent={getComponent} />
        ))}
      </AnimatePresence>
    </SlideOverContext.Provider>
  );
}

// Hook to use slide-over context
export function useSlideOver() {
  const context = useContext(SlideOverContext);
  if (!context) {
    throw new Error('useSlideOver must be used within a SlideOverProvider');
  }
  return context;
}

// Hook to register a component for slide-over rendering
export function useRegisterSlideOverComponent(
  id: string,
  component: React.ComponentType<Record<string, unknown>>
) {
  const { registerComponent } = useSlideOver();

  useEffect(() => {
    registerComponent(id, component);
  }, [id, component, registerComponent]);
}
