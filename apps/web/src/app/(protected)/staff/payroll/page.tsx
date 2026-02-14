/**
 * Staff Payroll Page
 *
 * Generate and manage monthly payroll.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format, subMonths } from 'date-fns';
import { Wallet, Plus, Play, Check, CreditCard, Eye } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PageHeader, PageContent, EmptyState } from '@/components/common';
import {
  usePayrollList,
  useGeneratePayroll,
  useProcessPayroll,
  useApprovePayroll,
  useMarkPayrollPaid,
} from '@/hooks/queries/use-staff';
import { formatCurrency } from '@/lib/format';
import type { Payroll, PayrollStatus } from '@/types/staff';

const PAYROLL_STATUSES: PayrollStatus[] = ['draft', 'processing', 'approved', 'paid', 'cancelled'];

// Generate last 12 months for selection
const getMonthOptions = () => {
  const options = [];
  for (let i = 0; i < 12; i++) {
    const date = subMonths(new Date(), i);
    options.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    });
  }
  return options;
};

export default function PayrollPage() {
  const t = useTranslations('staff.payroll');
  const tCommon = useTranslations('common');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'));

  const monthOptions = getMonthOptions();

  const { data, isLoading, error } = usePayrollList({
    page,
    limit: 20,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    payrollMonth: monthFilter !== 'all' ? monthFilter : undefined,
  });

  const generatePayroll = useGeneratePayroll();
  const processPayroll = useProcessPayroll();
  const approvePayroll = useApprovePayroll();
  const markPaid = useMarkPayrollPaid();

  const payrolls = data?.data ?? [];
  const meta = data?.meta;

  const getStatusBadgeVariant = (status: PayrollStatus) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'processing':
        return 'outline';
      case 'draft':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleGenerate = async () => {
    try {
      const result = await generatePayroll.mutateAsync({
        payrollMonth: selectedMonth,
      });
      toast.success('Payroll generated successfully');
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning: string) => toast.warning(warning));
      }
      setGenerateDialogOpen(false);
    } catch (error) {
      toast.error('Failed to generate payroll');
    }
  };

  const handleProcess = async (id: string) => {
    try {
      await processPayroll.mutateAsync(id);
      toast.success('Payroll processed');
    } catch (error) {
      toast.error('Failed to process payroll');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approvePayroll.mutateAsync(id);
      toast.success('Payroll approved');
    } catch (error) {
      toast.error('Failed to approve payroll');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await markPaid.mutateAsync(id);
      toast.success('Payroll marked as paid');
    } catch (error) {
      toast.error('Failed to mark payroll as paid');
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy');
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('generatePayroll')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('form.title')}</DialogTitle>
                <DialogDescription>Generate payroll for a specific month.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="month">{t('form.month')}</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                  {tCommon('actions.cancel')}
                </Button>
                <Button onClick={handleGenerate} disabled={generatePayroll.isPending}>
                  {generatePayroll.isPending ? t('form.generating') : t('form.generate')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {PAYROLL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status}`)}
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
          <EmptyState icon={Wallet} title={tCommon('status.error')} description={error.message} />
        ) : payrolls.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t('noPayroll')}
            description={t('noPayrollDesc')}
            action={
              <Button onClick={() => setGenerateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('generatePayroll')}
              </Button>
            }
          />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.month')}</TableHead>
                    <TableHead className="text-right">{t('table.employees')}</TableHead>
                    <TableHead className="text-right">{t('table.grossSalary')}</TableHead>
                    <TableHead className="text-right">{t('table.deductions')}</TableHead>
                    <TableHead className="text-right">{t('table.commissions')}</TableHead>
                    <TableHead className="text-right">{t('table.netSalary')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll: Payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-medium">
                        {formatMonth(payroll.payrollMonth)}
                      </TableCell>
                      <TableCell className="text-right">{payroll.totalEmployees}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payroll.totalGrossSalary)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(payroll.totalDeductions)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +{formatCurrency(payroll.totalCommissions)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payroll.totalNetSalary)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(payroll.status)}>
                          {t(`status.${payroll.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/staff/payroll/${payroll.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {payroll.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcess(payroll.id)}
                              disabled={processPayroll.isPending}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {payroll.status === 'processing' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(payroll.id)}
                              disabled={approvePayroll.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {payroll.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaid(payroll.id)}
                              disabled={markPaid.isPending}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
