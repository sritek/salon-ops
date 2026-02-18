/**
 * Hover States Components
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 10.12
 *
 * Provides subtle hover states for interactive elements
 * with response within 50ms.
 */

'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion';

// Fast hover transition (under 50ms perceived)
const hoverTransition = {
  type: 'tween' as const,
  duration: 0.05,
  ease: 'easeOut',
};

// Interactive card with hover lift effect
interface HoverCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(
  ({ children, className, disabled, ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
      <motion.div
        ref={ref}
        whileHover={
          !disabled && !prefersReducedMotion
            ? {
                y: -2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }
            : undefined
        }
        whileTap={!disabled && !prefersReducedMotion ? { scale: 0.99 } : undefined}
        transition={hoverTransition}
        className={cn('transition-colors', disabled && 'opacity-50 cursor-not-allowed', className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
HoverCard.displayName = 'HoverCard';

// Interactive row with hover highlight
interface HoverRowProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const HoverRow = forwardRef<HTMLDivElement, HoverRowProps>(
  ({ children, className, disabled, ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
      <motion.div
        ref={ref}
        whileHover={
          !disabled && !prefersReducedMotion
            ? {
                backgroundColor: 'rgba(0,0,0,0.02)',
              }
            : undefined
        }
        transition={hoverTransition}
        className={cn(
          'transition-colors',
          !disabled && 'hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
HoverRow.displayName = 'HoverRow';

// Interactive button with scale effect
interface HoverButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const HoverButton = forwardRef<HTMLButtonElement, HoverButtonProps>(
  ({ children, className, disabled, ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !prefersReducedMotion ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !prefersReducedMotion ? { scale: 0.98 } : undefined}
        transition={hoverTransition}
        disabled={disabled}
        className={cn('transition-colors', disabled && 'opacity-50 cursor-not-allowed', className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
HoverButton.displayName = 'HoverButton';

// Icon button with hover background
interface HoverIconButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const HoverIconButton = forwardRef<HTMLButtonElement, HoverIconButtonProps>(
  ({ children, className, disabled, size = 'md', ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    const sizeClasses = {
      sm: 'h-7 w-7',
      md: 'h-9 w-9',
      lg: 'h-11 w-11',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={
          !disabled && !prefersReducedMotion
            ? {
                backgroundColor: 'rgba(0,0,0,0.05)',
              }
            : undefined
        }
        whileTap={!disabled && !prefersReducedMotion ? { scale: 0.95 } : undefined}
        transition={hoverTransition}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-md',
          'transition-colors hover:bg-muted',
          sizeClasses[size],
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
HoverIconButton.displayName = 'HoverIconButton';

// Link with underline animation
interface HoverLinkProps extends HTMLMotionProps<'a'> {
  children: React.ReactNode;
  className?: string;
}

export const HoverLink = forwardRef<HTMLAnchorElement, HoverLinkProps>(
  ({ children, className, ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
      <motion.a
        ref={ref}
        className={cn(
          'relative inline-block text-primary',
          'after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0',
          'after:bg-primary after:transition-all after:duration-150',
          'hover:after:w-full',
          className
        )}
        whileHover={!prefersReducedMotion ? { x: 2 } : undefined}
        transition={hoverTransition}
        {...props}
      >
        {children}
      </motion.a>
    );
  }
);
HoverLink.displayName = 'HoverLink';

// Table row with hover highlight
interface HoverTableRowProps extends HTMLMotionProps<'tr'> {
  children: React.ReactNode;
  className?: string;
  isSelected?: boolean;
}

export const HoverTableRow = forwardRef<HTMLTableRowElement, HoverTableRowProps>(
  ({ children, className, isSelected, ...props }, ref) => {
    return (
      <motion.tr
        ref={ref}
        className={cn(
          'transition-colors duration-50',
          'hover:bg-muted/50',
          isSelected && 'bg-muted',
          className
        )}
        {...props}
      >
        {children}
      </motion.tr>
    );
  }
);
HoverTableRow.displayName = 'HoverTableRow';

// Badge with hover scale
interface HoverBadgeProps extends HTMLMotionProps<'span'> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export const HoverBadge = forwardRef<HTMLSpanElement, HoverBadgeProps>(
  ({ children, className, interactive = true, ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
      <motion.span
        ref={ref}
        whileHover={interactive && !prefersReducedMotion ? { scale: 1.05 } : undefined}
        transition={hoverTransition}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          interactive && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </motion.span>
    );
  }
);
HoverBadge.displayName = 'HoverBadge';

// Avatar with hover ring
interface HoverAvatarProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const HoverAvatar = forwardRef<HTMLDivElement, HoverAvatarProps>(
  ({ children, className, size = 'md', ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    };

    return (
      <motion.div
        ref={ref}
        whileHover={
          !prefersReducedMotion
            ? {
                boxShadow: '0 0 0 2px var(--primary)',
              }
            : undefined
        }
        transition={hoverTransition}
        className={cn('rounded-full overflow-hidden', sizeClasses[size], className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
HoverAvatar.displayName = 'HoverAvatar';
