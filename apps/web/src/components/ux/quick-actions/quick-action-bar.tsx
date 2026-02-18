/**
 * QuickActionBar Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * Displays quick actions for an entity on hover/focus.
 * Shows primary actions inline and overflow in a menu.
 */

'use client';

import { useState, useCallback } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/common';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks';
import { QuickActionButton } from './quick-action-button';
import { QuickActionMenu } from './quick-action-menu';
import type { QuickAction, ActionContext } from './entity-actions';
import { getPrimaryActions } from './entity-actions';

interface QuickActionBarProps<T> {
  entity: T;
  actions: QuickAction<T>[];
  context: ActionContext;
  permissions?: string[];
  maxPrimaryActions?: number;
  showLabels?: boolean;
  className?: string;
  /** Show actions only on hover (desktop) or always (mobile) */
  showOnHover?: boolean;
  /** Callback when an action completes */
  onActionComplete?: (actionId: string) => void;
  /** Callback when an action fails */
  onActionError?: (actionId: string, error: Error) => void;
}

interface ConfirmState {
  open: boolean;
  action: QuickAction<unknown> | null;
  isLoading: boolean;
}

export function QuickActionBar<T>({
  entity,
  actions,
  context,
  permissions = [],
  maxPrimaryActions = 3,
  showLabels = false,
  className,
  showOnHover = true,
  onActionComplete,
  onActionError,
}: QuickActionBarProps<T>) {
  const isMobile = useIsMobile();
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    action: null,
    isLoading: false,
  });

  const { primary, overflow } = getPrimaryActions(actions, entity, permissions, maxPrimaryActions);

  const executeAction = useCallback(
    async (action: QuickAction<T>) => {
      setLoadingActionId(action.id);
      try {
        await action.execute(entity, context);
        onActionComplete?.(action.id);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Action failed');
        context.toast.error(err.message);
        onActionError?.(action.id, err);
      } finally {
        setLoadingActionId(null);
      }
    },
    [entity, context, onActionComplete, onActionError]
  );

  const handleActionClick = useCallback(
    (action: QuickAction<T>) => {
      if (action.requiresConfirmation) {
        setConfirmState({
          open: true,
          action: action as QuickAction<unknown>,
          isLoading: false,
        });
      } else {
        executeAction(action);
      }
    },
    [executeAction]
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

  const handleConfirmCancel = useCallback(() => {
    setConfirmState({ open: false, action: null, isLoading: false });
  }, []);

  if (primary.length === 0 && overflow.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex items-center gap-1',
          // On desktop with showOnHover, use opacity transition
          showOnHover && !isMobile && 'opacity-0 group-hover:opacity-100 transition-opacity',
          className
        )}
        role="toolbar"
        aria-label="Quick actions"
      >
        {/* Primary actions */}
        {primary.map((action) => (
          <QuickActionButton
            key={action.id}
            label={action.label}
            icon={action.icon}
            variant={action.variant}
            disabled={action.isDisabled?.(entity)}
            disabledReason={action.disabledReason?.(entity)}
            isLoading={loadingActionId === action.id}
            showLabel={showLabels}
            onClick={() => handleActionClick(action)}
          />
        ))}

        {/* Overflow menu */}
        {overflow.length > 0 && (
          <QuickActionMenu actions={overflow} entity={entity} onActionClick={handleActionClick} />
        )}

        {/* Confirmation dialog */}
        <ConfirmDialog
          open={confirmState.open}
          onOpenChange={(open) => {
            if (!open) handleConfirmCancel();
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
      </div>
    </TooltipProvider>
  );
}
