'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Package, XCircle } from 'lucide-react';

import { useGoodsReceipt, useConfirmGoodsReceipt } from '@/hooks/queries/use-inventory';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatDate } from '@/lib/format';

import { EmptyState, PageContainer, PageContent, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import type { GRNStatus, QualityCheckStatus } from '@/types/inventory';

const statusLabels: Record<GRNStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
};

const statusVariants: Record<GRNStatus, 'default' | 'secondary'> = {
  draft: 'secondary',
  confirmed: 'default',
};

const qualityStatusLabels: Record<QualityCheckStatus, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  partial: 'Partial',
};

const qualityStatusVariants: Record<QualityCheckStatus, 'default' | 'secondary' | 'destructive'> = {
  accepted: 'default',
  rejected: 'destructive',
  partial: 'secondary',
};

export default function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const branchId = user?.branchIds?.[0] || '';

  const { data: grn, isLoading, error } = useGoodsReceipt(branchId, id);
  const confirmMutation = useConfirmGoodsReceipt();

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync({ branchId, id });
    } catch (err) {
      console.error('Failed to confirm GRN:', err);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title={<Skeleton className="h-8 w-48" />}
          description={<Skeleton className="h-4 w-64" />}
        />
        <PageContent>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  if (error || !grn) {
    return (
      <PageContainer>
        <PageHeader title="Goods Receipt" />
        <PageContent>
          <EmptyState
            icon={AlertCircle}
            title="Error loading goods receipt"
            description="The goods receipt could not be found or there was an error loading it."
            action={
              <Button variant="outline" onClick={() => router.push('/inventory/goods-receipts')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Goods Receipts
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    );
  }

  const isDraft = grn.status === 'draft';

  return (
    <PageContainer>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="font-mono">{grn.grnNumber}</span>
            <Badge variant={statusVariants[grn.status]}>
              {grn.status === 'confirmed' && <CheckCircle className="mr-1 h-3 w-3" />}
              {grn.status === 'draft' && <Clock className="mr-1 h-3 w-3" />}
              {statusLabels[grn.status]}
            </Badge>
          </div>
        }
        description={`Receipt Date: ${formatDate(new Date(grn.receiptDate))}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/goods-receipts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            {isDraft && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={confirmMutation.isPending}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {confirmMutation.isPending ? 'Confirming...' : 'Confirm Receipt'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Goods Receipt?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will create stock batches for all accepted items and update the purchase
                      order quantities. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      <PageContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Vendor Name</p>
                <p className="font-medium">{grn.vendor?.name || '-'}</p>
              </div>
              {grn.vendor?.contactPerson && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{grn.vendor.contactPerson}</p>
                </div>
              )}
              {grn.vendor?.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{grn.vendor.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receipt Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Receipt Date</p>
                <p className="font-medium">{formatDate(new Date(grn.receiptDate))}</p>
              </div>
              {grn.purchaseOrder && (
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Order</p>
                  <Link
                    href={`/inventory/purchase-orders/${grn.purchaseOrderId}`}
                    className="font-mono font-medium text-primary hover:underline"
                  >
                    {grn.purchaseOrder.poNumber}
                  </Link>
                </div>
              )}
              {grn.confirmedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed At</p>
                  <p className="font-medium">{formatDate(new Date(grn.confirmedAt))}</p>
                </div>
              )}
              {grn.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{grn.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Line Items</CardTitle>
            <CardDescription>{grn.items?.length || 0} item(s) in this receipt</CardDescription>
          </CardHeader>
          <CardContent>
            {!grn.items || grn.items.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No items"
                description="This goods receipt has no items."
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-center">FOC</TableHead>
                      <TableHead className="text-center">Quality Check</TableHead>
                      <TableHead className="text-center">Accepted</TableHead>
                      <TableHead className="text-center">Rejected</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grn.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {item.batchNumber && (
                              <p className="text-xs text-muted-foreground">
                                Batch: {item.batchNumber}
                              </p>
                            )}
                            {item.expiryDate && (
                              <p className="text-xs text-muted-foreground">
                                Expires: {formatDate(new Date(item.expiryDate))}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.receivedQuantity}</TableCell>
                        <TableCell className="text-center">
                          {item.focQuantity > 0 ? item.focQuantity : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={qualityStatusVariants[item.qualityCheckStatus]}>
                            {item.qualityCheckStatus === 'accepted' && (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            )}
                            {item.qualityCheckStatus === 'rejected' && (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {qualityStatusLabels[item.qualityCheckStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-green-600">
                          {item.acceptedQuantity}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.rejectedQuantity > 0 ? (
                            <div>
                              <span className="text-red-600">{item.rejectedQuantity}</span>
                              {item.rejectionReason && (
                                <p className="text-xs text-muted-foreground">
                                  {item.rejectionReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitCost)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(grn.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(grn.taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Grand Total</span>
                <span>{formatCurrency(grn.grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContent>
    </PageContainer>
  );
}
