'use client';

/**
 * Slide-Over Content Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 1.1, 1.2
 *
 * Scrollable content area for slide-over panels.
 * Handles scroll behavior and padding.
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SlideOverContentProps {
  children: ReactNode;
  className?: string;
  /** Remove default padding */
  noPadding?: boolean;
}

export function SlideOverContent({
  children,
  className,
  noPadding = false,
}: SlideOverContentProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto', !noPadding && 'px-4 py-4 sm:px-6', className)}>
      {children}
    </div>
  );
}
