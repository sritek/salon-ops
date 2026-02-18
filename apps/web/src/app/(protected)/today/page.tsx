'use client';

/**
 * Today Page - Role-Based Dashboard
 * Based on: .kiro/specs/today-page-fixes/design.md
 *
 * Renders different dashboard views based on user role:
 * - Owner/Regional Manager: Revenue metrics, appointment stats, inventory alerts
 * - Branch Manager: Branch-scoped metrics with staff attendance
 * - Receptionist/Stylist: Operational view with timeline and queue
 * - Accountant: Billing metrics and financial summary
 */

import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Plus, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PageContainer, PageContent } from '@/components/common';
import { QuickStats } from '@/components/ux/command-center';
import { useCommandCenter } from '@/hooks/queries/use-command-center';
import { useSlideOver } from '@/components/ux/slide-over';
import { PANEL_IDS } from '@/components/ux/slide-over/slide-over-registry';
import { cn } from '@/lib/utils';
import type { AttentionItem } from '@/types/dashboard';
import { useAuthStore } from '@/stores';

// Role-based dashboard components
import { OperationalDashboard } from './components/operational-dashboard';
import { OwnerDashboard } from './components/owner-dashboard';
import { BranchManagerDashboard } from './components/branch-manager-dashboard';
import { AccountantDashboard } from './components/accountant-dashboard';
import { getRoleDashboardType, type DashboardRole } from './utils/get-dashboard-type';

// ============================================
// Welcome Header
// ============================================

function WelcomeHeader() {
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
      </h1>
      <p className="text-muted-foreground">
        {format(currentTime, 'EEEE, MMMM d')} • {format(currentTime, 'h:mm a')}
      </p>
    </div>
  );
}

// ============================================
// Role-Based Dashboard Renderer
// ============================================

interface RoleDashboardProps {
  dashboardType: DashboardRole;
  branchId: string;
  commandCenterData: ReturnType<typeof useCommandCenter>['data'];
  isLoading: boolean;
  currentTime: Date;
  onTimelineSlotClick: (stylistId: string, time: string) => void;
  onAppointmentClick: (id: string) => void;
  onCheckIn: (id: string) => void;
  onCallWalkIn: (id: string) => void;
  onAttentionItemClick: (item: AttentionItem) => void;
  onDismissAttention: (id: string) => void;
}

function RoleDashboard({
  dashboardType,
  branchId,
  commandCenterData,
  isLoading,
  currentTime,
  onTimelineSlotClick,
  onAppointmentClick,
  onCheckIn,
  onCallWalkIn,
  onAttentionItemClick,
  onDismissAttention,
}: RoleDashboardProps) {
  switch (dashboardType) {
    case 'owner':
      return <OwnerDashboard branchId={branchId} />;
    case 'manager':
      return <BranchManagerDashboard branchId={branchId} />;
    case 'accountant':
      return <AccountantDashboard branchId={branchId} />;
    case 'operational':
    default:
      return (
        <OperationalDashboard
          data={commandCenterData}
          isLoading={isLoading}
          currentTime={currentTime}
          onTimelineSlotClick={onTimelineSlotClick}
          onAppointmentClick={onAppointmentClick}
          onCheckIn={onCheckIn}
          onCallWalkIn={onCallWalkIn}
          onAttentionItemClick={onAttentionItemClick}
          onDismissAttention={onDismissAttention}
        />
      );
  }
}

// ============================================
// Main Today Page
// ============================================

