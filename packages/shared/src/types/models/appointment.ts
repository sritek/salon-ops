/**
 * Appointment Types
 * Based on: .cursor/rules/02-appointments.mdc
 */

export interface Appointment {
  id: string;
  tenantId: string;
  branchId: string;
  customerId: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: AppointmentStatus;
  source: AppointmentSource;
  totalAmount: number;
  notes?: string;
  internalNotes?: string;
  cancelReason?: string;
  noShowReason?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type AppointmentSource = 'walk_in' | 'phone' | 'online' | 'app';

export interface AppointmentService {
  id: string;
  appointmentId: string;
  serviceId: string;
  variantId?: string;
  stylistId?: string;
  price: number;
  discountAmount: number;
  finalPrice: number;
  duration: number;
  status: AppointmentServiceStatus;
  startTime?: string;
  endTime?: string;
}

export type AppointmentServiceStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface AppointmentWithRelations extends Appointment {
  customer?: import('./customer').Customer;
  branch?: import('./tenant').Branch;
  services?: AppointmentService[];
  createdByUser?: import('./user').User;
}
