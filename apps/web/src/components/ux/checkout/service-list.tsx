'use client';

/**
 * Service List Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.3
 *
 * Displays checkout line items with quantity adjustment and removal.
 */

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Minus, User, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CheckoutLineItem } from '@/types/checkout';

// ============================================
// Props
// ============================================

interface ServiceListProps {
  items: CheckoutLineItem[];
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  isLoading?: boolean;
  className?: string;
}

interface ServiceListItemProps {
  item: CheckoutLineItem;
  onRemove: () => void;
  onUpdateQuantity?: (quantity: number) => void;
  isLoading?: boolean;
}

// ============================================
// Service List Item Component
// ============================================

function ServiceListItem({ item, onRemove, onUpdateQuantity, isLoading }: ServiceListItemProps) {
  const handleIncrement = useCallback(() => {
    onUpdateQuantity?.(item.quantity + 1);
  }, [item.quantity, onUpdateQuantity]);

  const handleDecrement = useCallback(() => {
    if (item.quantity > 1) {
      onUpdateQuantity?.(item.quantity - 1);
    }
  }, [item.quantity, onUpdateQuantity]);

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      {/* Item Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          item.itemType === 'service' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
        )}
      >
        {item.itemType === 'service' ? (
          <User className="h-5 w-5" />
        ) : (
          <Receipt className="h-5 w-5" />
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-sm truncate">{item.name}</h4>
            {item.variantName && (
              <p className="text-xs text-muted-foreground">{item.variantName}</p>
            )}
            {item.stylistName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                with {item.stylistName}
                {item.assistantName && ` + ${item.assistantName}`}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {item.itemType}
          </Badge>
        </div>

        {/* Price and Quantity Row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {/* Quantity Controls */}
            {onUpdateQuantity ? (
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleDecrement}
                  disabled={item.quantity <= 1 || isLoading}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleIncrement}
                  disabled={isLoading}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
            )}

            <span className="text-xs text-muted-foreground">× ₹{item.unitPrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Item Total */}
            <div className="text-right">
              <p className="font-medium text-sm">₹{item.netAmount.toFixed(2)}</p>
              {item.discountAmount > 0 && (
                <p className="text-xs text-green-600">-₹{item.discountAmount.toFixed(2)}</p>
              )}
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tax Info */}
        {item.taxRate > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Includes {item.taxRate}% GST (₹{item.totalTax.toFixed(2)})
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Empty State Component
// ============================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Receipt className="h-6 w-6 text-muted-foreground" />
      </div>
      <h4 className="font-medium text-sm">No items added</h4>
      <p className="text-xs text-muted-foreground mt-1">
        Add services or products to begin checkout
      </p>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ServiceList({
  items,
  onRemoveItem,
  onUpdateQuantity,
  isLoading,
  className,
}: ServiceListProps) {
  const handleRemove = useCallback(
    (itemId: string) => {
      onRemoveItem(itemId);
    },
    [onRemoveItem]
  );

  const handleUpdateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      onUpdateQuantity?.(itemId, quantity);
    },
    [onUpdateQuantity]
  );

  if (items.length === 0) {
    return (
      <div className={cn('rounded-lg border', className)}>
        <EmptyState />
      </div>
    );
  }

  // Group items by type
  const services = items.filter((item) => item.itemType === 'service');
  const products = items.filter((item) => item.itemType === 'product');
  const others = items.filter((item) => item.itemType !== 'service' && item.itemType !== 'product');

  return (
    <div className={cn('rounded-lg border divide-y', className)}>
      {/* Services Section */}
      {services.length > 0 && (
        <div className="p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Services ({services.length})
          </h3>
          <div className="divide-y">
            {services.map((item) => (
              <ServiceListItem
                key={item.id}
                item={item}
                onRemove={() => handleRemove(item.id)}
                onUpdateQuantity={
                  onUpdateQuantity ? (qty) => handleUpdateQuantity(item.id, qty) : undefined
                }
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Products Section */}
      {products.length > 0 && (
        <div className="p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Products ({products.length})
          </h3>
          <div className="divide-y">
            {products.map((item) => (
              <ServiceListItem
                key={item.id}
                item={item}
                onRemove={() => handleRemove(item.id)}
                onUpdateQuantity={
                  onUpdateQuantity ? (qty) => handleUpdateQuantity(item.id, qty) : undefined
                }
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Items Section */}
      {others.length > 0 && (
        <div className="p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Other ({others.length})
          </h3>
          <div className="divide-y">
            {others.map((item) => (
              <ServiceListItem
                key={item.id}
                item={item}
                onRemove={() => handleRemove(item.id)}
                onUpdateQuantity={
                  onUpdateQuantity ? (qty) => handleUpdateQuantity(item.id, qty) : undefined
                }
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
