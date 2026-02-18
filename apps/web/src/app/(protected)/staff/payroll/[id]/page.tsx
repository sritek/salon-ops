/**
 * Payroll Detail Page
 *
 * View detailed payroll breakdown for a specific month.
 */

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Wallet,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Mail,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader, PageContent, EmptyState, StatCard } from '@/components/common';
import {
  usePayrollDetail,
  usePayslipList,
  usePayslipDownload,
  useSendPayslipEmail,
  useSendPayslipWhatsApp,
} from '@/hooks/queries/use-staff';
import { formatCurrency } from '@/lib/format';
import type { PayrollItem, PayrollStatus, Payslip } from '@/types/staff';

interface PayrollDetailPageProps {
  params: { id: string };
}

export default function PayrollDetailPage({ params }: PayrollDetailPageProps) {
  const { id } = params;
  const t = useTranslations('staff.payroll');
  const tCommon = useTranslations('common');

  const { data: payroll, isLoading, error } = usePayrollDetail(id);
  const { data: payslipsData } = usePayslipList({
    payPeriod: payroll?.payrollMonth,
    limit: 100,
  });

  const downloadPayslip = usePayslipDownload();
  const sendEmail = useSendPayslipEmail();
  const sendWhatsApp = useSendPayslipWhatsApp();

  const payslips = payslipsData?.data ?? [];

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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy');
  };

  const handleDownload = async (payslip: Payslip) => {
    try {
      const result = await downloadPayslip.mutateAsync(payslip.id);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      toast.error(t('payslip.downloadError'));
    }
  };

  const handleSendEmail = async (payslipId: string) => {
    try {
      await sendEmail.mutateAsync(payslipId);
      toast.success(t('payslip.emailSent'));
    } catch (error) {
      toast.error(t('payslip.emailError'));
    }
  };

  const handleSendWhatsApp = async (payslipId: string) => {
    try {
      await sendWhatsApp.mutateAsync(payslipId);
      toast.success(t('payslip.whatsappSent'));
    } catch (error) {
      toast.error(t('payslip.whatsappError'));
    }
  };

  // Find payslip for a user
  const getPayslipForUser = (userId: string) => {
    return payslips.find((p) => p.userId === userId);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title={<Skeleton className="h-8 w-48" />}
          actions={
            <Button variant="outline" asChild>
              <Link href="/staff/payroll">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('detail.backToList')}
              </Link>
            </Button>
          }
        />
        <PageContent>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </PageContent>
      </>
    );
  }

  if (error || !payroll) {
    return (
      <>
        <PageHeader
          title={t('detail.title')}
          actions={
            <Button variant="outline" asChild>
              <Link href="/staff/payroll">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('detail.backToList')}
              </Link>
            </Button>
          }
        />
        <PageContent>
          <EmptyState
            icon={Wallet}
            title={tCommon('status.error')}
            description={error?.message ?? 'Payroll not found'}
          />
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>{formatMonth(payroll.payrollMonth)}</span>
            <Badge variant={getStatusBadgeVariant(payroll.status)}>
              {t(`status.${payroll.status}`)}
            </Badge>
          </div>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/staff/payroll">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('detail.backToList')}
            </Link>
          </Button>
        }
      />

      <PageContent>
        {/* Summary Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title={t('detail.totalEmployees')}
            value={payroll.totalEmployees}
            icon={Users}
          />
          <StatCard
            title={t('detail.totalGross')}
            value={formatCurrency(payroll.totalGrossSalary)}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title={t('detail.totalDeductions')}
            value={formatCurrency(payroll.totalDeductions)}
            icon={TrendingDown}
            variant="destructive"
          />
          <StatCard
            title={t('detail.totalCommissions')}
            value={formatCurrency(payroll.totalCommissions)}
            icon={DollarSign}
            variant="info"
          />
          <StatCard
            title={t('detail.totalNet')}
            value={formatCurrency(payroll.totalNetSalary)}
            icon={Wallet}
            variant="default"
          />
        </div>

        {/* Employee Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.employees')}</CardTitle>
          </CardHeader>
          <CardContent>
            {payroll.items && payroll.items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Working Days</TableHead>
                      <TableHead className="text-right">Present</TableHead>
                      <TableHead className="text-right">Base Salary</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                      <TableHead className="text-right">Commissions</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      {payroll.status === 'paid' && (
                        <TableHead className="text-right">{t('payslip.title')}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payroll.items.map((item: PayrollItem) => {
                      const payslip = getPayslipForUser(item.userId);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.staffProfile?.user?.name ?? '-'}
                          </TableCell>
                          <TableCell className="text-right">{item.workingDays}</TableCell>
                          <TableCell className="text-right">{item.presentDays}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.baseSalary)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            +{formatCurrency(item.totalEarnings)}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            +{formatCurrency(item.totalCommissions)}
                            {item.commissionCount > 0 && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({item.commissionCount})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            -{formatCurrency(item.totalDeductions)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.netSalary)}
                          </TableCell>
                          {payroll.status === 'paid' && (
                            <TableCell className="text-right">
                              {payslip ? (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownload(payslip)}
                                    disabled={downloadPayslip.isPending}
                                    title={t('payslip.download')}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSendEmail(payslip.id)}
                                    disabled={sendEmail.isPending}
                                    title={t('payslip.sendEmail')}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSendWhatsApp(payslip.id)}
                                    disabled={sendWhatsApp.isPending}
                                    title={t('payslip.sendWhatsApp')}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {t('payslip.notGenerated')}
                                </span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No employee data available</p>
            )}
          </CardContent>
        </Card>

        {/* Payslips Section - Only show when payroll is paid */}
        {payroll.status === 'paid' && payslips.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('payslip.listTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('payslip.number')}</TableHead>
                      <TableHead>{t('payslip.employee')}</TableHead>
                      <TableHead className="text-right">{t('payslip.netSalary')}</TableHead>
                      <TableHead>{t('payslip.emailStatus')}</TableHead>
                      <TableHead>{t('payslip.whatsappStatus')}</TableHead>
                      <TableHead className="text-right">{tCommon('actions.title')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((payslip: Payslip) => (
                      <TableRow key={payslip.id}>
                        <TableCell className="font-mono text-sm">{payslip.payslipNumber}</TableCell>
                        <TableCell>{payslip.staffProfile?.user?.name ?? '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payslip.netSalary)}
                        </TableCell>
                        <TableCell>
                          {payslip.emailedAt ? (
                            <Badge variant="secondary">{t('payslip.sent')}</Badge>
                          ) : (
                            <Badge variant="outline">{t('payslip.notSent')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {payslip.whatsappSentAt ? (
                            <Badge variant="secondary">{t('payslip.sent')}</Badge>
                          ) : (
                            <Badge variant="outline">{t('payslip.notSent')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownload(payslip)}
                              disabled={downloadPayslip.isPending}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendEmail(payslip.id)}
                              disabled={sendEmail.isPending}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendWhatsApp(payslip.id)}
                              disabled={sendWhatsApp.isPending}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {payroll.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{payroll.notes}</p>
            </CardContent>
          </Card>
        )}
      </PageContent>
    </>
  );
}
