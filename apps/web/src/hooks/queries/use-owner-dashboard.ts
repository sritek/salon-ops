/**
 * Owner Dashboard Hook
 * Fetches owner/manager dashboard data from API
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface OwnerDashboardData {
  revenue: {
    today: number;
    yesterday: number;
    lastWeekSameDay: number;
    percentChangeVsYesterday: number;
    percentChangeVsLastWeek: number;
  };
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShows: number;
    inProgress: number;
    upcoming: number;
  };
  inventory: {
    lowStockCount: number;
    expiringCount: number;
  };
  staff: {
    presentToday: number;
    totalActive: number;
    onLeave: number;
  };
}

interface UseOwnerDashboardOptions {
  branchId?: string;
  enabled?: boolean;
}

async function fetchOwnerDashboard(branchId?: string): Promise<OwnerDashboardData> {
  const params = new URLSearchParams();
  if (branchId) {
    params.set('branchId', branchId);
  }

  const queryString = params.toString();
  const url = queryString ? `/dashboard/owner?${queryString}` : '/dashboard/owner';

  // api.get already extracts the data from { success, data } response
  return api.get<OwnerDashboardData>(url);
}

export function useOwnerDashboard({ branchId, enabled = true }: UseOwnerDashboardOptions = {}) {
  return useQuery({
    queryKey: ['owner-dashboard', branchId],
    queryFn: () => fetchOwnerDashboard(branchId),
    enabled,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}
