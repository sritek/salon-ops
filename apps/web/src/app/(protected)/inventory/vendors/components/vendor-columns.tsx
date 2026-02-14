'use client';

import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { formatDate } from '@/lib/format';

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
import type { Vendor } from '@/types/inventory';

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  onViewProducts: (id: string) => void;
  onEdit: (vendor: Vendor) => void;
  onDelete: (id: string) => void;
}

export function getVendorColumns({
  onViewProducts,
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<Vendor>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Vendor',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-sm text-muted-foreground">{row.original.contactPerson}</span>
        </div>
      ),
    },
    {
      accessorKey: 'contact',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="flex flex-col text-sm">
          <span>{row.original.phone}</span>
          {row.original.email && (
            <span className="text-muted-foreground">{row.original.email}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-sm">
          {[row.original.city, row.original.state].filter(Boolean).join(', ') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'gstin',
      header: 'GSTIN',
      cell: ({ row }) => <span className="text-sm font-mono">{row.original.gstin || '-'}</span>,
    },
    {
      accessorKey: 'lastPurchaseDate',
      header: 'Last Purchase',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.lastPurchaseDate
            ? formatDate(new Date(row.original.lastPurchaseDate))
            : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <VendorActions
          vendor={row.original}
          onViewProducts={onViewProducts}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    },
  ];
}

// ============================================
// Actions Component
// ============================================

interface VendorActionsProps {
  vendor: Vendor;
  onViewProducts: (id: string) => void;
  onEdit: (vendor: Vendor) => void;
  onDelete: (id: string) => void;
}

function VendorActions({ vendor, onViewProducts, onEdit, onDelete }: VendorActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewProducts(vendor.id)}>
          <Eye className="mr-2 h-4 w-4" />
          View Products
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(vendor)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(vendor.id)} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
