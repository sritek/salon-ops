'use client';

/**
 * Mobile Inline Edit Component
 * Uses bottom sheet for editing on mobile devices
 * Requirements: 11.10
 */

import { useState, useCallback, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BottomSheet } from '@/components/ux/mobile/bottom-sheet';
import { useLongPress } from '@/hooks/use-long-press';

interface MobileInlineEditProps {
  /** Current value */
  value: string;
  /** Callback when value is saved */
  onSave: (value: string) => Promise<void> | void;
  /** Optional validation function */
  validate?: (value: string) => string | null;
  /** Field label for the bottom sheet */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is editable */
  editable?: boolean;
  /** Custom display renderer */
  renderDisplay?: (value: string) => React.ReactNode;
  /** Input type */
  type?: 'text' | 'number' | 'email' | 'tel';
  /** Additional class names */
  className?: string;
  /** Class names for the display text */
  displayClassName?: string;
  /** Whether to show pencil icon on hover */
  showPencilOnHover?: boolean;
  /** Maximum length for the input */
  maxLength?: number;
  /** Callback when edit mode starts */
  onEditStart?: () => void;
  /** Callback when edit mode ends */
  onEditEnd?: () => void;
}

export function MobileInlineEdit({
  value,
  onSave,
  validate,
  label,
  placeholder = 'Enter value',
  editable = true,
  renderDisplay,
  type = 'text',
  className,
  displayClassName,
  showPencilOnHover = true,
  maxLength,
  onEditStart,
  onEditEnd,
}: MobileInlineEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Update edit value when prop value changes
  useEffect(() => {
    if (!isOpen) {
      setEditValue(value);
    }
  }, [value, isOpen]);

  // Open bottom sheet
  const openSheet = useCallback(() => {
    if (!editable) return;
    setIsOpen(true);
    setEditValue(value);
    setError(null);
    onEditStart?.();
  }, [editable, value, onEditStart]);

  // Close bottom sheet
  const closeSheet = useCallback(() => {
    setIsOpen(false);
    setError(null);
    onEditEnd?.();
  }, [onEditEnd]);

  // Save value
  const saveValue = useCallback(async () => {
    // Validate if validator provided
    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Don't save if value hasn't changed
    if (editValue === value) {
      closeSheet();
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      closeSheet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, validate, onSave, closeSheet]);

  // Long press handler
  const longPressHandlers = useLongPress({
    threshold: 500,
    onLongPress: openSheet,
  });

  return (
    <>
      {/* Display mode - tap to edit */}
      <div
        className={cn(
          'group relative inline-flex items-center gap-1',
          editable && 'cursor-pointer',
          className
        )}
        onClick={openSheet}
        {...(editable ? longPressHandlers : {})}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        onKeyDown={(e) => {
          if (editable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openSheet();
          }
        }}
      >
        <span className={cn('truncate', displayClassName)}>
          {renderDisplay ? renderDisplay(value) : value || placeholder}
        </span>
        {editable && showPencilOnHover && (
          <Pencil
            className={cn(
              'h-3 w-3 text-muted-foreground opacity-0 transition-opacity',
              'group-hover:opacity-100 group-focus:opacity-100'
            )}
          />
        )}
      </div>

      {/* Bottom sheet for editing */}
      <BottomSheet open={isOpen} onOpenChange={setIsOpen} title={`Edit ${label}`} snapPoints={[40]}>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="mobile-inline-edit-input">{label}</Label>
            <Input
              id="mobile-inline-edit-input"
              type={type}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setError(null);
              }}
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={isSaving}
              className={cn(error && 'border-red-500 focus-visible:ring-red-500')}
              aria-invalid={!!error}
              aria-describedby={error ? 'mobile-inline-edit-error' : undefined}
              autoFocus
            />
            {error && (
              <p id="mobile-inline-edit-error" className="text-sm text-red-500">
                {error}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={closeSheet} disabled={isSaving}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={saveValue} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
