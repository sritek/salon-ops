'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Eye,
  MoreHorizontal,
} from 'lucide-react';

import { formatCurrency } from '@/lib/format';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { ColumnDef } from '@/components/common';
import type { StockSummary } from '@/types/inventory';

// ============================================
// Column Definitions
// ============================================

export function getStockColumns(): ColumnDef<StockSummary>[] {
  return [
    {
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.productName}</p>
          {row.original.productSku && (
            <p className="text-xs text-muted-foreground font-mono">{row.original.productSku}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.categoryName}</span>,
    },
    {
      accessorKey: 'quantityOnHand',
      header: () => <div className="text-center">On Hand</div>,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.quantityOnHand} {row.original.unitOfMeasure}
        </div>
      ),
    },
    {
      accessorKey: 'availableQuantity',
      header: () => <div className="text-center">Available</div>,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.availableQuantity} {row.original.unitOfMeasure}
        </div>
      ),
    },
    {
      accessorKey: 'reorderLevel',
      header: () => <div className="text-center">Reorder Level</div>,
      cell: ({ row }) => <div className="text-center">{row.original.reorderLevel ?? '-'}</div>,
    },
    {
      accessorKey: 'averageCost',
      header: () => <div className="text-right">Avg Cost</div>,
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.averageCost)}</div>
      ),
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
      cell: ({ row }) => <StockStatusBadges stock={row.original} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => <StockActions stock={row.original} />,
    },
  ];
}

// ============================================
// Helper Components
// ============================================

function StockStatusBadges({ stock }: { stock: StockSummary }) {
  return (
    <div className="flex flex-wrap gap-1">
      {stock.isLowStock && (
        <Badge variant="destructive" className="text-xs">
          <ArrowDownRight className="mr-1 h-3 w-3" />
          Low
        </Badge>
      )}
      {stock.hasNearExpiry && (
        <Badge variant="secondary" className="text-xs">
          <Calendar className="mr-1 h-3 w-3" />
          Near Expiry
        </Badge>
      )}
      {stock.hasExpired && (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Expired
        </Badge>
      )}
      {!stock.isLowStock && !stock.hasNearExpiry && !stock.hasExpired && (
        <Badge variant="outline" className="text-xs">
          OK
        </Badge>
      )}
    </div>
  );
}

function StockActions({ stock }: { stock: StockSummary }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/inventory/stock/${stock.productId}`}>
            <Eye className="mr-2 h-4 w-4" />
            View Batches
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/inventory/stock/${stock.productId}?action=consume`}>
            <ArrowDownRight className="mr-2 h-4 w-4" />
            Consume Stock
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/inventory/stock/${stock.productId}?action=adjust`}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Adjust Stock
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
