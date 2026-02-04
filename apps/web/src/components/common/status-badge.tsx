/**
 * StatusBadge - Consistent status indicator across the app
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusType =
  // Appointment statuses
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'in_progress'
  | 'scheduled'
  // Payment statuses
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'refunded'
  // General statuses
  | 'active'
  | 'inactive'
  | 'draft'
  | 'published';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'default';
  showDot?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<StatusType, { label: string; variant: string; dotColor: string }> = {
  // Appointment statuses
  confirmed: { label: 'Confirmed', variant: 'bg-green-100 text-green-800 hover:bg-green-100', dotColor: 'bg-green-500' },
  pending: { label: 'Pending', variant: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', dotColor: 'bg-yellow-500' },
  cancelled: { label: 'Cancelled', variant: 'bg-red-100 text-red-800 hover:bg-red-100', dotColor: 'bg-red-500' },
  completed: { label: 'Completed', variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100', dotColor: 'bg-blue-500' },
  no_show: { label: 'No Show', variant: 'bg-gray-100 text-gray-800 hover:bg-gray-100', dotColor: 'bg-gray-500' },
  in_progress: { label: 'In Progress', variant: 'bg-purple-100 text-purple-800 hover:bg-purple-100', dotColor: 'bg-purple-500' },
  scheduled: { label: 'Scheduled', variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100', dotColor: 'bg-blue-500' },
  
  // Payment statuses
  paid: { label: 'Paid', variant: 'bg-green-100 text-green-800 hover:bg-green-100', dotColor: 'bg-green-500' },
  partial: { label: 'Partial', variant: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', dotColor: 'bg-yellow-500' },
  unpaid: { label: 'Unpaid', variant: 'bg-red-100 text-red-800 hover:bg-red-100', dotColor: 'bg-red-500' },
  refunded: { label: 'Refunded', variant: 'bg-gray-100 text-gray-800 hover:bg-gray-100', dotColor: 'bg-gray-500' },
  
  // General statuses
  active: { label: 'Active', variant: 'bg-green-100 text-green-800 hover:bg-green-100', dotColor: 'bg-green-500' },
  inactive: { label: 'Inactive', variant: 'bg-gray-100 text-gray-800 hover:bg-gray-100', dotColor: 'bg-gray-500' },
  draft: { label: 'Draft', variant: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', dotColor: 'bg-yellow-500' },
  published: { label: 'Published', variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100', dotColor: 'bg-blue-500' },
};

export function StatusBadge({ status, size = 'default', showDot = false, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return (
    <Badge
      variant="outline"
      className={cn(
        config.variant,
        size === 'sm' && 'text-xs px-2 py-0',
        'border-transparent font-medium',
        className
      )}
    >
      {showDot && (
        <span className={cn('w-2 h-2 rounded-full mr-1.5', config.dotColor)} />
      )}
      {config.label}
    </Badge>
  );
}
