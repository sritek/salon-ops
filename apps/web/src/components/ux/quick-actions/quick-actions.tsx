/**
 * QuickActions Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 3.1, 3.2, 3.7
 *
 * Unified quick actions component that handles both desktop and mobile.
 * - Desktop: Shows action bar on hover
 * - Mobile: Shows action icon, opens bottom sheet on tap or long-press
 */

'use client';

import { useState, useCallback } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks';
import { QuickActionBar } from './quick-action-bar';
import { MobileActionSheet } from './mobile-action-sheet';
import type { QuickAction, ActionContext } from './entity-actions';
import { getVisibleActions } from './entity-actions';

interface QuickActionsProps<T> {
  entity: T;
  actions: QuickAction<T>[];
  context: ActionContext;
  permissions?: string[];
  /** Title for mobile action sheet */
  title?: string;
  /** Maximum primary actions on desktop */
  maxPrimaryActions?: number;
  /** Show labels on desktop action buttons */
  showLabels?: boolean;
  /** Additional class name */
  className?: string;
  /** Callback when action completes */
  onActionComplete?: (actionId: string) => void;
  /** Callback when action fails */
  onActionError?: (actionId: string, error: Error) => void;
}

interface ConfirmState {
  open: boolean;
  action: QuickAction<unknown> | null;
  isLoading: boolean;
}

/**
 * Unified quick actions component for desktop and mobile
 *
 * @example
 * ```tsx
 * const { actions, context } = useQuickActions('appointment', appointment);
 *
 * return (
 *   <div className="group relative">
 *     <AppointmentCard appointment={appointment} />
 *     <QuickActions
 *       entity={appointment}
 *       actions={actions}
 *       context={context}
 *       title={appointment.customerName}
 *     />
 *   </div>
 * );
 * ```
 */
export function QuickActions<T>({
  entity,
  actions,
  context,
  permissions = [],
  title = 'Actions',
  maxPrimaryActions = 3,
  showLabels = false,
  className,
  onActionComplete,
  onActionError,
}: QuickActionsProps<T>) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    action: null,
    isLoading: false,
  });

  const visibleActions = getVisibleActions(actions, entity, permissions);

  const handleActionClick = useCallback(
    async (action: QuickAction<T>) => {
      if (action.requiresConfirmation) {
        setConfirmState({
          open: true,
          action: action as QuickAction<unknown>,
          isLoading: false,
        });
      } else {
        try {
          await action.execute(entity, context);
          onActionComplete?.(action.id);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Action failed');
          context.toast.error(err.message);
          onActionError?.(action.id, err);
        }
      }
    },
    [entity, context, onActionComplete, onActionError]
  );

  const handleConfirm = useCallback(async () => {
    if (!confirmState.action) return;

    setConfirmState((prev) => ({ ...prev, isLoading: true }));
    try {
      await confirmState.action.execute(entity, context);
      onActionComplete?.(confirmState.action.id);
      setConfirmState({ open: false, action: null, isLoading: false });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Action failed');
      context.toast.error(err.message);
      onActionError?.(confirmState.action.id, err);
      setConfirmState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [confirmState.action, entity, context, onActionComplete, onActionError]);

  if (visibleActions.length === 0) {
    return null;
  }

  // Mobile: Show action icon that opens bottom sheet
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 w-8 p-0', className)}
          onClick={() => setSheetOpen(true)}
          aria-label="Open actions menu"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>

        <MobileActionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={title}
          entity={entity}
          actions={visibleActions}
          onActionClick={handleActionClick}
        />

        <ConfirmDialog
          open={confirmState.open}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmState({ open: false, action: null, isLoading: false });
            }
          }}
          title={confirmState.action?.confirmationTitle || 'Confirm Action'}
          description={
            confirmState.action?.confirmationMessage ||
            'Are you sure you want to perform this action?'
          }
          variant={confirmState.action?.variant === 'destructive' ? 'destructive' : 'default'}
          onConfirm={handleConfirm}
          isLoading={confirmState.isLoading}
        />
      </>
    );
  }

  // Desktop: Show action bar
  return (
    <QuickActionBar
      entity={entity}
      actions={actions}
      context={context}
      permissions={permissions}
      maxPrimaryActions={maxPrimaryActions}
      showLabels={showLabels}
      className={className}
      onActionComplete={onActionComplete}
      onActionError={onActionError}
    />
  );
}
