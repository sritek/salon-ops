/**
 * Customer Memberships List Page
 * Displays all customer memberships with filtering and actions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plus, Crown, Calendar, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PageHeader,
  PageContent,
  EmptyState,
  LoadingSpinner,
  SearchInput,
  StatusBadge,
} from '@/components/common';
import { useCustomerMemberships } from '@/hooks/queries/use-memberships';
import { formatCurrency } from '@/lib/format';
import type { MembershipStatus, CustomerMembershipFilters } from '@/types/memberships';
import { MEMBERSHIP_STATUS_LABELS } from '@/types/memberships';

export default function CustomerMembershipsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MembershipStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const filters: CustomerMembershipFilters = {
    page,
    limit: 20,
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    sortBy: 'purchaseDate',
    sortOrder: 'desc',
  };

  const { data, isLoading, error } = useCustomerMemberships(filters);

  const memberships = data?.data ?? [];
  const meta = data?.meta;

  if (error) {
    return (
      <PageContent>
        <EmptyState
          icon={Crown}
          title="Error loading memberships"
          description="There was a problem loading memberships. Please try again."
        />
      </PageContent>
    );
  }

  return (
    <>
      <PageHeader
        title="Customer Memberships"
        description="Manage customer memberships and benefits"
        actions={
          <Button onClick={() => router.push('/memberships/sell')}>
            <Plus className="mr-2 h-4 w-4" />
            Sell Membership
          </Button>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by membership number, customer..."
            className="flex-1"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as MembershipStatus | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(MEMBERSHIP_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : memberships.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="No memberships found"
            description={
              search || status !== 'all'
                ? 'Try adjusting your filters.'
                : 'Sell your first membership to get started.'
            }
            action={
              !search && status === 'all' ? (
                <Button onClick={() => router.push('/memberships/sell')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Sell Membership
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membership #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((membership) => (
                    <TableRow
                      key={membership.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/memberships/${membership.id}`)}
                    >
                      <TableCell className="font-medium">{membership.membershipNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{membership.customer?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {membership.customer?.phone}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          {membership.plan?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(membership.purchaseDate), 'dd MMM yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(membership.currentExpiryDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{formatCurrency(membership.totalPaid)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={membership.status}
                          label={MEMBERSHIP_STATUS_LABELS[membership.status]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, meta.total)} of {meta.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page === meta.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </PageContent>
    </>
  );
}
