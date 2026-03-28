'use client';

/**
 * Today Page - Role-Based Dashboard
 *
 * Renders different dashboard views based on user role:
 * - Owner/Regional Manager: Revenue metrics, appointment stats, inventory alerts
 * - Branch Manager: Branch-scoped metrics with staff attendance
 * - Receptionist/Stylist: Clean greeting view
 * - Accountant: Billing metrics and financial summary
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { PageContainer, PageContent } from '@/components/common';
import { useAuthStore } from '@/stores';
import { useBranchContext } from '@/hooks/use-branch-context';

// Role-based dashboard components
import { OwnerDashboard, OwnerDashboardViewToggle } from './components/owner-dashboard';
import { BranchManagerDashboard } from './components/branch-manager-dashboard';
import { AccountantDashboard } from './components/accountant-dashboard';
import { StylistDashboard } from './components/stylist-dashboard';
import { getRoleDashboardType } from './utils/get-dashboard-type';

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
// Main Today Page
// ============================================

export default function TodayPage() {
  const { user } = useAuthStore();
  const { branchId } = useBranchContext();

  const userRole = user?.role || 'receptionist';
  const dashboardType = getRoleDashboardType(userRole);

  return (
    <PageContainer>
      <PageContent className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <WelcomeHeader />
          {dashboardType === 'owner' && <OwnerDashboardViewToggle />}
        </div>

        {/* Role-Based Dashboard Content */}
        {dashboardType === 'owner' && <OwnerDashboard branchId={branchId || ''} />}
        {dashboardType === 'manager' && <BranchManagerDashboard branchId={branchId || ''} />}
        {dashboardType === 'accountant' && <AccountantDashboard branchId={branchId || ''} />}
        {dashboardType === 'operational' && <StylistDashboard />}
      </PageContent>
    </PageContainer>
  );
}
