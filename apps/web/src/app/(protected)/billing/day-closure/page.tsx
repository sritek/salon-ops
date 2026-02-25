'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Calendar, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { PageContainer, PageHeader, PageContent, StatCard, EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchContext } from '@/hooks/use-branch-context';
import {
  useCurrentDay,
  useDayClosures,
  useOpenDay,
  useCloseDay,
  useCashDrawerBalance,
} from '@/hooks/queries/use-invoices';
import { formatCurrency } from '@/lib/format';
import type { DayClosure, DayClosureStatus } from '@/types/billing';

function StatusBadge({ status }: { status: DayClosureStatus }) {
  const variants: Record<DayClosureStatus, 'default' | 'secondary' | 'outline'> = {
    open: 'default',
    closed: 'secondary',
    reconciled: 'outline',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

export default function DayClosurePage() {
  const t = useTranslations('billing');
  const { branchId } = useBranchContext();

  const [openDayDialog, setOpenDayDialog] = useState(false);
  const [closeDayDialog, setCloseDayDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [closureNotes, setClosureNotes] = useState('');

  const { data: currentDay } = useCurrentDay(branchId || '');
  const { data: dayClosures, isLoading: loadingHistory } = useDayClosures({
    branchId: branchId || '',
    limit: 10,
  });
  const { data: cashBalance } = useCashDrawerBalance(branchId || '');
  const openDayMutation = useOpenDay();
  const closeDayMutation = useCloseDay();

  const handleOpenDay = async () => {
    await openDayMutation.mutateAsync({
      branchId: branchId || '',
      openingCash: openingCash ? parseFloat(openingCash) : undefined,
    });
    setOpenDayDialog(false);
    setOpeningCash('');
  };

  const handleCloseDay = async () => {
    if (!currentDay?.id) return;
    await closeDayMutation.mutateAsync({
      dayClosureId: currentDay.id,
      data: { actualCash: parseFloat(actualCash), notes: closureNotes || undefined },
    });
    setCloseDayDialog(false);
    setActualCash('');
    setClosureNotes('');
  };

  const isDayOpen = currentDay?.status === 'open';

  return (
    <PageContainer>
      <PageHeader
        title={t('dayClosureTitle')}
        description={t('dayClosureDescription')}
        actions={
          isDayOpen ? (
            <Button onClick={() => setCloseDayDialog(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('closeDay')}
            </Button>
          ) : (
            <Button onClick={() => setOpenDayDialog(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              {t('openDay')}
            </Button>
          )
        }
      />

      <PageContent>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <StatCard
            title={t('todayStatus')}
            value={isDayOpen ? t('dayOpen') : t('dayClosed')}
            icon={isDayOpen ? Clock : CheckCircle}
          />
          <StatCard
            title={t('currentCashBalance')}
            value={formatCurrency(cashBalance?.balance || 0)}
            icon={DollarSign}
          />
          {currentDay?.totalRevenue !== undefined && (
            <StatCard
              title={t('todayRevenue')}
              value={formatCurrency(currentDay.totalRevenue)}
              icon={DollarSign}
            />
          )}
          {currentDay?.totalInvoices !== undefined && (
            <StatCard title={t('todayInvoices')} value={currentDay.totalInvoices} icon={Calendar} />
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('closureHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !dayClosures?.data?.length ? (
              <EmptyState title={t('noClosures')} description={t('noClosuresDescription')} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('revenue')}</TableHead>
                    <TableHead className="text-right">{t('invoices')}</TableHead>
                    <TableHead className="text-right">{t('expectedCash')}</TableHead>
                    <TableHead className="text-right">{t('actualCash')}</TableHead>
                    <TableHead className="text-right">{t('difference')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayClosures.data.map((closure: DayClosure) => (
                    <TableRow key={closure.id}>
                      <TableCell>{format(new Date(closure.closureDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <StatusBadge status={closure.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(closure.totalRevenue || 0)}
                      </TableCell>
                      <TableCell className="text-right">{closure.totalInvoices || 0}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(closure.expectedCash || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {closure.actualCash !== undefined
                          ? formatCurrency(closure.actualCash)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {closure.cashDifference !== undefined ? (
                          <span
                            className={
                              closure.cashDifference < 0 ? 'text-red-600' : 'text-green-600'
                            }
                          >
                            {formatCurrency(closure.cashDifference)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageContent>

      <Dialog open={openDayDialog} onOpenChange={setOpenDayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('openDayTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="openingCash">{t('openingCash')}</Label>
              <Input
                id="openingCash"
                type="number"
                placeholder="0.00"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">{t('openingCashHint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDayDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleOpenDay} disabled={openDayMutation.isPending}>
              {openDayMutation.isPending ? t('opening') : t('openDay')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDayDialog} onOpenChange={setCloseDayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('closeDayTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t('expectedCash')}</p>
              <p className="text-2xl font-bold">{formatCurrency(cashBalance?.balance || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualCash">{t('actualCash')}</Label>
              <Input
                id="actualCash"
                type="number"
                placeholder="0.00"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closureNotes">{t('notes')}</Label>
              <Textarea
                id="closureNotes"
                placeholder={t('closureNotesPlaceholder')}
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDayDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCloseDay} disabled={!actualCash || closeDayMutation.isPending}>
              {closeDayMutation.isPending ? t('closing') : t('closeDay')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
