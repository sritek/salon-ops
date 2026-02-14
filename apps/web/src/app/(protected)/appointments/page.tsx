'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Calendar, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import {
  useAppointments,
  useCheckIn,
  useStartAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  useMarkNoShow,
} from '@/hooks/queries/use-appointments';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import { useAppointmentsUIStore } from '@/stores/appointments-ui-store';

import {
  AccessDenied,
  ConfirmDialog,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { Button } from '@/components/ui/button';

import { AppointmentFilters, AppointmentTable, type AppointmentFiltersState } from './components';

import type {
  AppointmentFilters as AppointmentFiltersType,
  AppointmentStatus,
  BookingType,
} from '@/types/appointments';

export default function AppointmentsPage() {
  const t = useTranslations('appointments.list');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.APPOINTMENTS_WRITE);

  // State for no-show confirmation dialog
  const [noShowId, setNoShowId] = useState<string | null>(null);

  // Use persisted store for state
  const {
    currentDate,
    listFilters,
    listPage,
    listLimit,
    setCurrentDate,
    setListFilters,
    setListPage,
    setListLimit,
  } = useAppointmentsUIStore();

  // Convert stored date string to Date object
  const selectedDate = useMemo(() => {
    try {
      return parseISO(currentDate);
    } catch {
      return new Date();
    }
  }, [currentDate]);

  // Combine store filters with date for the filter component
  const filters: AppointmentFiltersState = useMemo(
    () => ({
      search: listFilters.search,
      date: selectedDate,
      status: listFilters.status,
      bookingType: listFilters.bookingType,
    }),
    [listFilters, selectedDate]
  );

  const debouncedSearch = useDebounce(listFilters.search, 300);

  // Build query filters
  const queryFilters: AppointmentFiltersType = {
    page: listPage,
    limit: listLimit,
    search: debouncedSearch || undefined,
    dateFrom: format(selectedDate, 'yyyy-MM-dd'),
    dateTo: format(selectedDate, 'yyyy-MM-dd'),
    status: listFilters.status !== 'all' ? (listFilters.status as AppointmentStatus) : undefined,
    bookingType:
      listFilters.bookingType !== 'all' ? (listFilters.bookingType as BookingType) : undefined,
    sortBy: 'scheduledTime',
    sortOrder: 'asc',
  };

  // Queries
  const { data: appointmentsData, isLoading } = useAppointments(queryFilters);

  // Mutations
  const checkIn = useCheckIn();
  const startAppointment = useStartAppointment();
  const completeAppointment = useCompleteAppointment();
  const cancelAppointment = useCancelAppointment();
  const markNoShow = useMarkNoShow();

  // Handlers
  const handleFiltersChange = useCallback(
    (newFilters: AppointmentFiltersState) => {
      // Update date in store
      if (newFilters.date) {
        setCurrentDate(newFilters.date);
      }
      // Update other filters
      setListFilters({
        search: newFilters.search,
        status: newFilters.status,
        bookingType: newFilters.bookingType,
      });
    },
    [setCurrentDate, setListFilters]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setListPage(newPage);
    },
    [setListPage]
  );

  const handlePageSizeChange = useCallback(
    (newLimit: number) => {
      setListLimit(newLimit);
      setListPage(1);
    },
    [setListLimit, setListPage]
  );

  const handleCheckIn = useCallback(
    async (id: string) => {
      await checkIn.mutateAsync(id);
    },
    [checkIn]
  );

  const handleStart = useCallback(
    async (id: string) => {
      await startAppointment.mutateAsync(id);
    },
    [startAppointment]
  );

  const handleComplete = useCallback(
    async (id: string) => {
      await completeAppointment.mutateAsync(id);
    },
    [completeAppointment]
  );

  const handleCancel = useCallback(
    async (id: string) => {
      const reason = prompt(t('cancelReason'));
      if (reason) {
        await cancelAppointment.mutateAsync({ id, data: { reason } });
      }
    },
    [cancelAppointment, t]
  );

  const handleNoShow = useCallback((id: string) => {
    setNoShowId(id);
  }, []);

  const confirmNoShow = useCallback(async () => {
    if (noShowId) {
      await markNoShow.mutateAsync(noShowId);
      setNoShowId(null);
    }
  }, [markNoShow, noShowId]);

  const hasFilters =
    listFilters.search !== '' || listFilters.status !== 'all' || listFilters.bookingType !== 'all';

  // Extract data and meta from response
  const appointments = appointmentsData?.data || [];
  const meta = appointmentsData?.meta;

  return (
    <PermissionGuard permission={PERMISSIONS.APPOINTMENTS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('title')}
          description={t('description')}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/appointments/calendar">
                  <Calendar className="mr-2 h-4 w-4" />
                  {t('viewCalendar')}
                </Link>
              </Button>
              {canWrite && (
                <Button asChild>
                  <Link href="/appointments/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('newAppointment')}
                  </Link>
                </Button>
              )}
            </div>
          }
        />

        <PageContent>
          <AppointmentFilters filters={filters} onFiltersChange={handleFiltersChange} />

          <AppointmentTable
            data={appointments}
            meta={meta}
            isLoading={isLoading}
            canWrite={canWrite}
            page={listPage}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onCheckIn={handleCheckIn}
            onStart={handleStart}
            onComplete={handleComplete}
            onCancel={handleCancel}
            onNoShow={handleNoShow}
            hasFilters={hasFilters}
          />
        </PageContent>

        <ConfirmDialog
          open={!!noShowId}
          onOpenChange={(open) => !open && setNoShowId(null)}
          title={t('confirmNoShowTitle')}
          description={t('confirmNoShowDescription')}
          variant="destructive"
          onConfirm={confirmNoShow}
          isLoading={markNoShow.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
