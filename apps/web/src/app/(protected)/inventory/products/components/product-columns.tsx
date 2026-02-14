'use client';

import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
import type { Product, ProductType } from '@/types/inventory';

// ============================================
// Helper Functions
// ============================================

const productTypeLabels: Record<ProductType, string> = {
  consumable: 'Consumable',
  retail: 'Retail',
  both: 'Both',
};

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  onView: (id: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export function getProductColumns({
  onView,
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<Product>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Product',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-sm text-muted-foreground">
            {row.original.sku || row.original.barcode || '-'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ row }) => <span className="text-sm">{row.original.categoryName || '-'}</span>,
    },
    {
      accessorKey: 'productType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">{productTypeLabels[row.original.productType]}</Badge>
      ),
    },
    {
      accessorKey: 'defaultPurchasePrice',
      header: () => <div className="text-right">Purchase Price</div>,
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.defaultPurchasePrice)}</div>
      ),
    },
    {
      accessorKey: 'defaultSellingPrice',
      header: () => <div className="text-right">Selling Price</div>,
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.defaultSellingPrice)}</div>
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
        <ProductActions
          product={row.original}
          onView={onView}
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

interface ProductActionsProps {
  product: Product;
  onView: (id: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

function ProductActions({ product, onView, onEdit, onDelete }: ProductActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(product.id)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(product)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
