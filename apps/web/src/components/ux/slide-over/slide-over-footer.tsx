'use client';

/**
 * Slide-Over Footer Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 1.8
 *
 * Sticky footer for action buttons in slide-over panels.
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SlideOverFooterProps {
  children: ReactNode;
  className?: string;
  /** Show border at top */
  bordered?: boolean;
}

export function SlideOverFooter({ children, className, bordered = true }: SlideOverFooterProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 bg-background px-4 py-4 sm:px-6',
        bordered && 'border-t',
        className
      )}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
    </div>
  );
}
