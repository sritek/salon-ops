'use client';

/**
 * Attention Items Component
 * Displays items that need immediate attention
 * Requirements: 4.5, 4.6
 */

import { memo, useCallback } from 'react';
import {
  AlertTriangle,
  Clock,
  CreditCard,
  Users,
  Package,
  FileText,
  X,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AttentionItem } from '@/types/dashboard';

interface AttentionItemsProps {
  items: AttentionItem[];
  isLoading?: boolean;
  onItemClick?: (item: AttentionItem) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

const TYPE_CONFIG: Record<
  AttentionItem['type'],
  { icon: typeof AlertTriangle; color: string; label: string }
> = {
  late_arrival: {
    icon: Clock,
    color: 'text-red-500',
    label: 'Late Arrival',
  },
  pending_checkout: {
    icon: CreditCard,
    color: 'text-orange-500',
    label: 'Pending Checkout',
  },
  walk_in_waiting: {
    icon: Users,
    color: 'text-purple-500',
    label: 'Walk-in Waiting',
  },
  low_stock: {
    icon: Package,
    color: 'text-yellow-500',
    label: 'Low Stock',
  },
  pending_approval: {
    icon: FileText,
    color: 'text-blue-500',
    label: 'Pending Approval',
  },
  no_show_risk: {
    icon: AlertTriangle,
    color: 'text-red-500',
    label: 'No-Show Risk',
  },
};

const PRIORITY_STYLES: Record<AttentionItem['priority'], string> = {
  high: 'border-l-red-500 bg-red-50 dark:bg-red-950/20',
  medium: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20',
  low: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
};

function AttentionItemsComponent({
  items,
  isLoading,
  onItemClick,
  onDismiss,
  className,
}: AttentionItemsProps) {
  const handleItemClick = useCallback(
    (item: AttentionItem) => {
      if (onItemClick) {
        onItemClick(item);
      }
    },
    [onItemClick]
  );

  const handleDismiss = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (onDismiss) {
        onDismiss(id);
      }
    },
    [onDismiss]
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <h3 className="text-lg font-semibold">Needs Attention</h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <AttentionItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Group by priority
  const highPriority = items.filter((i) => i.priority === 'high');
  const mediumPriority = items.filter((i) => i.priority === 'medium');
  const lowPriority = items.filter((i) => i.priority === 'low');

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Needs Attention</h3>
        {items.length > 0 && (
          <Badge variant={highPriority.length > 0 ? 'destructive' : 'secondary'}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Badge>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>All clear! No items need attention.</p>
        </div>
      ) : (
        <ScrollArea className="h-[250px]">
          <div className="space-y-2 pr-4">
            {/* High priority first */}
            {highPriority.map((item) => (
              <AttentionItemRow
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
                onDismiss={(e) => handleDismiss(e, item.id)}
              />
            ))}

            {/* Medium priority */}
            {mediumPriority.map((item) => (
              <AttentionItemRow
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
                onDismiss={(e) => handleDismiss(e, item.id)}
              />
            ))}

            {/* Low priority */}
            {lowPriority.map((item) => (
              <AttentionItemRow
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
                onDismiss={(e) => handleDismiss(e, item.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface AttentionItemRowProps {
  item: AttentionItem;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}

function AttentionItemRow({ item, onClick, onDismiss }: AttentionItemRowProps) {
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-l-4 cursor-pointer transition-colors hover:bg-muted/50',
        PRIORITY_STYLES[item.priority]
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Icon */}
      <div className={cn('shrink-0', config.color)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.title}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {config.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss} title="Dismiss">
          <X className="h-4 w-4" />
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function AttentionItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-l-4 border-l-gray-300">
      <Skeleton className="h-5 w-5 rounded" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  );
}

export const AttentionItems = memo(AttentionItemsComponent);
