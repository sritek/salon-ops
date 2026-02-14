'use client';

import { CheckCircle, Clock, Eye, MoreHorizontal, Truck, XCircle } from 'lucide-react';

import { formatCurrency, formatDate } from '@/lib/format';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { ColumnDef } from '@/components/common';
import type { StockTransfer, TransferStatus } from '@/types/inventory';
import { TRANSFER_STATUS_LABELS } from '@/types/inventory';

// ============================================
// Helper Functions
// ============================================

const statusVariants: Record<TransferStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    requested: 'secondary',
    approved: 'outline',
    rejected: 'destructive',
    in_transit: 'default',
    received: 'default',
    cancelled: 'destructive',
  };

const statusIcons: Record<TransferStatus, React.ReactNode> = {
  requested: <Clock className="mr-1 h-3 w-3" />,
  approved: <CheckCircle className="mr-1 h-3 w-3" />,
  rejected: <XCircle className="mr-1 h-3 w-3" />,
  in_transit: <Truck className="mr-1 h-3 w-3" />,
  received: <CheckCircle className="mr-1 h-3 w-3" />,
  cancelled: <XCircle className="mr-1 h-3 w-3" />,
};

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  activeTab: 'outgoing' | 'incoming';
  onView: (id: string) => void;
}

export function getTransferColumns({
  activeTab,
  onView,
}: GetColumnsOptions): ColumnDef<StockTransfer>[] {
  return [
    {
      accessorKey: 'transferNumber',
      header: 'Transfer Number',
      cell: ({ row }) => (
        <span className="font-mono font-medium">{row.original.transferNumber}</span>
      ),
    },
    {
      accessorKey: 'branch',
      header: activeTab === 'outgoing' ? 'Destination' : 'Source',
      cell: ({ row }) =>
        activeTab === 'outgoing'
          ? row.original.destinationBranch?.name || '-'
          : row.original.sourceBranch?.name || '-',
    },
    {
      accessorKey: 'requestDate',
      header: 'Request Date',
      cell: ({ row }) => formatDate(new Date(row.original.requestDate)),
    },
    {
      accessorKey: 'items',
      header: () => <div className="text-center">Items</div>,
      cell: ({ row }) => <div className="text-center">{row.original.items?.length || 0}</div>,
    },
    {
      accessorKey: 'totalValue',
      header: () => <div className="text-right">Total Value</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatCurrency(row.original.totalValue)}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusVariants[row.original.status]}>
          {statusIcons[row.original.status]}
          {TRANSFER_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(row.original.id)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
