'use client';

/**
 * Inline Edit Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type FocusEvent,
} from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLongPress } from '@/hooks/use-long-press';

interface InlineEditProps {
  /** Current value */
  value: string;
  /** Callback when value is saved */
  onSave: (value: string) => Promise<void> | void;
  /** Optional validation function */
  validate?: (value: string) => string | null;
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
  /** Class names for the input */
  inputClassName?: string;
  /** Whether to show pencil icon on hover */
  showPencilOnHover?: boolean;
  /** Minimum width for the input */
  minWidth?: number;
  /** Maximum length for the input */
  maxLength?: number;
  /** Callback when edit mode starts */
  onEditStart?: () => void;
  /** Callback when edit mode ends */
  onEditEnd?: () => void;
}

export function InlineEdit({
  value,
  onSave,
  validate,
  placeholder = 'Click to edit',
  editable = true,
  renderDisplay,
  type = 'text',
  className,
  displayClassName,
  inputClassName,
  showPencilOnHover = true,
  minWidth = 100,
  maxLength,
  onEditStart,
  onEditEnd,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Start editing
  const startEditing = useCallback(() => {
    if (!editable) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
    onEditStart?.();
  }, [editable, value, onEditStart]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    onEditEnd?.();
  }, [value, onEditEnd]);

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
      setIsEditing(false);
      onEditEnd?.();
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
      onEditEnd?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, validate, onSave, onEditEnd]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveValue();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
    },
    [saveValue, cancelEditing]
  );

  // Handle blur (save on blur)
  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      // Don't save if clicking on action buttons
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget?.closest('[data-inline-edit-action]')) {
        return;
      }
      saveValue();
    },
    [saveValue]
  );

  // Long press handler for mobile
  const longPressHandlers = useLongPress({
    threshold: 500,
    onLongPress: startEditing,
  });

  // Double click handler
  const handleDoubleClick = useCallback(() => {
    startEditing();
  }, [startEditing]);

  // Render display mode
  if (!isEditing) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'group relative inline-flex items-center gap-1',
          editable && 'cursor-pointer',
          className
        )}
        onDoubleClick={handleDoubleClick}
        {...(editable ? longPressHandlers : {})}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        onKeyDown={(e) => {
          if (editable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            startEditing();
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
    );
  }

  // Render edit mode
  return (
    <div ref={containerRef} className={cn('inline-flex items-center gap-1', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isSaving}
          className={cn(
            'h-8 py-1',
            error && 'border-red-500 focus-visible:ring-red-500',
            inputClassName
          )}
          style={{ minWidth }}
          aria-invalid={!!error}
          aria-describedby={error ? 'inline-edit-error' : undefined}
        />
        {error && (
          <p id="inline-edit-error" className="absolute left-0 top-full mt-1 text-xs text-red-500">
            {error}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={saveValue}
          disabled={isSaving}
          data-inline-edit-action
          aria-label="Save"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4 text-green-600" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={cancelEditing}
          disabled={isSaving}
          data-inline-edit-action
          aria-label="Cancel"
        >
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </div>
  );
}
