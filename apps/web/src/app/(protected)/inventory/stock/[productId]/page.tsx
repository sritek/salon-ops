'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Package,
} from 'lucide-react';

import {
  useStockBatches,
  useProduct,
  useConsumeStock,
  useAdjustStock,
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

import type { ConsumptionReason, AdjustmentType } from '@/types/inventory';
import { CONSUMPTION_REASON_LABELS, ADJUSTMENT_TYPE_LABELS } from '@/types/inventory';

export default function StockDetailPage({ params }: { params: { productId: string } }) {
  const { productId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { branchId: contextBranchId } = useBranchContext();
  const branchId = contextBranchId || '';

  const [consumeDialogOpen, setConsumeDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  // Form state for consume
  const [consumeQuantity, setConsumeQuantity] = useState('');
  const [consumeReason, setConsumeReason] = useState<ConsumptionReason>('sample');
  const [consumeDescription, setConsumeDescription] = useState('');

  // Form state for adjust
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustType, setAdjustType] = useState<AdjustmentType>('increase');
  const [adjustReason, setAdjustReason] = useState('');

  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { data: batches, isLoading: batchesLoading, error } = useStockBatches(branchId, productId);

  const consumeMutation = useConsumeStock();
  const adjustMutation = useAdjustStock();

  // Open dialog based on URL param
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'consume') {
      setConsumeDialogOpen(true);
    } else if (action === 'adjust') {
      setAdjustDialogOpen(true);
    }
  }, [searchParams]);

  const handleConsume = async () => {
    const qty = parseFloat(consumeQuantity);
    if (isNaN(qty) || qty <= 0) return;

    try {
      await consumeMutation.mutateAsync({
        branchId,
        data: {
          productId,
          quantity: qty,
          reason: consumeReason,
          description: consumeReason === 'other' ? consumeDescription : undefined,
        },
      });
      setConsumeDialogOpen(false);
      setConsumeQuantity('');
      setConsumeReason('sample');
      setConsumeDescription('');
      router.replace(`/inventory/stock/${productId}`);
    } catch (err) {
      console.error('Failed to consume stock:', err);
    }
  };

  const handleAdjust = async () => {
    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty) || qty <= 0 || !adjustReason.trim()) return;

    try {
      await adjustMutation.mutateAsync({
        branchId,
        data: {
          productId,
          adjustmentType: adjustType,
          quantity: qty,
          reason: adjustReason,
        },
      });
      setAdjustDialogOpen(false);
      setAdjustQuantity('');
      setAdjustType('increase');
      setAdjustReason('');
      router.replace(`/inventory/stock/${productId}`);
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    }
  };

  const isLoading = productLoading || batchesLoading;

  // Calculate totals
  const totalQuantity = batches?.reduce((sum, b) => sum + b.quantity, 0) || 0;
  const availableQuantity = batches?.reduce((sum, b) => sum + b.availableQuantity, 0) || 0;
  const totalValue = batches?.reduce((sum, b) => sum + b.totalValue, 0) || 0;

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title={<Skeleton className="h-8 w-48" />}
          description={<Skeleton className="h-4 w-64" />}
        />
        <PageContent>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  if (error || !product) {
    return (
      <PageContainer>
        <PageHeader title="Stock Detail" />
        <PageContent>
          <EmptyState
            icon={AlertCircle}
            title="Error loading stock"
            description="The product could not be found or there was an error loading stock data."
            action={
              <Button variant="outline" onClick={() => router.push('/inventory/stock')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Stock
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={product.name}
        description={product.sku ? `SKU: ${product.sku}` : product.categoryName}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/stock">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setConsumeDialogOpen(true)}>
              <ArrowDownRight className="mr-2 h-4 w-4" />
              Consume
            </Button>
            <Button onClick={() => setAdjustDialogOpen(true)}>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Adjust
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Quantity</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalQuantity}</p>
              <p className="text-xs text-muted-foreground">{product.unitOfMeasure}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{availableQuantity}</p>
              <p className="text-xs text-muted-foreground">{product.unitOfMeasure}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Value</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Batches</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{batches?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Active batches</p>
            </CardContent>
          </Card>
        </div>

        {/* Batches Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock Batches (FIFO Order)</CardTitle>
            <CardDescription>
              Batches are consumed in First-In-First-Out order (oldest first)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!batches || batches.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No batches"
                description="No stock batches found for this product."
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Receipt Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-center">Available</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch, index) => (
                      <TableRow key={batch.id} className={batch.isDepleted ? 'opacity-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {index === 0 && !batch.isDepleted && !batch.isExpired && (
                              <Badge variant="outline" className="text-xs">
                                Next
                              </Badge>
                            )}
                            <span className="font-mono text-sm">
                              {batch.batchNumber || `#${index + 1}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(new Date(batch.receiptDate))}</TableCell>
                        <TableCell>
                          {batch.expiryDate ? (
                            <span
                              className={
                                batch.isExpired
                                  ? 'text-red-600'
                                  : new Date(batch.expiryDate) <
                                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                    ? 'text-yellow-600'
                                    : ''
                              }
                            >
                              {formatDate(new Date(batch.expiryDate))}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-center">{batch.quantity}</TableCell>
                        <TableCell className="text-center">{batch.availableQuantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(batch.unitCost)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(batch.totalValue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {batch.isDepleted && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Depleted
                              </Badge>
                            )}
                            {batch.isExpired && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Expired
                              </Badge>
                            )}
                            {!batch.isDepleted &&
                              !batch.isExpired &&
                              batch.expiryDate &&
                              new Date(batch.expiryDate) <
                                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                                <Badge variant="secondary" className="text-xs">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  Near Expiry
                                </Badge>
                              )}
                            {!batch.isDepleted && !batch.isExpired && (
                              <Badge variant="outline" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* Consume Dialog */}
      <Dialog open={consumeDialogOpen} onOpenChange={setConsumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consume Stock</DialogTitle>
            <DialogDescription>
              Manually consume stock for {product.name}. Stock will be deducted using FIFO.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="consume-quantity">Quantity ({product.unitOfMeasure})</Label>
              <Input
                id="consume-quantity"
                type="number"
                min="0"
                step="0.01"
                value={consumeQuantity}
                onChange={(e) => setConsumeQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consume-reason">Reason</Label>
              <Select
                value={consumeReason}
                onValueChange={(v) => setConsumeReason(v as ConsumptionReason)}
              >
                <SelectTrigger id="consume-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONSUMPTION_REASON_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {consumeReason === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="consume-description">Description</Label>
                <Textarea
                  id="consume-description"
                  value={consumeDescription}
                  onChange={(e) => setConsumeDescription(e.target.value)}
                  placeholder="Describe the reason for consumption"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsumeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConsume}
              disabled={
                consumeMutation.isPending ||
                !consumeQuantity ||
                parseFloat(consumeQuantity) <= 0 ||
                (consumeReason === 'other' && !consumeDescription.trim())
              }
            >
              {consumeMutation.isPending ? 'Consuming...' : 'Consume'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Manually adjust stock for {product.name}. Increases create a new batch, decreases use
              FIFO.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adjust-type">Adjustment Type</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as AdjustmentType)}>
                <SelectTrigger id="adjust-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ADJUSTMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-quantity">Quantity ({product.unitOfMeasure})</Label>
              <Input
                id="adjust-quantity"
                type="number"
                min="0"
                step="0.01"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">Reason</Label>
              <Textarea
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Describe the reason for adjustment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={
                adjustMutation.isPending ||
                !adjustQuantity ||
                parseFloat(adjustQuantity) <= 0 ||
                !adjustReason.trim()
              }
            >
              {adjustMutation.isPending ? 'Adjusting...' : 'Adjust'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
