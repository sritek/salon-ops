'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Eye, FileText, Plus } from 'lucide-react';

import { useGoodsReceipts, useVendors } from '@/hooks/queries/use-inventory';
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

import type { GRNFilters, GRNStatus } from '@/types/inventory';

const statusLabels: Record<GRNStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
};

const statusVariants: Record<GRNStatus, 'default' | 'secondary'> = {
  draft: 'secondary',
  confirmed: 'default',
};

export default function GoodsReceiptsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const branchId = user?.branchIds?.[0] || '';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters: GRNFilters = {
    page,
    limit,
    search: search || undefined,
    status: statusFilter !== 'all' ? (statusFilter as GRNStatus) : undefined,
    vendorId: vendorFilter !== 'all' ? vendorFilter : undefined,
    sortBy: 'receiptDate',
    sortOrder: 'desc',
  };

  const { data: grnData, isLoading, error } = useGoodsReceipts(branchId, filters);
  const { data: vendorsData } = useVendors({ limit: 100, isActive: true });

  return (
    <PageContainer>
      <PageHeader
        title="Goods Receipts"
        description="Manage goods receipt notes for inventory intake"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/purchase-orders">Purchase Orders</Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/goods-receipts/new">
                <Plus className="mr-2 h-4 w-4" />
                New Receipt
              </Link>
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by GRN number..."
            className="flex-1 max-w-sm"
          />

          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendorsData?.data.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Goods Receipts Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Error loading goods receipts"
            description="There was an error loading the goods receipts. Please try again."
          />
        ) : !grnData?.data || grnData.data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No goods receipts"
            description={
              search || statusFilter !== 'all' || vendorFilter !== 'all'
                ? 'No goods receipts match your filters.'
                : 'Create your first goods receipt to record inventory intake.'
            }
            action={
              !search && statusFilter === 'all' && vendorFilter === 'all' ? (
                <Button asChild>
                  <Link href="/inventory/goods-receipts/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Receipt
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
                    <TableHead>GRN Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>PO Reference</TableHead>
                    <TableHead>Receipt Date</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grnData.data.map((grn) => (
                    <TableRow key={grn.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{grn.grnNumber}</span>
                      </TableCell>
                      <TableCell>{grn.vendor?.name || '-'}</TableCell>
                      <TableCell>
                        {grn.purchaseOrder ? (
                          <Link
                            href={`/inventory/purchase-orders/${grn.purchaseOrderId}`}
                            className="text-primary hover:underline font-mono"
                          >
                            {grn.purchaseOrder.poNumber}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Standalone</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(new Date(grn.receiptDate))}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(grn.grandTotal)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[grn.status]}>
                          {grn.status === 'confirmed' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {statusLabels[grn.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Details',
                              icon: Eye,
                              onClick: () => router.push(`/inventory/goods-receipts/${grn.id}`),
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
            {grnData.meta && grnData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, grnData.meta.total)}{' '}
                  of {grnData.meta.total} receipts
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
                    disabled={page >= grnData.meta.totalPages}
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
