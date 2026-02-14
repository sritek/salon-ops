/**
 * Staff Deductions Page
 *
 * Displays and manages deductions for a staff member.
 */

'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Wallet, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
} from '@/components/ui/alert-dialog';
import { PageHeader, PageContent, EmptyState } from '@/components/common';
import { useStaffDetail, useDeductionList, useCancelDeduction } from '@/hooks/queries/use-staff';
import { formatCurrency, formatDate } from '@/lib/format';
import { AddDeductionDialog } from './components/add-deduction-dialog';
import { EditDeductionDialog } from './components/edit-deduction-dialog';
import type { StaffDeduction, DeductionStatus } from '@/types/staff';

interface DeductionsPageProps {
  params: Promise<{ id: string }>;
}

export default function DeductionsPage({ params }: DeductionsPageProps) {
  const { id: staffId } = use(params);
  const t = useTranslations('staff.deductions');
  const tCommon = useTranslations('common');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<StaffDeduction | null>(null);
  const [cancellingDeduction, setCancellingDeduction] = useState<StaffDeduction | null>(null);

  const { data: staff, isLoading: staffLoading } = useStaffDetail(staffId);
  const { data: deductions, isLoading: deductionsLoading } = useDeductionList(staffId);
  const cancelDeduction = useCancelDeduction();

  const isLoading = staffLoading || deductionsLoading;

  const getStatusBadgeVariant = (status: DeductionStatus) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const calculateProgress = (deduction: StaffDeduction) => {
    const paid = deduction.totalAmount - deduction.remainingAmount;
    return (paid / deduction.totalAmount) * 100;
  };

  const handleCancel = async () => {
    if (!cancellingDeduction) return;
    try {
      await cancelDeduction.mutateAsync(cancellingDeduction.id);
      toast.success(t('cancelSuccess'));
      setCancellingDeduction(null);
    } catch (error) {
      toast.error(t('cancelError'));
    }
  };

  // Calculate summary
  const summary = {
    totalActive: deductions?.filter((d) => d.status === 'active').length ?? 0,
    totalRemaining:
      deductions
        ?.filter((d) => d.status === 'active')
        .reduce((sum, d) => sum + d.remainingAmount, 0) ?? 0,
    monthlyDeduction:
      deductions
        ?.filter((d) => d.status === 'active')
        .reduce((sum, d) => sum + d.monthlyDeduction, 0) ?? 0,
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title={<Skeleton className="h-8 w-48" />}
          actions={
            <Button variant="outline" asChild>
              <Link href={`/staff/${staffId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToProfile')}
              </Link>
            </Button>
          }
        />
        <PageContent>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('title', { name: staff?.user?.name ?? '' })}
        description={t('description')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/staff/${staffId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToProfile')}
              </Link>
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addDeduction')}
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
                {t('summary.activeDeductions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalActive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('summary.totalRemaining')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalRemaining)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('summary.monthlyDeduction')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.monthlyDeduction)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deductions Table */}
        {!deductions || deductions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t('noDeductions')}
            description={t('noDeductionsDescription')}
            action={
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('addDeduction')}
              </Button>
            }
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.type')}</TableHead>
                  <TableHead>{t('table.description')}</TableHead>
                  <TableHead className="text-right">{t('table.totalAmount')}</TableHead>
                  <TableHead className="text-right">{t('table.monthly')}</TableHead>
                  <TableHead>{t('table.progress')}</TableHead>
                  <TableHead>{t('table.startDate')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead className="text-right">{tCommon('actions.title')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.map((deduction: StaffDeduction) => (
                  <TableRow key={deduction.id}>
                    <TableCell className="font-medium capitalize">
                      {t(`types.${deduction.deductionType}`)}
                    </TableCell>
                    <TableCell>{deduction.description}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(deduction.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(deduction.monthlyDeduction)}
                    </TableCell>
                    <TableCell>
                      <div className="w-32 space-y-1">
                        <Progress value={calculateProgress(deduction)} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(deduction.totalAmount - deduction.remainingAmount)} /{' '}
                          {formatCurrency(deduction.totalAmount)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(deduction.startDate)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(deduction.status)}>
                        {t(`status.${deduction.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {deduction.status === 'active' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingDeduction(deduction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCancellingDeduction(deduction)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContent>

      {/* Add Deduction Dialog */}
      <AddDeductionDialog staffId={staffId} open={isAddOpen} onOpenChange={setIsAddOpen} />

      {/* Edit Deduction Dialog */}
      {editingDeduction && (
        <EditDeductionDialog
          deduction={editingDeduction}
          open={!!editingDeduction}
          onOpenChange={(open) => !open && setEditingDeduction(null)}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={!!cancellingDeduction}
        onOpenChange={(open) => !open && setCancellingDeduction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cancelConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cancelConfirmDescription', {
                description: cancellingDeduction?.description ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('cancelDeduction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
