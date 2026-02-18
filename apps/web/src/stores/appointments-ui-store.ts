/**
 * Appointments UI Store
 * Persists view state across navigation (date, view type, filters)
 *
 * UX Strategy:
 * - Date resets to "today" on sidebar navigation (fresh start)
 * - View preference (list/calendar, day/week/month) persists (user preference)
 * - Status/type filters reset on sidebar navigation
 * - Full state preserved for "back" navigation (within appointments flow)
 */

import { format } from 'date-fns';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CalendarView = 'day' | 'week' | 'month';

export interface AppointmentFiltersState {
  search: string;
  status: string;
  bookingType: string;
  stylistId?: string;
}

interface AppointmentsUIState {
  // Shared date (used by both list and calendar)
  currentDate: string; // yyyy-MM-dd format string for serialization

  // Calendar specific
  calendarView: CalendarView;

  // List specific filters
  listFilters: AppointmentFiltersState;
  listPage: number;
  listLimit: number;

  // Actions
  setCurrentDate: (date: Date | string) => void;
  setCalendarView: (view: CalendarView) => void;
  setListFilters: (filters: Partial<AppointmentFiltersState>) => void;
  setListPage: (page: number) => void;
  setListLimit: (limit: number) => void;
  resetFilters: () => void;
  /** Reset to today's date and clear filters - called on sidebar navigation */
  resetToToday: () => void;
}

const defaultFilters: AppointmentFiltersState = {
  search: '',
  status: 'all',
  bookingType: 'all',
};

/**
 * Format date to yyyy-MM-dd string in local timezone
 * Using date-fns format instead of toISOString to avoid UTC conversion issues
 */
const formatDateString = (date: Date): string => format(date, 'yyyy-MM-dd');

export const useAppointmentsUIStore = create<AppointmentsUIState>()(
  persist(
    (set) => ({
      // Initial state
      currentDate: formatDateString(new Date()),
      calendarView: 'week',
      listFilters: defaultFilters,
      listPage: 1,
      listLimit: 20,

      // Actions
      setCurrentDate: (date) =>
        set({
          currentDate: typeof date === 'string' ? date : formatDateString(date),
        }),

      setCalendarView: (view) => set({ calendarView: view }),

      setListFilters: (filters) =>
        set((state) => ({
          listFilters: { ...state.listFilters, ...filters },
          listPage: 1, // Reset page when filters change
        })),

      setListPage: (page) => set({ listPage: page }),

      setListLimit: (limit) => set({ listLimit: limit }),

      resetFilters: () =>
        set({
          listFilters: defaultFilters,
          listPage: 1,
        }),

      resetToToday: () =>
        set({
          currentDate: formatDateString(new Date()),
          listFilters: defaultFilters,
          listPage: 1,
          // Note: calendarView and listLimit are preserved as they're user preferences
        }),
    }),
    {
      name: 'appointments-ui-storage',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for session-only persistence
      partialize: (state) => ({
        // Only persist view preference, not filters or date
        calendarView: state.calendarView,
      }),
    }
  )
);
