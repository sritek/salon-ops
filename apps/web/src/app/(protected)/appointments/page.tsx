'use client';

/**
 * Appointments Page - Calendar-First
 * Based on: .kiro/specs/ux-consolidation-slideover/design.md
 * Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7
 *
 * Default view is calendar, with list view as secondary option.
 * View preference is persisted in localStorage.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Calendar, List, Plus, UserPlus, ClipboardList, UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import {
  useAppointments,
  useCheckIn,
  useStartAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  useMarkNoShow,
  useUnassignedCount,
} from '@/hooks/queries/use-appointments';
import { useResourceCalendar, useMoveAppointment } from '@/hooks/queries/use-resource-calendar';
import { useWaitlistCount } from '@/hooks/queries/use-waitlist';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useAppointmentsUIStore } from '@/stores/appointments-ui-store';
import { useCalendarStore } from '@/stores/calendar-store';
import { useOpenPanel } from '@/components/ux/slide-over/slide-over-registry';
import { useMediaQuery } from '@/hooks/use-media-query';

import {
  AccessDenied,
  ConfirmDialog,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ResourceCalendar, CalendarFilters, MobileCalendar } from '@/components/ux/calendar';

import { AppointmentFilters, AppointmentTable, type AppointmentFiltersState } from './components';

import type {
  AppointmentFilters as AppointmentFiltersType,
  AppointmentStatus,
  BookingType,
} from '@/types/appointments';

// View preference storage key
const VIEW_PREFERENCE_KEY = 'appointments-view-preference';

type ViewMode = 'calendar' | 'list';

export default function AppointmentsPage() {
  const t = useTranslations('appointments');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const { openAppointmentDetails, openNewAppointment, openCheckout, openUnassignedAppointments } =
    useOpenPanel();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // View mode state - default to calendar
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [viewLoaded, setViewLoaded] = useState(false);

  // Load view preference from URL param or localStorage
  useEffect(() => {
    const urlView = searchParams.get('view') as ViewMode | null;
    if (urlView === 'calendar' || urlView === 'list') {
      setViewMode(urlView);
      localStorage.setItem(VIEW_PREFERENCE_KEY, urlView);
    }

    setViewLoaded(true);
  }, [searchParams]);

  // Save view preference to localStorage and update URL
  const handleViewChange = useCallback(
    (value: string) => {
      if (value === 'calendar' || value === 'list') {
        setViewMode(value);
        localStorage.setItem(VIEW_PREFERENCE_KEY, value);
        // Update URL without navigation
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', value);
        router.replace(`/appointments?${params.toString()}`, { scroll: false });
      }
    },
    [router, searchParams]
  );

  // State for no-show confirmation dialog
  const [noShowId, setNoShowId] = useState<string | null>(null);

  // Filter panel state
  const [filterOpen, setFilterOpen] = useState(false);

  // Confirmation dialog for stylist change
  const [confirmMove, setConfirmMove] = useState<{
    appointmentId: string;
    newStylistId: string;
    newDate: string;
    newTime: string;
    stylistName?: string;
  } | null>(null);

  // Use persisted store for list state
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

  // Calendar state from store
  const { selectedDate, filters: calendarFilters } = useCalendarStore();

  // Get branch from branch context (handles multi-branch selection)
  const { branchId } = useBranchContext();

  // Convert stored date string to Date object for list view
  const selectedListDate = useMemo(() => {
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
      date: selectedListDate,
      status: listFilters.status,
      bookingType: listFilters.bookingType,
      stylistId: listFilters.stylistId || 'all',
    }),
    [listFilters, selectedListDate]
  );

  const debouncedSearch = useDebounce(listFilters.search, 300);

  // Build query filters for list view
  const queryFilters: AppointmentFiltersType = {
    page: listPage,
    limit: listLimit,
    branchId: branchId || undefined, // Filter by current branch
    search: debouncedSearch || undefined,
    dateFrom: format(selectedListDate, 'yyyy-MM-dd'),
    dateTo: format(selectedListDate, 'yyyy-MM-dd'),
    status: listFilters.status !== 'all' ? (listFilters.status as AppointmentStatus) : undefined,
    bookingType:
      listFilters.bookingType !== 'all' ? (listFilters.bookingType as BookingType) : undefined,
    stylistId:
      listFilters.stylistId && listFilters.stylistId !== 'all' ? listFilters.stylistId : undefined,
    sortBy: 'scheduledTime',
    sortOrder: 'asc',
  };

  // Queries - only fetch data for the active view
  const { data: appointmentsData, isLoading: isLoadingList } = useAppointments(queryFilters, {
    enabled: viewMode === 'list',
  });
  const { data: calendarData, isLoading: isLoadingCalendar } = useResourceCalendar(
    {
      branchId: branchId || '',
      date: selectedDate,
      view: 'day',
    },
    { enabled: viewMode === 'calendar' && !!branchId }
  );

  // Badge count queries
  const { data: unassignedCountData } = useUnassignedCount(branchId || '');
  const { data: waitlistCountData } = useWaitlistCount(branchId || '');
  const unassignedCount = unassignedCountData?.count || 0;
  const waitlistCount = waitlistCountData?.count || 0;

  // Mutations
  const checkIn = useCheckIn();
  const startAppointment = useStartAppointment();
  const completeAppointment = useCompleteAppointment();
  const cancelAppointment = useCancelAppointment();
  const markNoShow = useMarkNoShow();
  const moveAppointment = useMoveAppointment();

  // List view handlers - open SlideOver for viewing
  const handleView = useCallback(
    (id: string) => {
      openAppointmentDetails(id);
    },
    [openAppointmentDetails]
  );

  const handleCheckout = useCallback(
    (id: string) => {
      openCheckout(id);
    },
    [openCheckout]
  );

  const handleFiltersChange = useCallback(
    (newFilters: AppointmentFiltersState) => {
      if (newFilters.date) {
        setCurrentDate(newFilters.date);
      }
      setListFilters({
        search: newFilters.search,
        status: newFilters.status,
        bookingType: newFilters.bookingType,
        stylistId: newFilters.stylistId !== 'all' ? newFilters.stylistId : undefined,
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
      const reason = prompt(t('list.cancelReason'));
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

  // Calendar view handlers
  const handleAppointmentClick = useCallback(
    (appointmentId: string) => {
      openAppointmentDetails(appointmentId);
    },
    [openAppointmentDetails]
  );

  const handleSlotClick = useCallback(
    (stylistId: string, date: string, time: string) => {
      if (!canWrite) return;
      openNewAppointment({ stylistId, date, time });
    },
    [canWrite, openNewAppointment]
  );

  const handleAppointmentMove = useCallback(
    (appointmentId: string, newStylistId: string | undefined, newDate: string, newTime: string) => {
      if (newStylistId) {
        const stylist = calendarData?.stylists.find((s) => s.id === newStylistId);
        setConfirmMove({
          appointmentId,
          newStylistId,
          newDate,
          newTime,
          stylistName: stylist?.name,
        });
      } else {
        moveAppointment.mutate({
          appointmentId,
          newDate,
          newTime,
        });
      }
    },
    [calendarData?.stylists, moveAppointment]
  );

  const handleConfirmMove = useCallback(() => {
    if (!confirmMove) return;
    moveAppointment.mutate({
      appointmentId: confirmMove.appointmentId,
      newStylistId: confirmMove.newStylistId,
      newDate: confirmMove.newDate,
      newTime: confirmMove.newTime,
    });
    setConfirmMove(null);
  }, [confirmMove, moveAppointment]);

  const handleNewAppointment = useCallback(() => {
    openNewAppointment();
  }, [openNewAppointment]);

  const hasListFilters =
    listFilters.search !== '' ||
    listFilters.status !== 'all' ||
    listFilters.bookingType !== 'all' ||
    !!(listFilters.stylistId && listFilters.stylistId !== 'all');
  const hasCalendarFilters =
    calendarFilters.stylistIds.length > 0 || calendarFilters.statuses.length > 0;

  const appointments = appointmentsData?.data || [];
  const meta = appointmentsData?.meta;

  // Don't render until view preference is loaded
  if (!viewLoaded) {
    return null;
  }

  return (
    <PermissionGuard permission={PERMISSIONS.APPOINTMENTS_READ} fallback={<AccessDenied />}>
      <PageContainer className={viewMode === 'calendar' ? 'h-[calc(100vh-4rem)]' : ''}>
        <PageHeader
          title={t('list.title')}
          description={t('list.description')}
          actions={
            <div className="flex items-center gap-2">
              {/* Badge Counters */}
              <div className="flex items-center gap-1.5 mr-2">
                {/* Walk-in Queue Badge */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => router.push('/walk-in')}
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Walk-in</span>
                </Button>

                {/* Unassigned Badge */}
                {unassignedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => openUnassignedAppointments()}
                  >
                    <UserX className="h-4 w-4" />
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {unassignedCount}
                    </Badge>
                  </Button>
                )}

                {/* Waitlist Badge */}
                {waitlistCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => router.push('/waitlist')}
                  >
                    <ClipboardList className="h-4 w-4" />
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {waitlistCount}
                    </Badge>
                  </Button>
                )}
              </div>

              {/* View Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={handleViewChange}>
                <ToggleGroupItem value="calendar" aria-label="Calendar view">
                  <Calendar className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* New Appointment button - only show in list view (calendar has its own) */}
              {canWrite && (
                <Button onClick={handleNewAppointment}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('list.newAppointment')}
                </Button>
              )}
            </div>
          }
        />

        <PageContent className={viewMode === 'calendar' ? 'flex-1 overflow-hidden p-0' : ''}>
          {viewMode === 'calendar' ? (
            // Calendar View
            isMobile ? (
              <MobileCalendar
                data={calendarData}
                isLoading={isLoadingCalendar}
                onAppointmentClick={handleAppointmentClick}
                onSlotClick={handleSlotClick}
              />
            ) : (
              <ResourceCalendar
                data={calendarData}
                isLoading={isLoadingCalendar}
                onAppointmentClick={handleAppointmentClick}
                onSlotClick={handleSlotClick}
                onAppointmentMove={handleAppointmentMove}
                onFilterClick={() => setFilterOpen(true)}
                hasActiveFilters={hasCalendarFilters}
              />
            )
          ) : (
            // List View
            <>
              <AppointmentFilters filters={filters} onFiltersChange={handleFiltersChange} />
              <AppointmentTable
                data={appointments}
                meta={meta}
                isLoading={isLoadingList}
                canWrite={canWrite}
                page={listPage}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onView={handleView}
                onCheckIn={handleCheckIn}
                onStart={handleStart}
                onComplete={handleComplete}
                onCancel={handleCancel}
                onNoShow={handleNoShow}
                onCheckout={handleCheckout}
                hasFilters={hasListFilters}
              />
            </>
          )}
        </PageContent>

        {/* Calendar Filter Panel */}
        <CalendarFilters
          open={filterOpen}
          onOpenChange={setFilterOpen}
          stylists={calendarData?.stylists || []}
        />

        {/* No-Show Confirmation Dialog */}
        <ConfirmDialog
          open={!!noShowId}
          onOpenChange={(open) => !open && setNoShowId(null)}
          title={t('list.confirmNoShowTitle')}
          description={t('list.confirmNoShowDescription')}
          variant="destructive"
          onConfirm={confirmNoShow}
          isLoading={markNoShow.isPending}
        />

        {/* Confirm Stylist Change Dialog */}
        <ConfirmDialog
          open={!!confirmMove}
          onOpenChange={(open) => !open && setConfirmMove(null)}
          title="Change Stylist"
          description={`Are you sure you want to reassign this appointment to ${confirmMove?.stylistName || 'another stylist'}?`}
          confirmText="Reassign"
          onConfirm={handleConfirmMove}
          isLoading={moveAppointment.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
