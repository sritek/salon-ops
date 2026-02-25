'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Package, Truck, XCircle } from 'lucide-react';

import {
  useTransfer,
  useApproveTransfer,
  useRejectTransfer,
  useDispatchTransfer,
  useReceiveTransfer,
} from '@/hooks/queries/use-inventory';
import { useBranchContext } from '@/hooks/use-branch-context';
import { formatCurrency, formatDate } from '@/lib/format';

import { EmptyState, PageContainer, PageContent, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';

import type { TransferStatus, DispatchItemInput, ReceiveItemInput } from '@/types/inventory';
import { TRANSFER_STATUS_LABELS } from '@/types/inventory';

const statusVariants: Record<TransferStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    requested: 'secondary',
    approved: 'outline',
    rejected: 'destructive',
    in_transit: 'default',
    received: 'default',
    cancelled: 'destructive',
  };

const statusIcons: Record<TransferStatus, React.ReactNode> = {
  requested: <Clock className="mr-1 h-3 w-3" />,
  approved: <CheckCircle className="mr-1 h-3 w-3" />,
  rejected: <XCircle className="mr-1 h-3 w-3" />,
  in_transit: <Truck className="mr-1 h-3 w-3" />,
  received: <CheckCircle className="mr-1 h-3 w-3" />,
  cancelled: <XCircle className="mr-1 h-3 w-3" />,
};

