/**
 * Native Pickers for Mobile
 * Uses native date/time pickers on mobile devices for better UX
 * Requirements: 8.11
 */

'use client';

import { forwardRef, useCallback } from 'react';
import { format, parse } from 'date-fns';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useIsTouchDevice } from '@/hooks/use-mobile-gestures';

interface NativeDatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  min?: Date;
  max?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Native date picker that uses the device's native date picker on mobile
 */
export const NativeDatePicker = forwardRef<HTMLInputElement, NativeDatePickerProps>(
  ({ value, onChange, min, max, placeholder = 'Select date', disabled, className }, ref) => {
    const isTouch = useIsTouchDevice();

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateString = e.target.value;
        if (dateString) {
          const date = parse(dateString, 'yyyy-MM-dd', new Date());
          onChange(date);
        } else {
          onChange(undefined);
        }
      },
      [onChange]
    );

    // On touch devices, use native date input
    if (isTouch) {
      return (
        <Input
          ref={ref}
          type="date"
          value={value ? format(value, 'yyyy-MM-dd') : ''}
          onChange={handleChange}
          min={min ? format(min, 'yyyy-MM-dd') : undefined}
          max={max ? format(max, 'yyyy-MM-dd') : undefined}
          disabled={disabled}
          className={cn('w-full', className)}
        />
      );
    }

    // On desktop, render a regular input (parent component should use DatePicker)
    return (
      <Input
        ref={ref}
        type="text"
        value={value ? format(value, 'PPP') : ''}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className={cn('w-full cursor-pointer', className)}
      />
    );
  }
);

NativeDatePicker.displayName = 'NativeDatePicker';

interface NativeTimePickerProps {
  value: string | undefined;
  onChange: (time: string | undefined) => void;
  min?: string;
  max?: string;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Native time picker that uses the device's native time picker on mobile
 */
export const NativeTimePicker = forwardRef<HTMLInputElement, NativeTimePickerProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      step = 900, // 15 minutes in seconds
      placeholder = 'Select time',
      disabled,
      className,
    },
    ref
  ) => {
    const isTouch = useIsTouchDevice();

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const timeString = e.target.value;
        onChange(timeString || undefined);
      },
      [onChange]
    );

    // On touch devices, use native time input
    if (isTouch) {
      return (
        <Input
          ref={ref}
          type="time"
          value={value || ''}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn('w-full', className)}
        />
      );
    }

    // On desktop, render a regular input (parent component should use TimePicker)
    return (
      <Input
        ref={ref}
        type="text"
        value={value || ''}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className={cn('w-full cursor-pointer', className)}
      />
    );
  }
);

NativeTimePicker.displayName = 'NativeTimePicker';

interface NativeDateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  min?: Date;
  max?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Native datetime picker that uses the device's native datetime-local picker on mobile
 */
export const NativeDateTimePicker = forwardRef<HTMLInputElement, NativeDateTimePickerProps>(
  (
    { value, onChange, min, max, placeholder = 'Select date and time', disabled, className },
    ref
  ) => {
    const isTouch = useIsTouchDevice();

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateString = e.target.value;
        if (dateString) {
          const date = new Date(dateString);
          onChange(date);
        } else {
          onChange(undefined);
        }
      },
      [onChange]
    );

    const formatDateTimeLocal = (date: Date) => {
      return format(date, "yyyy-MM-dd'T'HH:mm");
    };

    // On touch devices, use native datetime-local input
    if (isTouch) {
      return (
        <Input
          ref={ref}
          type="datetime-local"
          value={value ? formatDateTimeLocal(value) : ''}
          onChange={handleChange}
          min={min ? formatDateTimeLocal(min) : undefined}
          max={max ? formatDateTimeLocal(max) : undefined}
          disabled={disabled}
          className={cn('w-full', className)}
        />
      );
    }

    // On desktop, render a regular input
    return (
      <Input
        ref={ref}
        type="text"
        value={value ? format(value, 'PPP p') : ''}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className={cn('w-full cursor-pointer', className)}
      />
    );
  }
);

NativeDateTimePicker.displayName = 'NativeDateTimePicker';
