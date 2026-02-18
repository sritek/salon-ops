'use client';

/**
 * Slide-Over Header Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 1.8
 *
 * Header with title, close button, and optional action buttons.
 * Used within slide-over panel content components.
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SlideOverHeaderProps {
  children?: ReactNode;
  className?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Optional action buttons to display on the right */
  actions?: ReactNode;
}

export function SlideOverHeader({ children, className, subtitle, actions }: SlideOverHeaderProps) {
  return (
    <div className={cn('space-y-1 px-4 py-4 sm:px-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {children && <div className="text-base font-medium text-foreground">{children}</div>}
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