export default function TodayPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { openPanel } = useSlideOver();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get the first branch ID from user's assigned branches
  const branchId = user?.branchIds?.[0] || '';
  const userRole = user?.role || 'receptionist';
  const dashboardType = getRoleDashboardType(userRole);

  // Only fetch command center data for operational dashboard
  const { data, isLoading, refetch, isRefetching } = useCommandCenter({
    branchId,
    enabled: !!branchId && dashboardType === 'operational',
  });

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Quick action handlers
  const handleNewAppointment = useCallback(() => {
    openPanel(PANEL_IDS.NEW_APPOINTMENT, {}, { title: 'New Appointment', width: 'wide' });
  }, [openPanel]);

  const handleWalkIn = useCallback(() => {
    openPanel(
      PANEL_IDS.NEW_APPOINTMENT,
      { bookingType: 'walk_in' },
      { title: 'Walk-in Customer', width: 'wide' }
    );
  }, [openPanel]);

  const handleNewCustomer = useCallback(() => {
    router.push('/customers/new');
  }, [router]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Appointment click handler
  const handleAppointmentClick = useCallback(
    (id: string) => {
      openPanel(
        PANEL_IDS.APPOINTMENT_DETAILS,
        { appointmentId: id },
        { title: 'Appointment Details', width: 'medium' }
      );
    },
    [openPanel]
  );

  const handleCheckIn = useCallback((id: string) => {
    // TODO: Implement check-in mutation
    console.log('Check in:', id);
  }, []);

  const handleCallWalkIn = useCallback((id: string) => {
    // TODO: Implement call walk-in mutation
    console.log('Call walk-in:', id);
  }, []);

  // Attention item click handler
  const handleAttentionItemClick = useCallback(
    (item: AttentionItem) => {
      switch (item.entityType) {
        case 'appointment':
          openPanel(
            PANEL_IDS.APPOINTMENT_DETAILS,
            { appointmentId: item.entityId },
            { title: 'Appointment Details', width: 'medium' }
          );
          break;
        case 'customer':
          openPanel(
            PANEL_IDS.CUSTOMER_PEEK,
            { customerId: item.entityId },
            { title: 'Customer Details', width: 'medium' }
          );
          break;
        case 'inventory':
          router.push(`/inventory/products/${item.entityId}`);
          break;
        case 'expense':
          router.push(`/expenses/${item.entityId}`);
          break;
      }
    },
    [openPanel, router]
  );

  const handleDismissAttention = useCallback((id: string) => {
    // TODO: Implement dismiss mutation
    console.log('Dismiss attention item:', id);
  }, []);

  // Timeline slot click handler
  const handleTimelineSlotClick = useCallback(
    (stylistId: string, time: string) => {
      openPanel(
        PANEL_IDS.NEW_APPOINTMENT,
        { stylistId, time, date: format(currentTime, 'yyyy-MM-dd') },
        { title: 'New Appointment', width: 'wide' }
      );
    },
    [openPanel, currentTime]
  );

  // Show quick stats only for operational dashboard
  const showQuickStats = dashboardType === 'operational';
  // Show action buttons based on role
  const showOperationalActions = ['operational', 'manager'].includes(dashboardType);

  return (
    <PageContainer>
      <PageContent className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <WelcomeHeader />
          <div className="flex flex-wrap items-center gap-2">
            {dashboardType === 'operational' && (
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefetching}>
                <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
                Refresh
              </Button>
            )}
            {showOperationalActions && (
              <>
                <Button variant="outline" size="sm" onClick={handleNewCustomer}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Customer
                </Button>
                <Button variant="outline" onClick={handleWalkIn}>
                  <Plus className="h-4 w-4 mr-2" />
                  Walk-in
                </Button>
                <Button onClick={handleNewAppointment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats - only for operational dashboard */}
        {showQuickStats && <QuickStats stats={data?.stats || null} isLoading={isLoading} />}

        {/* Role-Based Dashboard Content */}
        <RoleDashboard
          dashboardType={dashboardType}
          branchId={branchId}
          commandCenterData={data}
          isLoading={isLoading}
          currentTime={currentTime}
          onTimelineSlotClick={handleTimelineSlotClick}
          onAppointmentClick={handleAppointmentClick}
          onCheckIn={handleCheckIn}
          onCallWalkIn={handleCallWalkIn}
          onAttentionItemClick={handleAttentionItemClick}
          onDismissAttention={handleDismissAttention}
        />
      </PageContent>
    </PageContainer>
  );
}
