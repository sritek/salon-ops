'use client';

/**
 * Branch Columns
 * Column definitions for branches DataTable
 */

import { Edit } from 'lucide-react';
import type { ColumnDef } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Branch } from '@/hooks/queries/use-branches';

interface GetColumnsOptions {
  canEdit: boolean;
  onEdit: (branch: Branch) => void;
}

export function getBranchColumns({ canEdit, onEdit }: GetColumnsOptions): ColumnDef<Branch>[] {
  const columns: ColumnDef<Branch>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-muted-foreground">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'city',
      header: 'Location',
      cell: ({ row }) => (
        <span>
          {row.original.city || '-'}
          {row.original.state && `, ${row.original.state}`}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '-',
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || '-',
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
  ];

  if (canEdit) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
          <Edit className="h-4 w-4" />
        </Button>
      ),
    });
  }

  return columns;
}
