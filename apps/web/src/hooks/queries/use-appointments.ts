/**
 * Appointment Hooks
 * React Query hooks for appointment management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type {
  Appointment,
  AppointmentFilters,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  CancelAppointmentInput,
  RescheduleAppointmentInput,
  CreateAppointmentResponse,
  RescheduleResponse,
  AvailableSlotsFilters,
  AvailableSlotsResponse,
  AvailableStylistsFilters,
  AvailableStylist,
  CalendarFilters,
  CalendarResponse,
  QueueFilters,
  QueueResponse,
  AddToQueueInput,
  AddToQueueResponse,
  WalkInQueueEntry,
  StylistScheduleFilters,
  StylistScheduleResponse,
  StylistBreak,
  StylistBlockedSlot,
  CreateStylistBreakInput,
  CreateBlockedSlotInput,
} from '@/types/appointments';

// ============================================
// Query Keys
// ============================================

export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: AppointmentFilters) => [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  calendar: (filters: CalendarFilters) => [...appointmentKeys.all, 'calendar', filters] as const,
};

export const availabilityKeys = {
  all: ['availability'] as const,
  slots: (filters: AvailableSlotsFilters) => [...availabilityKeys.all, 'slots', filters] as const,
  stylists: (filters: AvailableStylistsFilters) =>
    [...availabilityKeys.all, 'stylists', filters] as const,
};

export const queueKeys = {
  all: ['walkInQueue'] as const,
  list: (filters: QueueFilters) => [...queueKeys.all, 'list', filters] as const,
};

export const stylistScheduleKeys = {
  all: ['stylistSchedule'] as const,
  detail: (stylistId: string, filters: StylistScheduleFilters) =>
    [...stylistScheduleKeys.all, stylistId, filters] as const,
};

// ============================================
// Appointment CRUD Hooks
// ============================================

/**
 * Get appointments with pagination and filtering
 */
export function useAppointments(filters: AppointmentFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: () =>
      api.getPaginated<Appointment>('/appointments', filters as Record<string, unknown>),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get single appointment by ID
 */
export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => api.get<Appointment>(`/appointments/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new appointment
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentInput) =>
      api.post<CreateAppointmentResponse>('/appointments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/**
 * Update an appointment
 */
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentInput }) =>
      api.patch<Appointment>(`/appointments/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
    },
  });
}

// ============================================
// Appointment Action Hooks
// ============================================

/**
 * Check in customer for appointment
 */
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Appointment>(`/appointments/${id}/check-in`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
    },
  });
}

/**
 * Start appointment service
 */
export function useStartAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Appointment>(`/appointments/${id}/start`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
    },
  });
}

/**
 * Complete appointment
 */
export function useCompleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Appointment>(`/appointments/${id}/complete`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
    },
  });
}

/**
 * Cancel appointment
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelAppointmentInput }) =>
      api.post<Appointment>(`/appointments/${id}/cancel`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
    },
  });
}

/**
 * Mark appointment as no-show
 */
export function useMarkNoShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Appointment>(`/appointments/${id}/no-show`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
    },
  });
}

/**
 * Update appointment status (generic status change)
 */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Appointment>(`/appointments/${id}/status`, { status }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/**
 * Reschedule appointment
 */
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RescheduleAppointmentInput }) =>
      api.post<RescheduleResponse>(`/appointments/${id}/reschedule`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

// ============================================
// Availability Hooks
// ============================================

/**
 * Get available time slots for a date
 */
export function useAvailableSlots(filters: AvailableSlotsFilters) {
  return useQuery({
    queryKey: availabilityKeys.slots(filters),
    queryFn: () =>
      api.get<AvailableSlotsResponse>('/appointments/availability/slots', {
        branchId: filters.branchId,
        date: filters.date,
        serviceIds: filters.serviceIds.join(','),
        stylistId: filters.stylistId,
        genderPreference: filters.genderPreference,
      }),
    enabled: !!filters.branchId && !!filters.date && filters.serviceIds.length > 0,
  });
}

/**
 * Get available stylists for a time slot
 */
export function useAvailableStylists(filters: AvailableStylistsFilters) {
  return useQuery({
    queryKey: availabilityKeys.stylists(filters),
    queryFn: () =>
      api.get<AvailableStylist[]>('/appointments/availability/stylists', {
        branchId: filters.branchId,
        date: filters.date,
        time: filters.time,
        duration: filters.duration,
        genderPreference: filters.genderPreference,
      }),
    enabled: !!filters.branchId && !!filters.date && !!filters.time && !!filters.duration,
  });
}

// ============================================
// Calendar Hooks
// ============================================

/**
 * Get calendar view
 */
export function useCalendar(filters: CalendarFilters) {
  return useQuery({
    queryKey: appointmentKeys.calendar(filters),
    queryFn: () =>
      api.get<CalendarResponse>('/appointments/calendar', {
        branchId: filters.branchId,
        view: filters.view,
        date: filters.date,
        stylistId: filters.stylistId,
      }),
    enabled: !!filters.branchId && !!filters.date,
  });
}

// ============================================
// Walk-in Queue Hooks
// ============================================

/**
 * Get walk-in queue
 */
export function useWalkInQueue(filters: QueueFilters) {
  return useQuery({
    queryKey: queueKeys.list(filters),
    queryFn: () =>
      api.get<QueueResponse>('/appointments/walk-in/queue', {
        branchId: filters.branchId,
        date: filters.date,
      }),
    enabled: !!filters.branchId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Add customer to walk-in queue
 */
export function useAddToQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddToQueueInput) =>
      api.post<AddToQueueResponse>('/appointments/walk-in/queue', data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({
        queryKey: queueKeys.list({ branchId: data.branchId }),
      });
    },
  });
}

