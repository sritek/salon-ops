'use client';

/**
 * User Columns
 * Column definitions for users DataTable
 */

import { Edit, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/hooks/queries/use-users';

interface GetColumnsOptions {
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

const roleLabels: Record<string, string> = {
  super_owner: 'Super Owner',
  regional_manager: 'Regional Manager',
  branch_manager: 'Branch Manager',
  receptionist: 'Receptionist',
  stylist: 'Stylist',
  accountant: 'Accountant',
};

export function getUserColumns({ onEdit, onDelete }: GetColumnsOptions): ColumnDef<User>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-muted-foreground">{row.original.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || '-',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline">{roleLabels[row.original.role] || row.original.role}</Badge>
      ),
    },
    {
      accessorKey: 'branchAssignments',
      header: 'Branches',
      cell: ({ row }) => {
        const assignments = row.original.branchAssignments;
        if (!assignments || assignments.length === 0) return '-';

        const primary = assignments.find((a) => a.isPrimary);
        const others = assignments.filter((a) => !a.isPrimary);

        return (
          <div className="text-sm">
            <span className="font-medium">
              {primary?.branch.name || assignments[0].branch.name}
            </span>
            {others.length > 0 && (
              <span className="text-muted-foreground"> +{others.length} more</span>
            )}
          </div>
        );
      },
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
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          {row.original.role !== 'super_owner' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.original.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];
}
