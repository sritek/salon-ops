'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileCheck,
  Save,
} from 'lucide-react';

import {
  useAudit,
  useUpdateAuditCount,
  useCompleteAudit,
  usePostAuditAdjustments,
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

import type { AuditStatus, StockAuditItem } from '@/types/inventory';
import { AUDIT_STATUS_LABELS, AUDIT_TYPE_LABELS } from '@/types/inventory';

const statusVariants: Record<AuditStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  in_progress: 'secondary',
  completed: 'outline',
  posted: 'default',
};

const statusIcons: Record<AuditStatus, React.ReactNode> = {
  in_progress: <Clock className="mr-1 h-3 w-3" />,
  completed: <CheckCircle className="mr-1 h-3 w-3" />,
  posted: <FileCheck className="mr-1 h-3 w-3" />,
};

export default function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { branchId } = useBranchContext();

  const [editingItem, setEditingItem] = useState<StockAuditItem | null>(null);
  const [physicalCount, setPhysicalCount] = useState<string>('');
  const [countNotes, setCountNotes] = useState<string>('');
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmPostOpen, setConfirmPostOpen] = useState(false);

  const { data: audit, isLoading, error } = useAudit(branchId || '', id);

  const updateCountMutation = useUpdateAuditCount();
  const completeMutation = useCompleteAudit();
  const postMutation = usePostAuditAdjustments();

  const handleOpenCountDialog = (item: StockAuditItem) => {
    setEditingItem(item);
    setPhysicalCount(item.physicalCount?.toString() || '');
    setCountNotes(item.notes || '');
  };

  const handleSaveCount = async () => {
    if (!editingItem) return;
    try {
      await updateCountMutation.mutateAsync({
        branchId: branchId || '',
        auditId: id,
        itemId: editingItem.id,
        data: {
          physicalCount: parseInt(physicalCount) || 0,
          notes: countNotes || null,
        },
      });
      setEditingItem(null);
      setPhysicalCount('');
      setCountNotes('');
    } catch (err) {
      console.error('Failed to update count:', err);
    }
  };

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync({ branchId: branchId || '', id });
      setConfirmCompleteOpen(false);
    } catch (err) {
      console.error('Failed to complete audit:', err);
    }
  };

  const handlePost = async () => {
    try {
      await postMutation.mutateAsync({ branchId: branchId || '', id });
      setConfirmPostOpen(false);
    } catch (err) {
      console.error('Failed to post adjustments:', err);
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

  if (error || !audit) {
    return (
      <PageContainer>
        <PageHeader title="Audit Details" />
        <PageContent>
          <EmptyState
            icon={AlertCircle}
            title="Error loading audit"
            description="The audit could not be found or there was an error loading it."
            action={
              <Button variant="outline" onClick={() => router.push('/inventory/audits')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Audits
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    );
  }

  const canCount = audit.status === 'in_progress';
  const canComplete = audit.status === 'in_progress';
  const canPost = audit.status === 'completed';

  // Calculate summary stats
  const totalItems = audit.items?.length || 0;
  const countedItems = audit.items?.filter((item) => item.physicalCount !== null).length || 0;
  const itemsWithVariance = audit.items?.filter((item) => item.variance !== 0).length || 0;

  return (
    <PageContainer>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="font-mono">{audit.auditNumber}</span>
            <Badge variant={statusVariants[audit.status]}>
              {statusIcons[audit.status]}
              {AUDIT_STATUS_LABELS[audit.status]}
            </Badge>
          </div>
        }
        description={`Started on ${formatDate(new Date(audit.startedAt))}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/audits">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            {canComplete && (
              <Button
                onClick={() => setConfirmCompleteOpen(true)}
                disabled={completeMutation.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {completeMutation.isPending ? 'Completing...' : 'Complete Audit'}
              </Button>
            )}
            {canPost && (
              <Button onClick={() => setConfirmPostOpen(true)} disabled={postMutation.isPending}>
                <FileCheck className="mr-2 h-4 w-4" />
                {postMutation.isPending ? 'Posting...' : 'Post Adjustments'}
              </Button>
            )}
          </div>
        }
      />

      <PageContent>
        {/* Audit Info */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Audit Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{AUDIT_TYPE_LABELS[audit.auditType]}</p>
              {audit.category && (
                <p className="text-sm text-muted-foreground mt-1">
                  Category: {audit.category.name}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {countedItems} / {totalItems}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Items counted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Shrinkage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-semibold ${audit.totalShrinkageValue > 0 ? 'text-red-600' : ''}`}
              >
                {formatCurrency(audit.totalShrinkageValue)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {itemsWithVariance} item(s) with variance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Audit Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audit Items</CardTitle>
            <CardDescription>
              {canCount
                ? 'Click on a row to enter the physical count'
                : 'Physical counts have been recorded'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!audit.items || audit.items.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No items"
                description="This audit has no items to count."
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">System Qty</TableHead>
                      <TableHead className="text-center">Physical Count</TableHead>
                      <TableHead className="text-center">Variance</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead>
                      <TableHead className="text-right">Variance Value</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.items.map((item) => (
                      <TableRow
                        key={item.id}
                        className={canCount ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={() => canCount && handleOpenCountDialog(item)}
                      >
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.systemQuantity}</TableCell>
                        <TableCell className="text-center">
                          {item.physicalCount !== null ? (
                            item.physicalCount
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.physicalCount !== null ? (
                            <span
                              className={
                                item.variance < 0
                                  ? 'text-red-600 font-medium'
                                  : item.variance > 0
                                    ? 'text-green-600 font-medium'
                                    : ''
                              }
                            >
                              {item.variance > 0 ? '+' : ''}
                              {item.variance}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.averageCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.physicalCount !== null ? (
                            <span
                              className={
                                item.varianceValue < 0
                                  ? 'text-red-600 font-medium'
                                  : item.varianceValue > 0
                                    ? 'text-green-600 font-medium'
                                    : ''
                              }
                            >
                              {formatCurrency(Math.abs(item.varianceValue))}
                              {item.varianceValue < 0
                                ? ' (loss)'
                                : item.varianceValue > 0
                                  ? ' (gain)'
                                  : ''}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {item.notes || '-'}
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
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Variance Value</span>
              <span
                className={`font-medium ${audit.totalVarianceValue < 0 ? 'text-red-600' : audit.totalVarianceValue > 0 ? 'text-green-600' : ''}`}
              >
                {formatCurrency(Math.abs(audit.totalVarianceValue))}
                {audit.totalVarianceValue < 0
                  ? ' (loss)'
                  : audit.totalVarianceValue > 0
                    ? ' (gain)'
                    : ''}
              </span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Shrinkage</span>
              <span className={audit.totalShrinkageValue > 0 ? 'text-red-600' : ''}>
                {formatCurrency(audit.totalShrinkageValue)}
              </span>
            </div>
            {audit.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p>{audit.notes}</p>
                </div>
              </>
            )}
            {audit.completedAt && (
              <>
                <Separator />
                <div className="text-sm text-muted-foreground">
                  Completed on {formatDate(new Date(audit.completedAt))}
                </div>
              </>
            )}
            {audit.postedAt && (
              <div className="text-sm text-muted-foreground">
                Adjustments posted on {formatDate(new Date(audit.postedAt))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* Count Entry Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Physical Count</DialogTitle>
            <DialogDescription>{editingItem?.productName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">System Quantity</Label>
                <p className="text-2xl font-semibold">{editingItem?.systemQuantity}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="physical-count">Physical Count</Label>
                <Input
                  id="physical-count"
                  type="number"
                  min={0}
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(e.target.value)}
                  placeholder="Enter count..."
                  autoFocus
                />
              </div>
            </div>
            {physicalCount !== '' && editingItem && (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variance</span>
                  <span
                    className={`font-medium ${
                      parseInt(physicalCount) - editingItem.systemQuantity < 0
                        ? 'text-red-600'
                        : parseInt(physicalCount) - editingItem.systemQuantity > 0
                          ? 'text-green-600'
                          : ''
                    }`}
                  >
                    {parseInt(physicalCount) - editingItem.systemQuantity > 0 ? '+' : ''}
                    {parseInt(physicalCount) - editingItem.systemQuantity}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Variance Value</span>
                  <span
                    className={`font-medium ${
                      (parseInt(physicalCount) - editingItem.systemQuantity) *
                        editingItem.averageCost <
                      0
                        ? 'text-red-600'
                        : (parseInt(physicalCount) - editingItem.systemQuantity) *
                              editingItem.averageCost >
                            0
                          ? 'text-green-600'
                          : ''
                    }`}
                  >
                    {formatCurrency(
                      Math.abs(
                        (parseInt(physicalCount) - editingItem.systemQuantity) *
                          editingItem.averageCost
                      )
                    )}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="count-notes">Notes (optional)</Label>
              <Textarea
                id="count-notes"
                value={countNotes}
                onChange={(e) => setCountNotes(e.target.value)}
                placeholder="Add any notes about this count..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCount}
              disabled={physicalCount === '' || updateCountMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateCountMutation.isPending ? 'Saving...' : 'Save Count'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Confirmation Dialog */}
      <Dialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Audit</DialogTitle>
            <DialogDescription>
              Are you sure you want to complete this audit? You will not be able to modify counts
              after completion.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-md space-y-2">
              <div className="flex justify-between">
                <span>Items Counted</span>
                <span className="font-medium">
                  {countedItems} / {totalItems}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Items with Variance</span>
                <span className="font-medium">{itemsWithVariance}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Shrinkage</span>
                <span
                  className={`font-medium ${audit.totalShrinkageValue > 0 ? 'text-red-600' : ''}`}
                >
                  {formatCurrency(audit.totalShrinkageValue)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCompleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={completeMutation.isPending}>
              {completeMutation.isPending ? 'Completing...' : 'Complete Audit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Adjustments Confirmation Dialog */}
      <Dialog open={confirmPostOpen} onOpenChange={setConfirmPostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Adjustments</DialogTitle>
            <DialogDescription>
              This will create stock adjustments for all variances. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-md space-y-2">
              <div className="flex justify-between">
                <span>Items with Variance</span>
                <span className="font-medium">{itemsWithVariance}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Shrinkage</span>
                <span className={audit.totalShrinkageValue > 0 ? 'text-red-600' : ''}>
                  {formatCurrency(audit.totalShrinkageValue)}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Stock levels will be adjusted to match the physical counts recorded during this audit.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPostOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePost} disabled={postMutation.isPending}>
              {postMutation.isPending ? 'Posting...' : 'Post Adjustments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
