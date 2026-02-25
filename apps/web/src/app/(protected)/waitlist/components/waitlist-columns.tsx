'use client';

import { format } from 'date-fns';
import { Calendar, Clock, MoreHorizontal, Phone, Trash2, UserPlus } from 'lucide-react';

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
import type { WaitlistEntry, TimePeriod } from '@/types/waitlist';

// ============================================
// Helper Functions
// ============================================

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'converted':
      return 'secondary';
    case 'expired':
      return 'outline';
    case 'removed':
      return 'destructive';
    default:
      return 'outline';
  }
}

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  canWrite: boolean;
  onCreateAppointment: (entry: WaitlistEntry) => void;
  onDelete: (id: string) => void;
}

export function getWaitlistColumns({
  canWrite,
  onCreateAppointment,
  onDelete,
}: GetColumnsOptions): ColumnDef<WaitlistEntry>[] {
  return [
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{entry.customerName}</span>
            {entry.customer?.email && (
              <span className="text-sm text-muted-foreground">{entry.customer.email}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'customerPhone',
      header: 'Phone',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-sm">{row.original.customerPhone || '-'}</span>
        </div>
      ),
    },
    {
      id: 'preferredDates',
      header: 'Preferred Dates',
      cell: ({ row }) => {
        const entry = row.original;
        const startDate = format(new Date(entry.preferredStartDate), 'MMM d');
        const endDate = format(new Date(entry.preferredEndDate), 'MMM d');
        return (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">
              {startDate === endDate ? startDate : `${startDate} - ${endDate}`}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'timePreferences',
      header: 'Time Pref',
      cell: ({ row }) => {
        const prefs = row.original.timePreferences;
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{prefs.map((p) => TIME_PERIOD_LABELS[p]).join(', ')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'serviceIds',
      header: 'Services',
      cell: ({ row }) => {
        const count = row.original.serviceIds.length;
        return (
          <Badge variant="outline" className="text-xs">
            {count} service{count !== 1 ? 's' : ''}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={getStatusVariant(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <WaitlistActions
          entry={row.original}
          canWrite={canWrite}
          onCreateAppointment={onCreateAppointment}
          onDelete={onDelete}
        />
      ),
    },
  ];
}

// ============================================
// Actions Component
// ============================================

interface WaitlistActionsProps {
  entry: WaitlistEntry;
  canWrite: boolean;
  onCreateAppointment: (entry: WaitlistEntry) => void;
  onDelete: (id: string) => void;
}

function WaitlistActions({ entry, canWrite, onCreateAppointment, onDelete }: WaitlistActionsProps) {
  const isActive = entry.status === 'active';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canWrite && isActive && (
          <>
            <DropdownMenuItem onClick={() => onCreateAppointment(entry)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Appointment
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {canWrite && isActive && (
          <DropdownMenuItem onClick={() => onDelete(entry.id)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </DropdownMenuItem>
        )}
        {!isActive && (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">No actions available</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
