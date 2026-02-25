'use client';

/**
 * Slide-Over Panel Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, 1.10
 *
 * Features:
 * - Animated slide-in from right (300ms ease-out)
 * - Backdrop with click-to-close (unless unsaved changes)
 * - Escape key to close
 * - Focus trap for accessibility
 * - Nested panel support (offset by 40px each)
 * - Mobile: Full-screen with back button
 * - Loading skeleton support
 */

import { useEffect, useRef, useCallback, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';
import {
  useSlideOverStore,
  type SlideOverPanel as SlideOverPanelType,
  PANEL_WIDTH_VALUES,
  NESTED_PANEL_OFFSET,
} from '@/stores/slide-over-store';
import {
  slideOverVariants,
  mobileModalVariants,
  backdropVariants,
} from '@/lib/animations/variants';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SlideOverPanelProps {
  panel: SlideOverPanelType;
  index: number;
  getComponent: (id: string) => React.ComponentType<Record<string, unknown>> | undefined;
}

// Loading skeleton for panel content
function PanelSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="pt-4">
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function SlideOverPanel({ panel, index, getComponent }: SlideOverPanelProps) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const store = useSlideOverStore();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus trap - focus the panel when it opens
  useEffect(() => {
    if (panelRef.current) {
      // Find the first focusable element
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, []);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (panel.hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      store.close(panel.id);
    }
  }, [panel.hasUnsavedChanges, panel.id, store]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking the backdrop itself, not the panel
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  // Confirm close with unsaved changes
  const handleConfirmClose = useCallback(() => {
    setShowUnsavedDialog(false);
    store.close(panel.id);
  }, [panel.id, store]);

  // Cancel close
  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  // Get the component to render
  const Component = getComponent(panel.componentId);

  // Calculate offset for nested panels
  const offset = index * NESTED_PANEL_OFFSET;

  // Only show backdrop for the first panel
  const showBackdrop = index === 0;

  if (!mounted) return null;

  // Get width value for inline style (Tailwind JIT can't detect dynamic class names)
  const panelWidth = PANEL_WIDTH_VALUES[panel.width];

  const panelContent = (
    <>
      {/* Backdrop - only for first panel */}
      {showBackdrop && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/50"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <motion.div
        ref={panelRef}
        className={cn(
          'fixed z-50 flex flex-col bg-background shadow-xl',
          isMobile
            ? 'inset-0' // Full screen on mobile
            : 'inset-y-0 right-0 border-l max-w-[calc(100vw-2rem)]'
        )}
        style={
          !isMobile
            ? {
                width: `${panelWidth}px`,
                transform: `translateX(-${offset}px)`,
              }
            : undefined
        }
        variants={isMobile ? mobileModalVariants : slideOverVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`slide-over-title-${panel.id}`}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            {/* Back button on mobile or for nested panels */}
            {(isMobile || index > 0) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h2 id={`slide-over-title-${panel.id}`} className="text-lg font-semibold">
              {panel.title}
            </h2>
          </div>

          {/* Close button - hidden on mobile (use back button instead) */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {Component ? (
            <Suspense fallback={<PanelSkeleton />}>
              <Component {...panel.props} panelId={panel.id} />
            </Suspense>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              Component not found: {panel.componentId}
            </div>
          )}
        </div>

        {/* Unsaved changes indicator */}
        {panel.hasUnsavedChanges && (
          <div className="absolute left-0 top-0 h-1 w-full bg-yellow-500" />
        )}
      </motion.div>
      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close this panel? Your changes will
              be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Discard Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // Render in portal
  return createPortal(panelContent, document.body);
}
