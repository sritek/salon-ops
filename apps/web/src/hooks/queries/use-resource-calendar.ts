/**
 * Resource Calendar Hook
 * TanStack Query hook for fetching resource calendar data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

// =====================================================
// TYPES
// =====================================================

export interface CalendarStylist {
  id: string;
  name: string;
  avatar: string | null;
  color: string;
  isAvailable: boolean;
  workingHours: { start: string; end: string } | null;
  breaks: Array<{
    id: string;
    start: string;
    end: string;
    name: string;
  }>;
  blockedSlots: Array<{
    id: string;
    start: string;
    end: string;
    reason: string | null;
    isFullDay: boolean;
  }>;
}

export interface CalendarAppointment {
  id: string;
  stylistId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string | null;
  services: string[];
  status: string;
  bookingType: string;
  totalAmount: number;
  hasConflict: boolean;
}

export interface ResourceCalendarData {
  date: string;
  view: 'day' | 'week';
  stylists: CalendarStylist[];
  appointments: CalendarAppointment[];
  workingHours: { start: string; end: string };
}

export interface ResourceCalendarParams {
  branchId: string;
  date: string;
  view?: 'day' | 'week';
}

export interface MoveAppointmentParams {
  appointmentId: string;
  newStylistId?: string;
  newDate: string;
  newTime: string;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const resourceCalendarKeys = {
  all: ['resource-calendar'] as const,
  list: (params: ResourceCalendarParams) => [...resourceCalendarKeys.all, params] as const,
};

// =====================================================
// HOOKS
// =====================================================

/**
 * Fetch resource calendar data
 */
export function useResourceCalendar(
  params: ResourceCalendarParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: resourceCalendarKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        branchId: params.branchId,
        date: params.date,
        view: params.view || 'day',
      });
      // api.get already extracts the data from { success, data } response
      return api.get<ResourceCalendarData>(`/calendar/resources?${searchParams.toString()}`);
    },
    enabled: (options?.enabled ?? true) && !!params.branchId && !!params.date,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Move appointment (drag-drop)
 */
export function useMoveAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MoveAppointmentParams) => {
      const { appointmentId, ...body } = params;
      // api.patch already extracts the data from { success, data } response
      return api.patch<unknown>(`/calendar/appointments/${appointmentId}/move`, body);
    },
    onSuccess: () => {
      // Invalidate calendar queries to refetch
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
      // Also invalidate appointments queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment moved successfully');
    },
    onError: (error: Error & { response?: { data?: { error?: { message?: string } } } }) => {
      const message = error?.response?.data?.error?.message || 'Failed to move appointment';
      toast.error(message);
    },
  });
}
