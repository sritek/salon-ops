'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, ClipboardList, Clock, Eye, Plus } from 'lucide-react';

import { useAudits } from '@/hooks/queries/use-inventory';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatDate } from '@/lib/format';

import {
  ActionMenu,
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
  SearchInput,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { AuditFilters, AuditStatus, AuditType } from '@/types/inventory';
import { AUDIT_STATUS_LABELS, AUDIT_TYPE_LABELS } from '@/types/inventory';

const statusVariants: Record<AuditStatus, 'default' | 'secondary' | 'outline'> = {
  in_progress: 'secondary',
  completed: 'outline',
  posted: 'default',
};

const statusIcons: Record<AuditStatus, React.ReactNode> = {
  in_progress: <Clock className="mr-1 h-3 w-3" />,
  completed: <CheckCircle className="mr-1 h-3 w-3" />,
  posted: <CheckCircle className="mr-1 h-3 w-3" />,
};

export default function AuditsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const branchId = user?.branchIds?.[0] || '';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters: AuditFilters = {
    page,
    limit,
    status: statusFilter !== 'all' ? (statusFilter as AuditStatus) : undefined,
    auditType: typeFilter !== 'all' ? (typeFilter as AuditType) : undefined,
    sortBy: 'startedAt',
    sortOrder: 'desc',
  };

  const { data: auditsData, isLoading, error } = useAudits(branchId, filters);

  return (
    <PageContainer>
      <PageHeader
        title="Stock Audits"
        description="Manage physical stock counts and variance reconciliation"
        actions={
          <Button asChild>
            <Link href="/inventory/audits/new">
              <Plus className="mr-2 h-4 w-4" />
              New Audit
            </Link>
          </Button>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by audit number..."
            className="flex-1 max-w-sm"
          />

          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(AUDIT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(AUDIT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audits Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Error loading audits"
            description="There was an error loading the audits. Please try again."
          />
        ) : !auditsData?.data || auditsData.data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No audits"
            description={
              statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No audits match your filters.'
                : 'Create your first stock audit to reconcile physical inventory.'
            }
            action={
              statusFilter === 'all' && typeFilter === 'all' ? (
                <Button asChild>
                  <Link href="/inventory/audits/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Audit
                  </Link>
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
                    <TableHead>Audit Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Variance Value</TableHead>
                    <TableHead className="text-right">Shrinkage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditsData.data.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{audit.auditNumber}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{AUDIT_TYPE_LABELS[audit.auditType]}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(new Date(audit.startedAt))}</TableCell>
                      <TableCell className="text-center">{audit.items?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            audit.totalVarianceValue < 0
                              ? 'text-red-600'
                              : audit.totalVarianceValue > 0
                                ? 'text-green-600'
                                : ''
                          }
                        >
                          {formatCurrency(Math.abs(audit.totalVarianceValue))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {audit.totalShrinkageValue > 0 ? (
                          <span className="text-red-600">
                            {formatCurrency(audit.totalShrinkageValue)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[audit.status]}>
                          {statusIcons[audit.status]}
                          {AUDIT_STATUS_LABELS[audit.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ActionMenu
                          items={[
                            {
                              label:
                                audit.status === 'in_progress'
                                  ? 'Continue Counting'
                                  : 'View Details',
                              icon: Eye,
                              onClick: () => router.push(`/inventory/audits/${audit.id}`),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {auditsData.meta && auditsData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to{' '}
                  {Math.min(page * limit, auditsData.meta.total)} of {auditsData.meta.total} audits
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= auditsData.meta.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </PageContent>
    </PageContainer>
  );
}
