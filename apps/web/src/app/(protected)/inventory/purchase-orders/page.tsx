'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, FileText, Plus, Send, XCircle } from 'lucide-react';

import {
  usePurchaseOrders,
  useVendors,
  useSendPurchaseOrder,
  useCancelPurchaseOrder,
} from '@/hooks/queries/use-inventory';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatDate } from '@/lib/format';

import {
  ActionMenu,
  ConfirmDialog,
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
  SearchInput,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';

import type { POFilters, POStatus } from '@/types/inventory';

const statusLabels: Record<POStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_received: 'Partially Received',
  fully_received: 'Fully Received',
  cancelled: 'Cancelled',
};

const statusVariants: Record<POStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  sent: 'default',
  partially_received: 'outline',
  fully_received: 'default',
  cancelled: 'destructive',
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const branchId = user?.branchIds?.[0] || '';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingPOId, setCancellingPOId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [sendPOId, setSendPOId] = useState<string | null>(null);
  const limit = 20;

  const filters: POFilters = {
    page,
    limit,
    search: search || undefined,
    status: statusFilter !== 'all' ? (statusFilter as POStatus) : undefined,
    vendorId: vendorFilter !== 'all' ? vendorFilter : undefined,
    sortBy: 'orderDate',
    sortOrder: 'desc',
  };

  const { data: poData, isLoading, error } = usePurchaseOrders(branchId, filters);
  const { data: vendorsData } = useVendors({ limit: 100, isActive: true });
  const sendPO = useSendPurchaseOrder();
  const cancelPO = useCancelPurchaseOrder();

  const handleSend = (id: string) => {
    setSendPOId(id);
  };

  const confirmSend = async () => {
    if (sendPOId) {
      await sendPO.mutateAsync({ branchId, id: sendPOId });
      setSendPOId(null);
    }
  };

  const handleOpenCancelDialog = (id: string) => {
    setCancellingPOId(id);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const handleCancel = async () => {
    if (cancellingPOId && cancelReason.trim()) {
      await cancelPO.mutateAsync({ branchId, id: cancellingPOId, reason: cancelReason });
      setCancelDialogOpen(false);
      setCancellingPOId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Purchase Orders"
        description="Manage purchase orders for inventory replenishment"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/reorder">Reorder Suggestions</Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/purchase-orders/new">
                <Plus className="mr-2 h-4 w-4" />
                New Purchase Order
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
            placeholder="Search by PO number..."
            className="flex-1 max-w-sm"
          />

          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partially_received">Partially Received</SelectItem>
                <SelectItem value="fully_received">Fully Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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

        {/* Purchase Orders Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Error loading purchase orders"
            description="There was an error loading the purchase orders. Please try again."
          />
        ) : !poData?.data || poData.data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No purchase orders"
            description={
              search || statusFilter !== 'all' || vendorFilter !== 'all'
                ? 'No purchase orders match your filters.'
                : 'Create your first purchase order to get started.'
            }
            action={
              !search && statusFilter === 'all' && vendorFilter === 'all' ? (
                <Button asChild>
                  <Link href="/inventory/purchase-orders/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Purchase Order
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
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poData.data.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{po.poNumber}</span>
                      </TableCell>
                      <TableCell>{po.vendor?.name || '-'}</TableCell>
                      <TableCell>{formatDate(new Date(po.orderDate))}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(po.grandTotal)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[po.status]}>{statusLabels[po.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Details',
                              icon: Eye,
                              onClick: () => router.push(`/inventory/purchase-orders/${po.id}`),
                            },
                            ...(po.status === 'draft'
                              ? [
                                  {
                                    label: 'Edit',
                                    icon: FileText,
                                    onClick: () =>
                                      router.push(`/inventory/purchase-orders/${po.id}/edit`),
                                  },
                                  {
                                    label: 'Send to Vendor',
                                    icon: Send,
                                    onClick: () => handleSend(po.id),
                                  },
                                  {
                                    label: 'Cancel',
                                    icon: XCircle,
                                    onClick: () => handleOpenCancelDialog(po.id),
                                    variant: 'destructive' as const,
                                    separator: true,
                                  },
                                ]
                              : []),
                            ...(po.status === 'sent'
                              ? [
                                  {
                                    label: 'Create GRN',
                                    icon: Plus,
                                    onClick: () =>
                                      router.push(`/inventory/goods-receipts/new?poId=${po.id}`),
                                  },
                                  {
                                    label: 'Cancel',
                                    icon: XCircle,
                                    onClick: () => handleOpenCancelDialog(po.id),
                                    variant: 'destructive' as const,
                                    separator: true,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {poData.meta && poData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, poData.meta.total)} of{' '}
                  {poData.meta.total} orders
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
                    disabled={page >= poData.meta.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </PageContent>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this purchase order.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cancelReason">Cancellation Reason *</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || cancelPO.isPending}
            >
              {cancelPO.isPending ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send PO Confirmation Dialog */}
      <ConfirmDialog
        open={!!sendPOId}
        onOpenChange={(open) => !open && setSendPOId(null)}
        title="Send Purchase Order"
        description="Are you sure you want to send this purchase order to the vendor?"
        confirmText="Send"
        onConfirm={confirmSend}
        isLoading={sendPO.isPending}
      />
    </PageContainer>
  );
}
