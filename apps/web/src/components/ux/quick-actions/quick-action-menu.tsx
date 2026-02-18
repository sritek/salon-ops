/**
 * QuickActionMenu Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 3.2, 3.3, 3.7
 *
 * Overflow menu for additional actions beyond the primary action bar.
 * On mobile, renders as a bottom sheet.
 */

'use client';

import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks';
import type { QuickAction } from './entity-actions';

interface QuickActionMenuProps<T> {
  actions: QuickAction<T>[];
  entity: T;
  onActionClick: (action: QuickAction<T>) => void;
  trigger?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

export function QuickActionMenu<T>({
  actions,
  entity,
  onActionClick,
  trigger,
  align = 'end',
}: QuickActionMenuProps<T>) {
  const isMobile = useIsMobile();

  if (actions.length === 0) {
    return null;
  }

  // Group destructive actions at the end with a separator
  const regularActions = actions.filter((a) => a.variant !== 'destructive');
  const destructiveActions = actions.filter((a) => a.variant === 'destructive');

  const renderMenuItem = (action: QuickAction<T>) => {
    const Icon = action.icon;
    const isDisabled = action.isDisabled?.(entity) ?? false;

    return (
      <DropdownMenuItem
        key={action.id}
        onClick={() => !isDisabled && onActionClick(action)}
        disabled={isDisabled}
        className={cn(
          'gap-2 cursor-pointer',
          action.variant === 'destructive' && 'text-red-600 focus:text-red-600',
          action.variant === 'success' && 'text-green-600 focus:text-green-600',
          // Larger touch targets on mobile
          isMobile && 'py-3'
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{action.label}</span>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn(
          // Wider on mobile for easier touch
          isMobile && 'min-w-[200px]'
        )}
      >
        {regularActions.map((action) => renderMenuItem(action))}
        {destructiveActions.length > 0 && regularActions.length > 0 && <DropdownMenuSeparator />}
        {destructiveActions.map((action) => renderMenuItem(action))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