/**
 * Call customer from queue
 */
export function useCallCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<WalkInQueueEntry>(`/appointments/walk-in/queue/${id}/call`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Start serving customer from queue
 */
export function useStartServing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stylistId }: { id: string; stylistId: string }) =>
      api.patch<{ queueEntry: WalkInQueueEntry; appointment: Appointment }>(
        `/appointments/walk-in/queue/${id}/serve`,
        { stylistId }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

/**
 * Mark queue entry as complete
 */
export function useCompleteQueueEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<WalkInQueueEntry>(`/appointments/walk-in/queue/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Mark customer as left from queue
 */
export function useMarkLeft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<WalkInQueueEntry>(`/appointments/walk-in/queue/${id}/left`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

// ============================================
// Stylist Schedule Hooks
// ============================================

/**
 * Get stylist schedule
 */
export function useStylistSchedule(stylistId: string, filters: StylistScheduleFilters) {
  return useQuery({
    queryKey: stylistScheduleKeys.detail(stylistId, filters),
    queryFn: () =>
      api.get<StylistScheduleResponse>(`/appointments/stylists/${stylistId}/schedule`, {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    enabled: !!stylistId && !!filters.dateFrom && !!filters.dateTo,
  });
}

/**
 * Create stylist break
 */
export function useCreateBreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stylistId, data }: { stylistId: string; data: CreateStylistBreakInput }) =>
      api.post<StylistBreak>(`/appointments/stylists/${stylistId}/breaks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stylistScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

/**
 * Delete stylist break
 */
export function useDeleteBreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stylistId, breakId }: { stylistId: string; breakId: string }) =>
      api.delete<{ message: string }>(`/appointments/stylists/${stylistId}/breaks/${breakId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stylistScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

/**
 * Create blocked slot
 */
export function useCreateBlockedSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stylistId, data }: { stylistId: string; data: CreateBlockedSlotInput }) =>
      api.post<StylistBlockedSlot>(`/appointments/stylists/${stylistId}/blocked-slots`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stylistScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

/**
 * Delete blocked slot
 */
export function useDeleteBlockedSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stylistId, slotId }: { stylistId: string; slotId: string }) =>
      api.delete<{ message: string }>(
        `/appointments/stylists/${stylistId}/blocked-slots/${slotId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stylistScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

// ============================================
// Unassigned Appointments Hooks
// ============================================

export const unassignedKeys = {
  all: ['unassignedAppointments'] as const,
  list: (branchId: string, date?: string) =>
    [...unassignedKeys.all, 'list', branchId, date] as const,
  count: (branchId: string) => [...unassignedKeys.all, 'count', branchId] as const,
};

/**
 * Get unassigned appointments for a branch
 */
export function useUnassignedAppointments(branchId: string, date?: string) {
  return useQuery({
    queryKey: unassignedKeys.list(branchId, date),
    queryFn: () =>
      api.get<Appointment[]>('/appointments/unassigned', {
        branchId,
        date,
      }),
    enabled: !!branchId,
  });
}

/**
 * Get count of unassigned appointments for today
 */
export function useUnassignedCount(branchId: string) {
  return useQuery({
    queryKey: unassignedKeys.count(branchId),
    queryFn: () => api.get<{ count: number }>('/appointments/unassigned/count', { branchId }),
    enabled: !!branchId,
  });
}

/**
 * Assign stylist to an unassigned appointment
 */
export function useAssignStylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stylistId }: { id: string; stylistId: string }) =>
      api.post<Appointment>(`/appointments/${id}/assign`, { stylistId }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: unassignedKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}
