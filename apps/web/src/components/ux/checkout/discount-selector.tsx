'use client';

/**
 * Discount Selector Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.4
 *
 * Displays available discounts (membership, package, coupon, loyalty)
 * with one-click apply for each discount.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Star,
  Package,
  Ticket,
  Percent,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvailableDiscount, AppliedDiscount } from '@/types/checkout';

// ============================================
// Props
// ============================================

interface DiscountSelectorProps {
  availableDiscounts: AvailableDiscount[];
  appliedDiscounts: AppliedDiscount[];
  onApplyDiscount: (discount: {
    discountType: 'membership' | 'package' | 'coupon' | 'loyalty' | 'manual';
    discountSource?: string;
    calculationType: 'percentage' | 'flat';
    calculationValue: number;
    appliedTo: 'subtotal' | 'item';
    appliedItemId?: string;
    reason?: string;
  }) => void;
  onRemoveDiscount: (discountId: string) => void;
  isApplying?: boolean;
  isRemoving?: boolean;
  subtotal: number;
  className?: string;
}

interface DiscountItemProps {
  discount: AvailableDiscount;
  onApply: () => void;
  isApplied: boolean;
  isApplying?: boolean;
}

interface AppliedDiscountItemProps {
  discount: AppliedDiscount;
  onRemove: () => void;
  isRemoving?: boolean;
}

// ============================================
// Helper Functions
// ============================================

function getDiscountIcon(type: string) {
  switch (type) {
    case 'membership':
      return Star;
    case 'package':
      return Package;
    case 'coupon':
      return Ticket;
    case 'loyalty':
      return Star;
    default:
      return Percent;
  }
}

function getDiscountColor(type: string) {
  switch (type) {
    case 'membership':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'package':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'coupon':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'loyalty':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
}

// ============================================
// Discount Item Component
// ============================================

function DiscountItem({ discount, onApply, isApplied, isApplying }: DiscountItemProps) {
  const Icon = getDiscountIcon(discount.type);
  const colorClass = getDiscountColor(discount.type);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isApplied
          ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
          : 'hover:bg-muted/50'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          colorClass
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{discount.name}</h4>
          <Badge variant="outline" className="text-xs capitalize">
            {discount.type}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{discount.description}</p>
      </div>

      {/* Apply Button */}
      <Button
        variant={isApplied ? 'secondary' : 'outline'}
        size="sm"
        onClick={onApply}
        disabled={isApplied || isApplying}
        className="flex-shrink-0"
      >
        {isApplying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isApplied ? (
          <>
            <Check className="h-4 w-4 mr-1" />
            Applied
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-1" />
            Apply
          </>
        )}
      </Button>
    </div>
  );
}

// ============================================
// Applied Discount Item Component
// ============================================

