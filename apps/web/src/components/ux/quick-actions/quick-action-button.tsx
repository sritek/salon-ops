/**
 * QuickActionButton Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 3.2, 3.3, 3.8
 *
 * Individual action button with icon, label, and keyboard accessibility.
 */

'use client';

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface QuickActionButtonProps {
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive' | 'success';
  disabled?: boolean;
  disabledReason?: string;
  isLoading?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'default';
  onClick: () => void;
  className?: string;
}

export const QuickActionButton = forwardRef<HTMLButtonElement, QuickActionButtonProps>(
  function QuickActionButton(
    {
      label,
      icon: Icon,
      variant = 'default',
      disabled = false,
      disabledReason,
      isLoading = false,
      showLabel = false,
      size = 'sm',
      onClick,
      className,
    },
    ref
  ) {
    const buttonVariant =
      variant === 'destructive' ? 'destructive' : variant === 'success' ? 'default' : 'outline';

    const button = (
      <Button
        ref={ref}
        variant={buttonVariant}
        size={size}
        disabled={disabled || isLoading}
        onClick={onClick}
        className={cn(
          'gap-1.5',
          variant === 'success' && 'bg-green-600 hover:bg-green-700 text-white',
          !showLabel && 'px-2',
          className
        )}
        aria-label={label}
      >
        <Icon className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        {showLabel && <span>{label}</span>}
      </Button>
    );

    // Show tooltip when label is hidden or when disabled with reason
    if (!showLabel || (disabled && disabledReason)) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{disabled && disabledReason ? disabledReason : label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  }
);
