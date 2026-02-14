/**
 * Staff Attendance Page
 *
 * Track and manage staff attendance records.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarCheck, Clock, UserX, Coffee } from 'lucide-react';

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
import { PageHeader, PageContent, EmptyState, StatCard, DatePicker } from '@/components/common';
import { useAttendanceList } from '@/hooks/queries/use-staff';
import { formatDate, formatTime } from '@/lib/format';
import type { Attendance, AttendanceStatus } from '@/types/staff';

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'present',
  'absent',
  'half_day',
  'on_leave',
  'holiday',
  'week_off',
];

export default function AttendancePage() {
  const t = useTranslations('staff.attendance');
  const tCommon = useTranslations('common');

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  const { data, isLoading, error } = useAttendanceList({
    page,
    limit: 20,
    startDate,
    endDate,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const attendance = data?.data ?? [];
  const meta = data?.meta;

  // Calculate summary stats
  const presentCount = attendance.filter((a: Attendance) => a.status === 'present').length;
  const absentCount = attendance.filter((a: Attendance) => a.status === 'absent').length;
  const onLeaveCount = attendance.filter((a: Attendance) => a.status === 'on_leave').length;
  const totalOvertime = attendance.reduce(
    (sum: number, a: Attendance) => sum + (!isNaN(a.overtimeHours) ? Number(a.overtimeHours) : 0),
    0
  );

  console.log('totalOvertime', totalOvertime);

  const getStatusBadgeVariant = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'default';
      case 'absent':
        return 'destructive';
      case 'half_day':
        return 'secondary';
      case 'on_leave':
        return 'outline';
      case 'holiday':
      case 'week_off':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <PageContent>
        {/* Summary Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('summary.present')}
            value={presentCount}
            icon={CalendarCheck}
            variant="success"
          />
          <StatCard
            title={t('summary.absent')}
            value={absentCount}
            icon={UserX}
            variant="destructive"
          />
          <StatCard
            title={t('summary.onLeave')}
            value={onLeaveCount}
            icon={Coffee}
            variant="warning"
          />
          <StatCard
            title={t('summary.overtime')}
            value={`${totalOvertime.toFixed(1)}h`}
            icon={Clock}
            variant="info"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            format="MMMM yyyy"
            className="w-[240px]"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={tCommon('status.loading')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {tCommon('pagination.noResults').replace('No results found', 'All Status')}
              </SelectItem>
              {ATTENDANCE_STATUSES.map((status) => (
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
          <EmptyState
            icon={CalendarCheck}
            title={tCommon('status.error')}
            description={error.message}
          />
        ) : attendance.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={t('noRecords')}
            description={t('noRecordsDesc')}
          />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.staff')}</TableHead>
                    <TableHead>{t('table.date')}</TableHead>
                    <TableHead>{t('table.checkIn')}</TableHead>
                    <TableHead>{t('table.checkOut')}</TableHead>
                    <TableHead>{t('table.hours')}</TableHead>
                    <TableHead>{t('table.overtime')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record: Attendance) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.staffProfile?.user?.name ?? '-'}
                      </TableCell>
                      <TableCell>{formatDate(record.attendanceDate)}</TableCell>
                      <TableCell>
                        {record.checkInTime ? formatTime(record.checkInTime) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime ? formatTime(record.checkOutTime) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.actualHours
                          ? `${!isNaN(record.actualHours) ? Number(record.actualHours).toFixed(1) : 0}h`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {record.overtimeHours > 0 ? (
                          <span className="text-green-600">
                            +{record.overtimeHours.toFixed(1)}h
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(record.status)}>
                          {t(`status.${record.status}`)}
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