function AppliedDiscountItem({ discount, onRemove, isRemoving }: AppliedDiscountItemProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-950 rounded-md">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
          {discount.discountType}
        </Badge>
        <span className="text-sm truncate">{discount.sourceName}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-medium text-green-600">-₹{discount.amount.toFixed(2)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={isRemoving}
        >
          {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Manual Discount Dialog
// ============================================

interface ManualDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (discount: {
    calculationType: 'percentage' | 'flat';
    calculationValue: number;
    reason: string;
  }) => void;
  subtotal: number;
  isApplying?: boolean;
}

function ManualDiscountDialog({
  open,
  onOpenChange,
  onApply,
  subtotal,
  isApplying,
}: ManualDiscountDialogProps) {
  const [type, setType] = useState<'percentage' | 'flat'>('percentage');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  const handleApply = useCallback(() => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;
    if (!reason.trim()) return;

    onApply({
      calculationType: type,
      calculationValue: numValue,
      reason: reason.trim(),
    });

    // Reset form
    setValue('');
    setReason('');
    onOpenChange(false);
  }, [type, value, reason, onApply, onOpenChange]);

  const previewAmount = (() => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return 0;
    if (type === 'percentage') {
      return (subtotal * numValue) / 100;
    }
    return Math.min(numValue, subtotal);
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Manual Discount</DialogTitle>
          <DialogDescription>Apply a custom discount to this checkout.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Discount Type */}
          <div className="space-y-2">
            <Label>Discount Type</Label>
            <div className="flex gap-2">
              <Button
                variant={type === 'percentage' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setType('percentage')}
              >
                <Percent className="h-4 w-4 mr-1" />
                Percentage
              </Button>
              <Button
                variant={type === 'flat' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setType('flat')}
              >
                ₹ Flat Amount
              </Button>
            </div>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="discount-value">
              {type === 'percentage' ? 'Percentage' : 'Amount'}
            </Label>
            <div className="relative">
              {type === 'flat' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₹
                </span>
              )}
              <Input
                id="discount-value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                className={type === 'flat' ? 'pl-7' : ''}
                min="0"
                max={type === 'percentage' ? '100' : undefined}
                step="0.01"
              />
              {type === 'percentage' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="discount-reason">Reason (required)</Label>
            <Input
              id="discount-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer complaint, Manager approval"
            />
          </div>

          {/* Preview */}
          {previewAmount > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount Amount</span>
                <span className="font-medium text-green-600">-₹{previewAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!value || !reason.trim() || isApplying}>
            {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Component
// ============================================

export function DiscountSelector({
  availableDiscounts,
  appliedDiscounts,
  onApplyDiscount,
  onRemoveDiscount,
  isApplying,
  isRemoving,
  subtotal,
  className,
}: DiscountSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [applyingDiscountId, setApplyingDiscountId] = useState<string | null>(null);
  const [removingDiscountId, setRemovingDiscountId] = useState<string | null>(null);

  // Check if a discount is already applied
  const isDiscountApplied = useCallback(
    (discountId: string) => {
      return appliedDiscounts.some((d) => d.discountSource === discountId);
    },
    [appliedDiscounts]
  );

  // Handle apply discount
  const handleApplyDiscount = useCallback(
    (discount: AvailableDiscount) => {
      setApplyingDiscountId(discount.id);
      onApplyDiscount({
        discountType: discount.type,
        discountSource: discount.id,
        calculationType: discount.discountType,
        calculationValue: discount.value,
        appliedTo: 'subtotal',
        reason: discount.name,
      });
      // Reset after a short delay
      setTimeout(() => setApplyingDiscountId(null), 500);
    },
    [onApplyDiscount]
  );

  // Handle remove discount
  const handleRemoveDiscount = useCallback(
    (discountId: string) => {
      setRemovingDiscountId(discountId);
      onRemoveDiscount(discountId);
      setTimeout(() => setRemovingDiscountId(null), 500);
    },
    [onRemoveDiscount]
  );

  // Handle manual discount
  const handleManualDiscount = useCallback(
    (discount: {
      calculationType: 'percentage' | 'flat';
      calculationValue: number;
      reason: string;
    }) => {
      onApplyDiscount({
        discountType: 'manual',
        calculationType: discount.calculationType,
        calculationValue: discount.calculationValue,
        appliedTo: 'subtotal',
        reason: discount.reason,
      });
    },
    [onApplyDiscount]
  );

  // Group discounts by type
  const membershipDiscounts = availableDiscounts.filter((d) => d.type === 'membership');
  const packageDiscounts = availableDiscounts.filter((d) => d.type === 'package');
  const couponDiscounts = availableDiscounts.filter((d) => d.type === 'coupon');
  const loyaltyDiscounts = availableDiscounts.filter((d) => d.type === 'loyalty');

  const hasAvailableDiscounts = availableDiscounts.length > 0;
  const totalDiscount = appliedDiscounts.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Applied Discounts */}
      {appliedDiscounts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Applied Discounts</h4>
            <span className="text-sm font-medium text-green-600">-₹{totalDiscount.toFixed(2)}</span>
          </div>
          <div className="space-y-2">
            {appliedDiscounts.map((discount) => (
              <AppliedDiscountItem
                key={discount.id}
                discount={discount}
                onRemove={() => handleRemoveDiscount(discount.id)}
                isRemoving={removingDiscountId === discount.id || isRemoving}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Discounts */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="text-sm font-medium">
              Available Discounts
              {hasAvailableDiscounts && (
                <Badge variant="secondary" className="ml-2">
                  {availableDiscounts.length}
                </Badge>
              )}
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-3">
          {!hasAvailableDiscounts ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No discounts available for this checkout
            </p>
          ) : (
            <>
              {/* Membership Discounts */}
              {membershipDiscounts.length > 0 && (
                <div className="space-y-2">
                  {membershipDiscounts.map((discount) => (
                    <DiscountItem
                      key={discount.id}
                      discount={discount}
                      onApply={() => handleApplyDiscount(discount)}
                      isApplied={isDiscountApplied(discount.id)}
                      isApplying={applyingDiscountId === discount.id || isApplying}
                    />
                  ))}
                </div>
              )}

              {/* Package Discounts */}
              {packageDiscounts.length > 0 && (
                <div className="space-y-2">
                  {packageDiscounts.map((discount) => (
                    <DiscountItem
                      key={discount.id}
                      discount={discount}
                      onApply={() => handleApplyDiscount(discount)}
                      isApplied={isDiscountApplied(discount.id)}
                      isApplying={applyingDiscountId === discount.id || isApplying}
                    />
                  ))}
                </div>
              )}

              {/* Loyalty Discounts */}
              {loyaltyDiscounts.length > 0 && (
                <div className="space-y-2">
                  {loyaltyDiscounts.map((discount) => (
                    <DiscountItem
                      key={discount.id}
                      discount={discount}
                      onApply={() => handleApplyDiscount(discount)}
                      isApplied={isDiscountApplied(discount.id)}
                      isApplying={applyingDiscountId === discount.id || isApplying}
                    />
                  ))}
                </div>
              )}

              {/* Coupon Discounts */}
              {couponDiscounts.length > 0 && (
                <div className="space-y-2">
                  {couponDiscounts.map((discount) => (
                    <DiscountItem
                      key={discount.id}
                      discount={discount}
                      onApply={() => handleApplyDiscount(discount)}
                      isApplied={isDiscountApplied(discount.id)}
                      isApplying={applyingDiscountId === discount.id || isApplying}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Manual Discount Button */}
          <Button variant="outline" className="w-full" onClick={() => setShowManualDialog(true)}>
            <Percent className="h-4 w-4 mr-2" />
            Add Manual Discount
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Manual Discount Dialog */}
      <ManualDiscountDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        onApply={handleManualDiscount}
        subtotal={subtotal}
        isApplying={isApplying}
      />
    </div>
  );
}
