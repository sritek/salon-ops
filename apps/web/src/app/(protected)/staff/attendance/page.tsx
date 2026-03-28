/**
 * Staff Attendance Page
 *
 * Always uses the daily attendance API (which includes "not_marked" staff).
 * For date ranges, queries each date in parallel via useDailyAttendanceRange.
 * Summary stat cards shown for single-day view only.
 * Filter sheet for date range, staff, and status.
 * Owner can change status via pencil-icon dropdown.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { format, parse } from 'date-fns';
import { CalendarCheck, UserX, Coffee, Clock, Pencil, Check, Filter } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { PageHeader, PageContent, EmptyState, StatCard, ConfirmDialog } from '@/components/common';
import { useDailyAttendanceRange, useManualAttendance } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useErrorHandler } from '@/hooks/use-error-handler';
import type { DailyAttendanceRecord, DailyAttendanceStatus } from '@/types/staff';
import {
  AttendanceFiltersSheet,
  type AttendanceFiltersState,
} from './components/attendance-filters-sheet';

type StatusAction = 'present' | 'absent' | 'on_leave';
const ALL_STATUS_ACTIONS: StatusAction[] = ['present', 'absent', 'on_leave'];

const getStatusBadgeVariant = (status: DailyAttendanceStatus) => {
  switch (status) {
    case 'present':
      return 'default';
    case 'absent':
      return 'destructive';
    case 'on_leave':
      return 'warning';
    case 'half_day':
      return 'secondary';
    case 'not_marked':
      return 'outline';
    case 'holiday':
    case 'week_off':
      return 'secondary';
    default:
      return 'outline';
  }
};

const isEditable = (status: DailyAttendanceStatus) =>
  !['holiday', 'week_off'].includes(status);

export default function AttendancePage() {
  const t = useTranslations('staff.attendance');
  const tCommon = useTranslations('common');
  const { isOwner } = usePermissions();
  const { branchId } = useBranchContext();
  const { handleError } = useErrorHandler();

  const today = format(new Date(), 'yyyy-MM-dd');

  const [filters, setFilters] = useState<AttendanceFiltersState>({
    dateFrom: today,
    dateTo: today,
    statuses: [],
    staffIds: [],
  });
  const [filterOpen, setFilterOpen] = useState(false);

  const [confirmRecord, setConfirmRecord] = useState<DailyAttendanceRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<StatusAction | null>(null);

  const isSingleDay = filters.dateFrom === filters.dateTo;

  // Always use daily API — includes "not_marked" staff for every date
  const { results, isLoading, error } = useDailyAttendanceRange(
    filters.dateFrom,
    filters.dateTo,
    branchId || undefined
  );

  const manualAttendance = useManualAttendance();

  // For single day, grab the summary from the first (only) result
  const summary = isSingleDay ? results[0]?.data?.summary ?? null : null;

  // Merge all daily results into a flat row list
  const rows: DailyAttendanceRecord[] = useMemo(() => {
    const all: DailyAttendanceRecord[] = [];
    for (const r of results) {
      if (r.data?.data) {
        all.push(...r.data.data);
      }
    }
    return all;
  }, [results]);

  // Apply client-side filters
  const filteredRecords = useMemo(() => {
    let result = rows;
    if (filters.statuses.length > 0) {
      result = result.filter((r) => filters.statuses.includes(r.status));
    }
    if (filters.staffIds.length > 0) {
      result = result.filter((r) => filters.staffIds.includes(r.userId));
    }
    return result;
  }, [rows, filters.statuses, filters.staffIds]);

  const filterCount = filters.statuses.length + filters.staffIds.length;

  const handleFiltersChange = useCallback((next: AttendanceFiltersState) => {
    setFilters(next);
  }, []);

  const openConfirm = useCallback((record: DailyAttendanceRecord, action: StatusAction) => {
    setConfirmRecord(record);
    setConfirmAction(action);
  }, []);

  const handleConfirmStatusChange = useCallback(async () => {
    if (!confirmRecord || !confirmAction || !branchId) return;
    try {
      await manualAttendance.mutateAsync({
        userId: confirmRecord.userId,
        branchId,
        attendanceDate: confirmRecord.attendanceDate,
        status: confirmAction,
      });
      toast.success(t('editSuccess'));
      setConfirmRecord(null);
      setConfirmAction(null);
    } catch (err) {
      handleError(err, { customMessage: t('editError') });
    }
  }, [confirmRecord, confirmAction, branchId, manualAttendance, handleError, t]);

  // Header description
  const dateFromParsed = parse(filters.dateFrom, 'yyyy-MM-dd', new Date());
  const dateToParsed = parse(filters.dateTo, 'yyyy-MM-dd', new Date());
  const dateLabel = isSingleDay
    ? format(dateFromParsed, 'EEEE, dd MMM yyyy')
    : `${format(dateFromParsed, 'dd MMM yyyy')} — ${format(dateToParsed, 'dd MMM yyyy')}`;

  const confirmTitle = confirmAction ? `Mark ${t(`status.${confirmAction}`)}` : '';
  const confirmDescription =
    confirmRecord && confirmAction
      ? `Are you sure you want to mark ${confirmRecord.staffName} as "${t(`status.${confirmAction}`)}" for ${confirmRecord.attendanceDate}?`
      : '';

  return (
    <>
      <PageHeader title={t('title')} description={`${t('description')} — ${dateLabel}`} />

      <PageContent>
        {/* Summary Stats (single-day only) */}
        {isSingleDay && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t('summary.present')} value={summary?.present ?? 0} icon={CalendarCheck} variant="success" />
            <StatCard title={t('summary.absent')} value={summary?.absent ?? 0} icon={UserX} variant="destructive" />
            <StatCard title={t('summary.onLeave')} value={summary?.onLeave ?? 0} icon={Coffee} variant="warning" />
            <StatCard title={t('summary.notMarked')} value={summary?.notMarked ?? 0} icon={Clock} variant="default" />
          </div>
        )}

        {/* Filter button */}
        <div className="mb-6 flex items-center justify-between">
          {filterCount > 0 && (
            <span className="text-sm text-muted-foreground">
              Showing {filteredRecords.length} of {rows.length} records
            </span>
          )}
          <Button variant="outline" onClick={() => setFilterOpen(true)} className="gap-2 ml-auto">
            <Filter className="h-4 w-4" />
            {t('filters')}
            {filterCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {filterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState icon={CalendarCheck} title={tCommon('status.error')} description={(error as Error).message} />
        ) : filteredRecords.length === 0 ? (
          <EmptyState icon={CalendarCheck} title={t('noRecords')} description={t('noRecordsDesc')} />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.staff')}</TableHead>
                  <TableHead>{t('table.date')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  {isOwner && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, idx) => {
                  const canEdit = isOwner && isEditable(record.status);
                  return (
                    <TableRow key={`${record.userId}-${record.attendanceDate}-${idx}`}>
                      <TableCell className="font-medium">{record.staffName}</TableCell>
                      <TableCell>{record.attendanceDate}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(record.status)}>
                          {t(`status.${record.status}`)}
                        </Badge>
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          {canEdit ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">{t('editAttendance')}</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {ALL_STATUS_ACTIONS.map((action) => {
                                  const isCurrent = record.status === action;
                                  return (
                                    <DropdownMenuItem
                                      key={action}
                                      disabled={isCurrent}
                                      onSelect={() => {
                                        if (!isCurrent) openConfirm(record, action);
                                      }}
                                      className="flex items-center justify-between"
                                    >
                                      <span>{t(`status.${action}`)}</span>
                                      {isCurrent && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Check className="h-3 w-3" />
                                          Current
                                        </span>
                                      )}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContent>

      {/* Filter Sheet */}
      <AttendanceFiltersSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmRecord && !!confirmAction}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmRecord(null);
            setConfirmAction(null);
          }
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmText="Confirm"
        variant={confirmAction === 'absent' ? 'destructive' : 'default'}
        onConfirm={handleConfirmStatusChange}
        isLoading={manualAttendance.isPending}
      />
    </>
  );
}
