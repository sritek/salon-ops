/**
 * My Schedule Hooks
 * TanStack Query hooks for stylist's personal schedule view
 * Requirements: 7.6
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

export interface MyScheduleAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  services: string[];
  status: string;
  totalAmount: number;
  notes?: string;
  customerPreferences?: string;
  customerHistory?: {
    totalVisits: number;
    lastVisit: string;
    favoriteServices: string[];
  };
}

export interface MyScheduleData {
  appointments: MyScheduleAppointment[];
  breaks: {
    start: string;
    end: string;
    name: string;
  }[];
  workingHours: {
    start: string;
    end: string;
  };
}

export interface MyStylistStats {
  todayAppointments: number;
  todayRevenue: number;
  weeklyAppointments: number;
  weeklyRevenue: number;
  averageRating: number;
  tipsToday: number;
}

/**
 * Fetch the logged-in stylist's schedule for a specific date
 */
export function useMySchedule(date: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['my-schedule', date, user?.id],
    queryFn: async () => {
      // api.get already extracts the data from { success, data } response
      return api.get<MyScheduleData>(`/appointments/my-schedule?date=${date}`);
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Fetch the logged-in stylist's performance stats
 */
export function useMyStylistStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['my-stylist-stats', user?.id],
    queryFn: async () => {
      // api.get already extracts the data from { success, data } response
      return api.get<MyStylistStats>('/staff/my-stats');
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch upcoming appointments for the next client card
 */
export function useNextClient() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['next-client', user?.id],
    queryFn: async () => {
      // api.get already extracts the data from { success, data } response
      return api.get<MyScheduleAppointment | null>('/appointments/next-client');
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}
