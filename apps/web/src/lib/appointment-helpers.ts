/**
 * Appointment Helper Functions
 */

import { isToday, parseISO } from 'date-fns';
import type { StationAppointment } from '@/types/stations';

/**
 * Check if an appointment is pending (from a previous day, still in_progress)
 */
export function isPendingAppointment(appointment: StationAppointment | null): boolean {
  if (!appointment) return false;

  try {
    const appointmentDate = parseISO(appointment.scheduledDate);
    return !isToday(appointmentDate);
  } catch {
    return false;
  }
}

/**
 * Check if an appointment is current (today and in_progress)
 */
export function isCurrentAppointment(appointment: StationAppointment | null): boolean {
  if (!appointment) return false;

  try {
    const appointmentDate = parseISO(appointment.scheduledDate);
    return isToday(appointmentDate);
  } catch {
    return false;
  }
}

/**
 * Get a human-readable label for appointment status
 */
export function getAppointmentStatusLabel(appointment: StationAppointment | null): string {
  if (!appointment) return '';

  if (isPendingAppointment(appointment)) {
    return `Pending from ${appointment.scheduledDate}`;
  }

  return 'In Progress';
}
