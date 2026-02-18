/**
 * MobileActionSheet Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 3.7
 *
 * Bottom sheet for displaying quick actions on mobile devices.
 * Triggered by long-press or action menu icon.
 */

'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { QuickAction } from './entity-actions';

interface MobileActionSheetProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  entity: T;
  actions: QuickAction<T>[];
  onActionClick: (action: QuickAction<T>) => void;
}

export function MobileActionSheet<T>({
  open,
  onOpenChange,
  title = 'Actions',
  entity,
  actions,
  onActionClick,
}: MobileActionSheetProps<T>) {
  // Group destructive actions at the end
  const regularActions = actions.filter((a) => a.variant !== 'destructive');
  const destructiveActions = actions.filter((a) => a.variant === 'destructive');

  const handleActionClick = (action: QuickAction<T>) => {
    onActionClick(action);
    onOpenChange(false);
  };

  const renderAction = (action: QuickAction<T>) => {
    const Icon = action.icon;
    const isDisabled = action.isDisabled?.(entity) ?? false;
    const disabledReason = action.disabledReason?.(entity);

    return (
      <Button
        key={action.id}
        variant="ghost"
        className={cn(
          'w-full justify-start gap-3 h-14 text-base font-normal',
          action.variant === 'destructive' && 'text-red-600 hover:text-red-600 hover:bg-red-50',
          action.variant === 'success' && 'text-green-600 hover:text-green-600 hover:bg-green-50'
        )}
        disabled={isDisabled}
        onClick={() => handleActionClick(action)}
      >
        <Icon className="h-5 w-5" />
        <div className="flex flex-col items-start">
          <span>{action.label}</span>
          {isDisabled && disabledReason && (
            <span className="text-xs text-muted-foreground">{disabledReason}</span>
          )}
        </div>
      </Button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl pb-safe">
        {/* Drag handle indicator */}
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4" />

        <SheetHeader className="text-left pb-2">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col -mx-6 px-2">
          {regularActions.map(renderAction)}

          {destructiveActions.length > 0 && regularActions.length > 0 && (
            <Separator className="my-2" />
          )}

          {destructiveActions.map(renderAction)}
        </div>
      </SheetContent>
    </Sheet>
  );
}