export default function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { branchId } = useBranchContext();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [dispatchItems, setDispatchItems] = useState<DispatchItemInput[]>([]);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<ReceiveItemInput[]>([]);

  const { data: transfer, isLoading, error } = useTransfer(branchId || '', id);

  const approveMutation = useApproveTransfer();
  const rejectMutation = useRejectTransfer();
  const dispatchMutation = useDispatchTransfer();
  const receiveMutation = useReceiveTransfer();

  const isSourceBranch = transfer?.sourceBranchId === branchId;
  const isDestinationBranch = transfer?.destinationBranchId === branchId;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ branchId: branchId || '', id });
    } catch (err) {
      console.error('Failed to approve transfer:', err);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ branchId: branchId || '', id, reason: rejectReason });
      setRejectDialogOpen(false);
      setRejectReason('');
    } catch (err) {
      console.error('Failed to reject transfer:', err);
    }
  };

  const openDispatchDialog = () => {
    if (transfer?.items) {
      setDispatchItems(
        transfer.items.map((item) => ({
          productId: item.productId,
          dispatchedQuantity: item.requestedQuantity,
        }))
      );
    }
    setDispatchDialogOpen(true);
  };

  const handleDispatch = async () => {
    try {
      await dispatchMutation.mutateAsync({ branchId: branchId || '', id, items: dispatchItems });
      setDispatchDialogOpen(false);
    } catch (err) {
      console.error('Failed to dispatch transfer:', err);
    }
  };

  const openReceiveDialog = () => {
    if (transfer?.items) {
      setReceiveItems(
        transfer.items.map((item) => ({
          productId: item.productId,
          receivedQuantity: item.dispatchedQuantity,
        }))
      );
    }
    setReceiveDialogOpen(true);
  };

  const handleReceive = async () => {
    try {
      await receiveMutation.mutateAsync({ branchId: branchId || '', id, items: receiveItems });
      setReceiveDialogOpen(false);
    } catch (err) {
      console.error('Failed to receive transfer:', err);
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

  if (error || !transfer) {
    return (
      <PageContainer>
        <PageHeader title="Transfer Details" />
        <PageContent>
          <EmptyState
            icon={AlertCircle}
            title="Error loading transfer"
            description="The transfer could not be found or there was an error loading it."
            action={
              <Button variant="outline" onClick={() => router.push('/inventory/transfers')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Transfers
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    );
  }

  // Determine available actions based on status and branch
  const canApprove = isSourceBranch && transfer.status === 'requested';
  const canReject = isSourceBranch && transfer.status === 'requested';
  const canDispatch = isSourceBranch && transfer.status === 'approved';
  const canReceive = isDestinationBranch && transfer.status === 'in_transit';

  return (
    <PageContainer>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="font-mono">{transfer.transferNumber}</span>
            <Badge variant={statusVariants[transfer.status]}>
              {statusIcons[transfer.status]}
              {TRANSFER_STATUS_LABELS[transfer.status]}
            </Badge>
          </div>
        }
        description={`Requested on ${formatDate(new Date(transfer.requestDate))}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/transfers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            {canApprove && (
              <Button onClick={handleApprove} disabled={approveMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {canReject && (
              <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            )}
            {canDispatch && (
              <Button onClick={openDispatchDialog} disabled={dispatchMutation.isPending}>
                <Truck className="mr-2 h-4 w-4" />
                {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch'}
              </Button>
            )}
            {canReceive && (
              <Button onClick={openReceiveDialog} disabled={receiveMutation.isPending}>
                <Package className="mr-2 h-4 w-4" />
                {receiveMutation.isPending ? 'Receiving...' : 'Receive'}
              </Button>
            )}
          </div>
        }
      />

      <PageContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Source Branch */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Source Branch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Branch Name</p>
                <p className="font-medium">{transfer.sourceBranch?.name || '-'}</p>
              </div>
              {transfer.dispatchedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Dispatched At</p>
                  <p className="font-medium">{formatDate(new Date(transfer.dispatchedAt))}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Destination Branch */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Destination Branch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Branch Name</p>
                <p className="font-medium">{transfer.destinationBranch?.name || '-'}</p>
              </div>
              {transfer.receivedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Received At</p>
                  <p className="font-medium">{formatDate(new Date(transfer.receivedAt))}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rejection Reason */}
        {transfer.status === 'rejected' && transfer.rejectionReason && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Rejection Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{transfer.rejectionReason}</p>
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transfer Items</CardTitle>
            <CardDescription>
              {transfer.items?.length || 0} item(s) in this transfer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!transfer.items || transfer.items.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No items"
                description="This transfer has no items."
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Requested</TableHead>
                      <TableHead className="text-center">Dispatched</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-center">Discrepancy</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfer.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.requestedQuantity}</TableCell>
                        <TableCell className="text-center">
                          {item.dispatchedQuantity > 0 ? item.dispatchedQuantity : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.receivedQuantity > 0 ? item.receivedQuantity : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.discrepancy !== 0 ? (
                            <span
                              className={item.discrepancy < 0 ? 'text-red-600' : 'text-green-600'}
                            >
                              {item.discrepancy > 0 ? '+' : ''}
                              {item.discrepancy}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitCost)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Value</span>
              <span>{formatCurrency(transfer.totalValue)}</span>
            </div>
            {transfer.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p>{transfer.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transfer</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transfer request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dispatch Transfer</DialogTitle>
            <DialogDescription>
              Confirm the quantities being dispatched. Stock will be deducted from your branch.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Requested</TableHead>
                  <TableHead className="text-center w-[150px]">Dispatch Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items?.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-center">{item.requestedQuantity}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={item.requestedQuantity}
                        value={dispatchItems[index]?.dispatchedQuantity || 0}
                        onChange={(e) => {
                          const newItems = [...dispatchItems];
                          newItems[index] = {
                            ...newItems[index],
                            dispatchedQuantity: parseInt(e.target.value) || 0,
                          };
                          setDispatchItems(newItems);
                        }}
                        className="text-center"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDispatch} disabled={dispatchMutation.isPending}>
              {dispatchMutation.isPending ? 'Dispatching...' : 'Confirm Dispatch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receive Transfer</DialogTitle>
            <DialogDescription>
              Confirm the quantities received. Stock will be added to your branch.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Dispatched</TableHead>
                  <TableHead className="text-center w-[150px]">Received Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items?.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-center">{item.dispatchedQuantity}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={item.dispatchedQuantity}
                        value={receiveItems[index]?.receivedQuantity || 0}
                        onChange={(e) => {
                          const newItems = [...receiveItems];
                          newItems[index] = {
                            ...newItems[index],
                            receivedQuantity: parseInt(e.target.value) || 0,
                          };
                          setReceiveItems(newItems);
                        }}
                        className="text-center"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={receiveMutation.isPending}>
              {receiveMutation.isPending ? 'Receiving...' : 'Confirm Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
