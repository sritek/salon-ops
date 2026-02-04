/**
 * CurrencyInput - Indian Rupee input with formatting
 */

'use client';

import { forwardRef, type ChangeEvent } from 'react';
import { IndianRupee } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    { value, onChange, placeholder = '0', disabled, min, max, className },
    ref
  ) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9.]/g, '');
      
      if (rawValue === '') {
        onChange(undefined);
        return;
      }

      const numValue = parseFloat(rawValue);
      
      if (isNaN(numValue)) {
        return;
      }

      if (min !== undefined && numValue < min) {
        onChange(min);
        return;
      }

      if (max !== undefined && numValue > max) {
        onChange(max);
        return;
      }

      onChange(numValue);
    };

    // Format value for display
    const displayValue = value !== undefined
      ? new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(value)
      : '';

    return (
      <div className={cn('relative', className)}>
        <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9"
        />
      </div>
    );
  }
);
