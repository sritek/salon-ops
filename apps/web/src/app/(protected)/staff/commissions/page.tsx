/**
 * Commission Tracking Page
 *
 * Displays commission records with filtering and bulk approval.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, subDays } from 'date-fns';
import { DollarSign, Download, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent, EmptyState } from '@/components/common';
import { useCommissionList, useApproveCommissions, useStaffList } from '@/hooks/queries/use-staff';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Commission, CommissionStatus } from '@/types/staff';

const COMMISSION_STATUSES: CommissionStatus[] = ['pending', 'approved', 'paid', 'cancelled'];

export default function CommissionsPage() {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');

  const [page, setPage] = useState(1);
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: staffData } = useStaffList({ limit: 100, isActive: true });
  const { data, isLoading, error } = useCommissionList({
    page,
    limit: 20,
    userId: staffFilter !== 'all' ? staffFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    startDate,
    endDate,
  });
  const approveCommissions = useApproveCommissions();

  const commissions = data?.data ?? [];
  const meta = data?.meta;
  const staffList = staffData?.data ?? [];

  // Calculate summary
  const summary = {
    pending: commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
    approved: commissions
      .filter((c) => c.status === 'approved')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
    paid: commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
  };

  const pendingCommissions = commissions.filter((c) => c.status === 'pending');
  const allPendingSelected =
    pendingCommissions.length > 0 && pendingCommissions.every((c) => selectedIds.includes(c.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(pendingCommissions.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await approveCommissions.mutateAsync(selectedIds);
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to approve commissions:', error);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Staff', 'Service', 'Amount', 'Commission', 'Status'];
    const rows = commissions.map((c) => [
      formatDate(c.commissionDate),
      c.staffProfile?.user?.name ?? '',
      c.serviceName,
      c.serviceAmount,
      c.commissionAmount,
      c.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadgeVariant = (status: CommissionStatus) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'paid':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <PageHeader
        title={t('commissions.title')}
        description={t('commissions.description')}
        actions={
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button onClick={handleBulkApprove} disabled={approveCommissions.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('commissions.approveSelected', { count: selectedIds.length })}
              </Button>
            )}
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              {t('commissions.exportCSV')}
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('commissions.summary.pending')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(summary.pending)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('commissions.summary.approved')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.approved)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('commissions.summary.paid')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.paid)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('commissions.filters.allStaff')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('commissions.filters.allStaff')}</SelectItem>
              {staffList.map((staff) => (
                <SelectItem key={staff.userId} value={staff.userId}>
                  {staff.user?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('commissions.filters.allStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('commissions.filters.allStatus')}</SelectItem>
              {COMMISSION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`commissions.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[150px]"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[150px]"
          />
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
            icon={DollarSign}
            title={tCommon('status.error')}
            description={error.message}
          />
        ) : commissions.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title={t('commissions.noCommissions')}
            description={t('commissions.noCommissionsDescription')}
          />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={allPendingSelected}
                        onCheckedChange={handleSelectAll}
                        disabled={pendingCommissions.length === 0}
                      />
                    </TableHead>
                    <TableHead>{t('commissions.table.date')}</TableHead>
                    <TableHead>{t('commissions.table.staff')}</TableHead>
                    <TableHead>{t('commissions.table.service')}</TableHead>
                    <TableHead className="text-right">
                      {t('commissions.table.serviceAmount')}
                    </TableHead>
                    <TableHead>{t('commissions.table.rate')}</TableHead>
                    <TableHead className="text-right">
                      {t('commissions.table.commission')}
                    </TableHead>
                    <TableHead>{t('commissions.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission: Commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(commission.id)}
                          onCheckedChange={(checked) =>
                            handleSelect(commission.id, checked as boolean)
                          }
                          disabled={commission.status !== 'pending'}
                        />
                      </TableCell>
                      <TableCell>{formatDate(commission.commissionDate)}</TableCell>
                      <TableCell className="font-medium">
                        {commission.staffProfile?.user?.name ?? '-'}
                      </TableCell>
                      <TableCell>{commission.serviceName}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(commission.serviceAmount)}
                      </TableCell>
                      <TableCell>
                        {commission.commissionType === 'percentage'
                          ? `${commission.commissionRate}%`
                          : formatCurrency(commission.commissionRate)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(commission.commissionAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(commission.status)}>
                          {t(`commissions.status.${commission.status}`)}
                        </Badge>
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
      </PageContent>
    </>
  );
}
