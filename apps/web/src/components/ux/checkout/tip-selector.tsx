'use client';

/**
 * Tip Selector Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.9
 *
 * Preset tip percentages (10%, 15%, 20%) with custom tip amount option.
 * Adds tip to checkout total.
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface TipSelectorProps {
  subtotal: number;
  currentTip: number;
  onTipChange: (amount: number) => void;
  className?: string;
}

// ============================================
// Preset Percentages
// ============================================

const TIP_PRESETS = [
  { percent: 10, label: '10%' },
  { percent: 15, label: '15%' },
  { percent: 20, label: '20%' },
];

// ============================================
// Main Component
// ============================================

export function TipSelector({ subtotal, currentTip, onTipChange, className }: TipSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  // Calculate preset amounts
  const presetAmounts = useMemo(
    () =>
      TIP_PRESETS.map((preset) => ({
        ...preset,
        amount: Math.round((subtotal * preset.percent) / 100),
      })),
    [subtotal]
  );

  // Check which preset is selected
  const selectedPreset = useMemo(() => {
    if (currentTip === 0) return null;
    const found = presetAmounts.find((p) => Math.abs(p.amount - currentTip) < 0.01);
    return found?.percent || null;
  }, [currentTip, presetAmounts]);

  // Handle preset selection
  const handlePresetClick = useCallback(
    (amount: number) => {
      if (Math.abs(currentTip - amount) < 0.01) {
        // Deselect if already selected
        onTipChange(0);
      } else {
        onTipChange(amount);
        setIsCustom(false);
        setCustomAmount('');
      }
    },
    [currentTip, onTipChange]
  );

  // Handle custom tip
  const handleCustomClick = useCallback(() => {
    setIsCustom(true);
    setCustomAmount(currentTip > 0 ? currentTip.toString() : '');
  }, [currentTip]);

  // Handle custom amount change
  const handleCustomAmountChange = useCallback(
    (value: string) => {
      setCustomAmount(value);
      const amount = parseFloat(value);
      if (!isNaN(amount) && amount >= 0) {
        onTipChange(amount);
      } else if (value === '') {
        onTipChange(0);
      }
    },
    [onTipChange]
  );

  // Handle remove tip
  const handleRemoveTip = useCallback(() => {
    onTipChange(0);
    setIsCustom(false);
    setCustomAmount('');
  }, [onTipChange]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-pink-500" />
          <Label className="font-medium">Add a Tip</Label>
        </div>
        {currentTip > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleRemoveTip}
          >
            <X className="h-3 w-3 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="flex gap-2">
        {presetAmounts.map(({ percent, label, amount }) => (
          <Button
            key={percent}
            variant={selectedPreset === percent && !isCustom ? 'default' : 'outline'}
            className={cn(
              'flex-1 flex-col h-auto py-2 gap-0.5',
              selectedPreset === percent && !isCustom && 'ring-2 ring-primary'
            )}
            onClick={() => handlePresetClick(amount)}
          >
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">₹{amount}</span>
          </Button>
        ))}
        <Button
          variant={isCustom ? 'default' : 'outline'}
          className={cn('flex-1 flex-col h-auto py-2 gap-0.5', isCustom && 'ring-2 ring-primary')}
          onClick={handleCustomClick}
        >
          <span className="text-sm font-medium">Custom</span>
          <span className="text-xs text-muted-foreground">
            {isCustom && currentTip > 0 ? `₹${currentTip}` : '₹...'}
          </span>
        </Button>
      </div>

      {/* Custom Amount Input */}
      {isCustom && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ₹
            </span>
            <Input
              type="number"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              placeholder="Enter tip amount"
              className="pl-7"
              min="0"
              step="1"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Tip Summary */}
      {currentTip > 0 && (
        <div className="flex items-center justify-between p-2 bg-pink-50 dark:bg-pink-950 rounded-md text-pink-700 dark:text-pink-300">
          <span className="text-sm">Tip amount</span>
          <span className="font-medium">₹{currentTip.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
