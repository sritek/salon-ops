/**
 * Staff Leaves Page
 *
 * Manage leave requests and approvals.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';

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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader, PageContent, EmptyState } from '@/components/common';
import { useLeaveList, useApproveLeave, useRejectLeave } from '@/hooks/queries/use-staff';
import { formatDate } from '@/lib/format';
import type { Leave, LeaveStatus, LeaveType } from '@/types/staff';

const LEAVE_STATUSES: LeaveStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];
const LEAVE_TYPES: LeaveType[] = [
  'casual',
  'sick',
  'earned',
  'unpaid',
  'maternity',
  'paternity',
  'comp_off',
];

export default function LeavesPage() {
  const t = useTranslations('staff.leaves');
  const tCommon = useTranslations('common');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, error } = useLeaveList({
    page,
    limit: 20,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    leaveType: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  const leaves = data?.data ?? [];
  const meta = data?.meta;

  const getStatusBadgeVariant = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLeave.mutateAsync({ id });
      toast.success('Leave approved successfully');
    } catch (error) {
      toast.error('Failed to approve leave');
    }
  };

  const handleReject = async () => {
    if (!selectedLeaveId || !rejectReason.trim()) return;

    try {
      await rejectLeave.mutateAsync({ id: selectedLeaveId, reason: rejectReason });
      toast.success('Leave rejected');
      setRejectDialogOpen(false);
      setSelectedLeaveId(null);
      setRejectReason('');
    } catch (error) {
      toast.error('Failed to reject leave');
    }
  };

  const openRejectDialog = (id: string) => {
    setSelectedLeaveId(id);
    setRejectDialogOpen(true);
  };

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {LEAVE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {LEAVE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={CalendarOff}
            title={tCommon('status.error')}
            description={error.message}
          />
        ) : leaves.length === 0 ? (
          <EmptyState icon={CalendarOff} title={t('noLeaves')} description={t('noLeavesDesc')} />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.staff')}</TableHead>
                    <TableHead>{t('table.type')}</TableHead>
                    <TableHead>{t('table.from')}</TableHead>
                    <TableHead>{t('table.to')}</TableHead>
                    <TableHead>{t('table.days')}</TableHead>
                    <TableHead>{t('table.reason')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave: Leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {leave.staffProfile?.user?.name ?? '-'}
                      </TableCell>
                      <TableCell>{t(`types.${leave.leaveType}`)}</TableCell>
                      <TableCell>{formatDate(leave.startDate)}</TableCell>
                      <TableCell>{formatDate(leave.endDate)}</TableCell>
                      <TableCell>
                        {leave.totalDays}
                        {leave.isHalfDay && (
                          <span className="ml-1 text-xs text-muted-foreground">(Half)</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={leave.reason}>
                        {leave.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(leave.status)}>
                          {t(`status.${leave.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {leave.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(leave.id)}
                              disabled={approveLeave.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRejectDialog(leave.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {tCommon('pagination.showing')} {(page - 1) * 20 + 1} {tCommon('pagination.to')}{' '}
                  {Math.min(page * 20, meta.total)} {tCommon('pagination.of')} {meta.total}{' '}
                  {tCommon('pagination.results')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {tCommon('actions.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= meta.totalPages}
                  >
                    {tCommon('actions.next')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Leave Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this leave request.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                {tCommon('actions.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectLeave.isPending}
              >
                {rejectLeave.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContent>
    </>
  );
}
