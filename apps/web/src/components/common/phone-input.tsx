/**
 * PhoneInput - Indian phone number input with validation
 */

'use client';

import { forwardRef, type ChangeEvent } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showCountryCode?: boolean;
  className?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput(
    {
      value,
      onChange,
      placeholder = '98765 43210',
      disabled,
      showCountryCode = false,
      className,
    },
    ref
  ) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      // Remove all non-digits
      const rawValue = e.target.value.replace(/\D/g, '');
      
      // Limit to 10 digits
      const limitedValue = rawValue.slice(0, 10);
      
      onChange(limitedValue);
    };

    // Format value for display (XXXXX XXXXX)
    const formatDisplay = (val: string): string => {
      if (!val) return '';
      if (val.length <= 5) return val;
      return `${val.slice(0, 5)} ${val.slice(5)}`;
    };

    // Validate Indian mobile number (starts with 6, 7, 8, or 9)
    const isValid = value.length === 0 || (value.length === 10 && /^[6-9]/.test(value));
    const displayValue = formatDisplay(value);

    return (
      <div className={cn('relative flex', className)}>
        {showCountryCode && (
          <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
            +91
          </span>
        )}
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            showCountryCode && 'rounded-l-none',
            !isValid && value.length > 0 && 'border-red-500 focus-visible:ring-red-500'
          )}
        />
      </div>
    );
  }
);
