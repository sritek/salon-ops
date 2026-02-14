// =====================================================
// ENUMS
// =====================================================

export enum AppointmentStatus {
  BOOKED = 'booked',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

export enum BookingType {
  ONLINE = 'online',
  PHONE = 'phone',
  WALK_IN = 'walk_in',
}

export enum GenderPreference {
  MALE = 'male',
  FEMALE = 'female',
  ANY = 'any',
}

export enum ServiceStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum QueueStatus {
  WAITING = 'waiting',
  CALLED = 'called',
  SERVING = 'serving',
  COMPLETED = 'completed',
  LEFT = 'left',
}

export enum PrepaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

// =====================================================
// CORE TYPES
// =====================================================

export interface Appointment {
  id: string;
  tenantId: string;
  branchId: string;

  // Customer
  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  // Scheduling
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  endTime: string;
  totalDuration: number;

  // Stylist
  stylistId?: string;
  stylistGenderPreference?: GenderPreference;

  // Type & Source
  bookingType: BookingType;
  bookingSource?: string;

  // Status
  status: AppointmentStatus;

  // Walk-in
  tokenNumber?: number;

  // Pricing
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  priceLockedAt?: string;

  // Prepayment
  prepaymentRequired: boolean;
  prepaymentAmount: number;
  prepaymentStatus?: PrepaymentStatus;
  paymentId?: string;

  // Rescheduling
  rescheduleCount: number;
  originalAppointmentId?: string;
  rescheduledToId?: string;

  // Cancellation
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  isSalonCancelled: boolean;

  // Notes
  customerNotes?: string;
  internalNotes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;

  // Relations (populated)
  services?: AppointmentServiceItem[];
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  stylist?: {
    id: string;
    name: string;
    gender?: string;
  };
  branch?: {
    id: string;
    name: string;
  };
  statusHistory?: AppointmentStatusHistory[];
}

export interface AppointmentServiceItem {
  id: string;
  tenantId: string;
  appointmentId: string;

  serviceId: string;
  serviceName: string;
  serviceSku?: string;

  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;

  durationMinutes: number;
  activeTimeMinutes: number;
  processingTimeMinutes: number;

  stylistId?: string;
  assistantId?: string;

  status: ServiceStatus;
  startedAt?: string;
  completedAt?: string;

  commissionRate?: number;
  commissionAmount?: number;

  createdAt: string;
}

export interface AppointmentStatusHistory {
  id: string;
  tenantId: string;
  appointmentId: string;
  fromStatus?: AppointmentStatus;
  toStatus: AppointmentStatus;
  changedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface StylistBreak {
  id: string;
  tenantId: string;
  branchId: string;
  stylistId: string;
  name: string;
  dayOfWeek?: number; // 0-6, null for all days
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface StylistBlockedSlot {
  id: string;
  tenantId: string;
  branchId: string;
  stylistId: string;
  blockedDate: string;
  startTime?: string; // null for full day
  endTime?: string;
  isFullDay: boolean;
  reason?: string;
  createdAt: string;
  createdBy?: string;
}

export interface WalkInQueueEntry {
  id: string;
  tenantId: string;
  branchId: string;
  queueDate: string;
  tokenNumber: number;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  serviceIds: string[];
  stylistPreferenceId?: string;
  genderPreference?: GenderPreference;
  status: QueueStatus;
  position: number;
  estimatedWaitMinutes?: number;
  calledAt?: string;
  appointmentId?: string;
  createdAt: string;
}

// =====================================================
// CALENDAR TYPES
// =====================================================

export interface CalendarAppointment {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  customerName: string;
  customerPhone?: string;
  stylistId?: string;
  stylistName?: string;
  services: string[];
  status: AppointmentStatus;
  bookingType: BookingType;
  totalAmount: number;
  tokenNumber?: number;
}

export interface CalendarView {
  view: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  appointments: CalendarAppointment[];
  summary: {
    total: number;
    byStatus: Record<AppointmentStatus, number>;
  };
}

export interface DaySummary {
  date: string;
  total: number;
  byStatus: Record<AppointmentStatus, number>;
}

// =====================================================
// AVAILABILITY TYPES
// =====================================================

export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
  stylistId?: string;
  stylistName?: string;
}

export interface AvailableSlotsResponse {
  date: string;
  slots: TimeSlot[];
  nextAvailableDate?: string;
}

export interface StylistAvailability {
  stylistId: string;
  stylistName: string;
  gender?: string;
  skillLevel?: string;
  isAvailable: boolean;
  nextAvailableTime?: string;
}

export interface StylistDaySchedule {
  stylistId: string;
  date: string;
  workingHours: {
    start: string;
    end: string;
  } | null;
  appointments: CalendarAppointment[];
  breaks: StylistBreak[];
  blockedSlots: StylistBlockedSlot[];
  availableSlots: TimeSlot[];
}

// =====================================================
// QUEUE TYPES
// =====================================================

export interface QueueStats {
  waiting: number;
  serving: number;
  completed: number;
  left: number;
  averageWaitTime: number;
}

export interface QueueDisplay {
  branchId: string;
  date: string;
  queue: WalkInQueueEntry[];
  stats: QueueStats;
  currentlyServing: {
    tokenNumber: number;
    stylistName: string;
  }[];
}

// =====================================================
// FILTER TYPES
// =====================================================

export interface AppointmentFilters {
  branchId?: string;
  stylistId?: string;
  customerId?: string;
  status?: AppointmentStatus | AppointmentStatus[];
  bookingType?: BookingType | BookingType[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
