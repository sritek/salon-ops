# Module 2: Appointment Management - Design Document

## Overview

This module handles the core appointment scheduling functionality including booking creation, calendar management, stylist availability, walk-in queue management, no-show policy enforcement, and appointment reminders.

**Related Requirements:** 2.1 - 2.15

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Customer     │       │   Appointment   │       │      User       │
│                 │──────<│                 │>──────│    (Stylist)    │
│                 │  1:N  │                 │  N:1  │                 │
└─────────────────┘       └────────┬────────┘       └─────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
          ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
          │ Appointment │  │ Appointment │  │ Appointment │
          │  Services   │  │    Notes    │  │   History   │
          └─────────────┘  └─────────────┘  └─────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Stylist_Break  │       │  Stylist_Block  │       │   Walk_In_Queue │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Database Schema

```sql
-- =====================================================
-- APPOINTMENTS
-- =====================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID NOT NULL REFERENCES branches(id),

  -- Customer (nullable for guest checkout)
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),

  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration INTEGER NOT NULL,  -- minutes

  -- Stylist
  stylist_id UUID REFERENCES users(id),
  stylist_gender_preference VARCHAR(10),  -- male, female, any

  -- Type & Source
  booking_type VARCHAR(20) NOT NULL DEFAULT 'walk_in',  -- online, phone, walk_in
  booking_source VARCHAR(50),  -- website, whatsapp, instagram

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'booked',
  -- booked, confirmed, checked_in, in_progress, completed, cancelled, no_show, rescheduled

  -- Walk-in specific
  token_number INTEGER,
  queue_position INTEGER,
  estimated_wait_minutes INTEGER,

  -- Pricing (locked at booking)
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_locked_at TIMESTAMP,

  -- Prepayment
  prepayment_required BOOLEAN DEFAULT false,
  prepayment_amount DECIMAL(10, 2) DEFAULT 0,
  prepayment_status VARCHAR(20),  -- pending, paid, refunded
  payment_id VARCHAR(100),

  -- Rescheduling
  reschedule_count INTEGER DEFAULT 0,
  original_appointment_id UUID REFERENCES appointments(id),
  rescheduled_to_id UUID REFERENCES appointments(id),

  -- Cancellation
  cancelled_at TIMESTAMP,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  is_salon_cancelled BOOLEAN DEFAULT false,

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT valid_status CHECK (
    status IN ('booked', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')
  ),
  CONSTRAINT valid_booking_type CHECK (
    booking_type IN ('online', 'phone', 'walk_in')
  )
);

CREATE INDEX idx_appointments_tenant_branch ON appointments(tenant_id, branch_id);
CREATE INDEX idx_appointments_date ON appointments(branch_id, scheduled_date, scheduled_time);
CREATE INDEX idx_appointments_stylist ON appointments(stylist_id, scheduled_date);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_status ON appointments(branch_id, status, scheduled_date);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON appointments
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

-- =====================================================
-- APPOINTMENT SERVICES (Line Items)
-- =====================================================
CREATE TABLE appointment_services (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

-- Service
service_id UUID NOT NULL REFERENCES services(id),
service_name VARCHAR(255) NOT NULL,
service_sku VARCHAR(50),

-- Pricing (locked at booking)
unit_price DECIMAL(10, 2) NOT NULL,
quantity INTEGER NOT NULL DEFAULT 1,
discount_amount DECIMAL(10, 2) DEFAULT 0,
tax_rate DECIMAL(5, 2) NOT NULL,
tax_amount DECIMAL(10, 2) NOT NULL,
total_amount DECIMAL(10, 2) NOT NULL,

-- Duration
duration_minutes INTEGER NOT NULL,
active_time_minutes INTEGER NOT NULL,
processing_time_minutes INTEGER DEFAULT 0,

-- Staff
stylist_id UUID REFERENCES users(id),
assistant_id UUID REFERENCES users(id),

-- Status
status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
started_at TIMESTAMP,
completed_at TIMESTAMP,

-- Commission (locked)
commission_rate DECIMAL(5, 2),
commission_amount DECIMAL(10, 2),

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointment_services ON appointment_services(appointment_id);

ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON appointment_services
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- APPOINTMENT STATUS HISTORY
-- =====================================================
CREATE TABLE appointment_status_history (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

from_status VARCHAR(20),
to_status VARCHAR(20) NOT NULL,
changed_by UUID REFERENCES users(id),
notes TEXT,

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointment_history ON appointment_status_history(appointment_id, created_at);

-- =====================================================
-- APPOINTMENT NOTES
-- =====================================================
CREATE TABLE appointment_notes (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

note_type VARCHAR(20) NOT NULL, -- customer_request, stylist_note, post_service, photo
content TEXT,
attachment_url VARCHAR(500),

created_by UUID REFERENCES users(id),
created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointment_notes ON appointment_notes(appointment_id);

-- =====================================================
-- STYLIST BREAKS (Recurring)
-- =====================================================
CREATE TABLE stylist_breaks (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
branch_id UUID NOT NULL REFERENCES branches(id),
stylist_id UUID NOT NULL REFERENCES users(id),

name VARCHAR(100) NOT NULL, -- Lunch, Tea Break
day_of_week INTEGER, -- 0-6 (Sunday-Saturday), NULL for all days
start_time TIME NOT NULL,
end_time TIME NOT NULL,

is_active BOOLEAN DEFAULT true,
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_stylist_breaks ON stylist_breaks(stylist_id, day_of_week);

ALTER TABLE stylist_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stylist_breaks
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- STYLIST BLOCKED SLOTS (One-time)
-- =====================================================
CREATE TABLE stylist_blocked_slots (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
branch_id UUID NOT NULL REFERENCES branches(id),
stylist_id UUID NOT NULL REFERENCES users(id),

blocked_date DATE NOT NULL,
start_time TIME, -- NULL for full day
end_time TIME,
reason VARCHAR(255),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_stylist_blocked ON stylist_blocked_slots(stylist_id, blocked_date);

ALTER TABLE stylist_blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stylist_blocked_slots
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- WALK-IN QUEUE
-- =====================================================
CREATE TABLE walk_in_queue (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
branch_id UUID NOT NULL REFERENCES branches(id),

queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
token_number INTEGER NOT NULL,

customer_id UUID REFERENCES customers(id),
customer_name VARCHAR(255) NOT NULL,
customer_phone VARCHAR(20),

service_ids UUID[],
stylist_preference_id UUID REFERENCES users(id),
gender_preference VARCHAR(10),

status VARCHAR(20) DEFAULT 'waiting', -- waiting, called, serving, completed, left
position INTEGER,
estimated_wait_minutes INTEGER,

called_at TIMESTAMP,
appointment_id UUID REFERENCES appointments(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(branch_id, queue_date, token_number)
);

CREATE INDEX idx_walk_in_queue ON walk_in_queue(branch_id, queue_date, status);

ALTER TABLE walk_in_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON walk_in_queue
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- APPOINTMENT REMINDERS
-- =====================================================
CREATE TABLE appointment_reminders (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

reminder_type VARCHAR(20) NOT NULL, -- day_before, hour_before, confirmation
scheduled_at TIMESTAMP NOT NULL,
sent_at TIMESTAMP,

channel VARCHAR(20) NOT NULL, -- whatsapp, sms, email
status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled

message_id VARCHAR(100),
error_message TEXT,

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointment_reminders ON appointment_reminders(scheduled_at, status);
CREATE INDEX idx_reminders_appointment ON appointment_reminders(appointment_id);

````

---

## TypeScript Types

```typescript
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
  RESCHEDULED = 'rescheduled'
}

export enum BookingType {
  ONLINE = 'online',
  PHONE = 'phone',
  WALK_IN = 'walk_in'
}

export enum GenderPreference {
  MALE = 'male',
  FEMALE = 'female',
  ANY = 'any'
}

export enum ServiceStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum QueueStatus {
  WAITING = 'waiting',
  CALLED = 'called',
  SERVING = 'serving',
  COMPLETED = 'completed',
  LEFT = 'left'
}

export enum ReminderType {
  DAY_BEFORE = 'day_before',
  HOUR_BEFORE = 'hour_before',
  CONFIRMATION = 'confirmation'
}

export enum ReminderChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email'
}
````

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
queuePosition?: number;
estimatedWaitMinutes?: number;

// Pricing
subtotal: number;
taxAmount: number;
totalAmount: number;
priceLockedAt?: Date;

// Prepayment
prepaymentRequired: boolean;
prepaymentAmount: number;
prepaymentStatus?: 'pending' | 'paid' | 'refunded';
paymentId?: string;

// Rescheduling
rescheduleCount: number;
originalAppointmentId?: string;
rescheduledToId?: string;

// Cancellation
cancelledAt?: Date;
cancelledBy?: string;
cancellationReason?: string;
isSalonCancelled: boolean;

// Notes
customerNotes?: string;
internalNotes?: string;

// Metadata
createdAt: Date;
updatedAt: Date;
createdBy?: string;

// Relations (populated)
services?: AppointmentService[];
customer?: Customer;
stylist?: User;
statusHistory?: AppointmentStatusHistory[];
}

export interface AppointmentService {
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
startedAt?: Date;
completedAt?: Date;

commissionRate?: number;
commissionAmount?: number;

createdAt: Date;
}

export interface AppointmentStatusHistory {
id: string;
tenantId: string;
appointmentId: string;
fromStatus?: AppointmentStatus;
toStatus: AppointmentStatus;
changedBy?: string;
notes?: string;
createdAt: Date;
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
createdAt: Date;
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
reason?: string;
createdAt: Date;
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
calledAt?: Date;
appointmentId?: string;
createdAt: Date;
}

export interface AppointmentReminder {
id: string;
tenantId: string;
appointmentId: string;
reminderType: ReminderType;
scheduledAt: Date;
sentAt?: Date;
channel: ReminderChannel;
status: 'pending' | 'sent' | 'failed' | 'cancelled';
messageId?: string;
errorMessage?: string;
createdAt: Date;
}

```

---

## API Endpoints

### Appointment CRUD

```

POST /api/v1/appointments Create appointment
GET /api/v1/appointments List appointments (with filters)
GET /api/v1/appointments/:id Get appointment details
PATCH /api/v1/appointments/:id Update appointment
DELETE /api/v1/appointments/:id Cancel appointment (soft delete)

```

### Appointment Actions

```

POST /api/v1/appointments/:id/check-in Mark customer as checked in
POST /api/v1/appointments/:id/start Start service
POST /api/v1/appointments/:id/complete Complete appointment
POST /api/v1/appointments/:id/no-show Mark as no-show
POST /api/v1/appointments/:id/reschedule Reschedule appointment
POST /api/v1/appointments/:id/cancel Cancel with reason

```

### Calendar & Availability

```

GET /api/v1/appointments/calendar Get calendar view (day/week/month)
GET /api/v1/availability/slots Get available time slots
GET /api/v1/availability/stylists Get available stylists for time

```

### Stylist Schedule Management

```

GET /api/v1/stylists/:id/schedule Get stylist schedule
POST /api/v1/stylists/:id/breaks Add recurring break
DELETE /api/v1/stylists/:id/breaks/:breakId Remove break
POST /api/v1/stylists/:id/blocked-slots Block time slot
DELETE /api/v1/stylists/:id/blocked-slots/:id Unblock slot

```

### Walk-in Queue

```

POST /api/v1/walk-in/queue Add to queue (get token)
GET /api/v1/walk-in/queue Get current queue
PATCH /api/v1/walk-in/queue/:id/call Call customer
PATCH /api/v1/walk-in/queue/:id/serve Start serving
PATCH /api/v1/walk-in/queue/:id/complete Complete
PATCH /api/v1/walk-in/queue/:id/left Mark as left

```

---

## Request/Response Schemas
```

### Create Appointment

```typescript
// POST /api/v1/appointments
interface CreateAppointmentRequest {
  branchId: string;

  // Customer (one of these required)
  customerId?: string;
  customerName?: string; // For guest checkout
  customerPhone?: string;

  // Scheduling
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm

  // Services
  services: {
    serviceId: string;
    stylistId?: string; // Override per service
    quantity?: number;
  }[];

  // Stylist preference
  stylistId?: string;
  stylistGenderPreference?: GenderPreference;

  // Type
  bookingType: BookingType;
  bookingSource?: string;

  // Notes
  customerNotes?: string;
  internalNotes?: string;
}

interface CreateAppointmentResponse {
  success: boolean;
  data: {
    appointment: Appointment;
    tokenNumber?: number; // For walk-ins
    prepaymentRequired: boolean;
    prepaymentAmount?: number;
  };
}
```

### Get Available Slots

```typescript
// GET /api/v1/availability/slots
interface GetAvailableSlotsRequest {
  branchId: string;
  date: string; // YYYY-MM-DD
  serviceIds: string[];
  stylistId?: string;
  genderPreference?: GenderPreference;
}

interface GetAvailableSlotsResponse {
  success: boolean;
  data: {
    date: string;
    slots: {
      time: string; // HH:mm
      available: boolean;
      stylistId?: string;
      stylistName?: string;
    }[];
    nextAvailableDate?: string; // If no slots today
  };
}
```

### Calendar View

```typescript
// GET /api/v1/appointments/calendar
interface GetCalendarRequest {
  branchId: string;
  view: "day" | "week" | "month";
  date: string; // Reference date
  stylistId?: string;
}

interface GetCalendarResponse {
  success: boolean;
  data: {
    view: string;
    startDate: string;
    endDate: string;
    appointments: CalendarAppointment[];
    summary: {
      total: number;
      byStatus: Record<AppointmentStatus, number>;
    };
  };
}

interface CalendarAppointment {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  customerName: string;
  stylistName: string;
  services: string[];
  status: AppointmentStatus;
  bookingType: BookingType;
  totalAmount: number;
}
```

### Reschedule Appointment

```typescript
// POST /api/v1/appointments/:id/reschedule
interface RescheduleAppointmentRequest {
  newDate: string;
  newTime: string;
  stylistId?: string; // Optional change
  reason?: string;
}

interface RescheduleAppointmentResponse {
  success: boolean;
  data: {
    originalAppointment: Appointment;
    newAppointment: Appointment;
    rescheduleCount: number;
    notificationSent: boolean;
  };
  error?: {
    code: string;
    message: string; // e.g., "MAX_RESCHEDULES_REACHED"
  };
}
```

### Walk-in Queue

```typescript
// POST /api/v1/walk-in/queue
interface AddToQueueRequest {
  branchId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  serviceIds: string[];
  stylistPreferenceId?: string;
  genderPreference?: GenderPreference;
}

interface AddToQueueResponse {
  success: boolean;
  data: {
    queueEntry: WalkInQueueEntry;
    tokenNumber: number;
    position: number;
    estimatedWaitMinutes: number;
  };
}

// GET /api/v1/walk-in/queue
interface GetQueueResponse {
  success: boolean;
  data: {
    branchId: string;
    date: string;
    queue: WalkInQueueEntry[];
    stats: {
      waiting: number;
      serving: number;
      completed: number;
      averageWaitTime: number;
    };
  };
}
```

---

## Business Logic

### 1. Availability Engine

```typescript
class AvailabilityEngine {
  /**
   * Calculate available slots for a branch/stylist on a given date
   * Considers: working hours, breaks, blocked slots, existing appointments
   */
  async getAvailableSlots(params: {
    branchId: string;
    date: string;
    serviceIds: string[];
    stylistId?: string;
    genderPreference?: GenderPreference;
  }): Promise<TimeSlot[]> {
    // 1. Get branch working hours for the day
    const workingHours = await this.getBranchWorkingHours(branchId, date);
    if (!workingHours.isOpen) return [];

    // 2. Calculate total duration needed
    const totalDuration = await this.calculateTotalDuration(serviceIds);

    // 3. Get eligible stylists
    const stylists = await this.getEligibleStylists({
      branchId,
      date,
      stylistId,
      genderPreference,
      serviceIds
    });

    // 4. For each stylist, calculate available slots
    const allSlots: TimeSlot[] = [];
    for (const stylist of stylists) {
      const stylistSlots = await this.getStylistAvailableSlots({
        stylistId: stylist.id,
        date,
        workingHours,
        totalDuration
      });
      allSlots.push(...stylistSlots);
    }

    // 5. Deduplicate and sort
    return this.deduplicateSlots(allSlots);
  }

  /**
   * Check if a specific slot is available
   */
  async isSlotAvailable(params: {
    branchId: string;
    stylistId: string;
    date: string;
    startTime: string;
    duration: number;
  }): Promise<boolean> {
    // Check branch hours
    // Check stylist breaks
    // Check blocked slots
    // Check existing appointments
    // Return true only if all checks pass
  }

  /**
   * Get stylist's schedule for a day including appointments, breaks, blocks
   */
  async getStylistDaySchedule(stylistId: string, date: string): Promise<DaySchedule> {
    const [appointments, breaks, blockedSlots, workingHours] = await Promise.all([
      this.getAppointments(stylistId, date),
      this.getBreaks(stylistId, date),
      this.getBlockedSlots(stylistId, date),
      this.getWorkingHours(stylistId, date)
    ]);

    return {
      stylistId,
      date,
      workingHours,
      appointments,
      breaks,
      blockedSlots,
      availableSlots: this.calculateAvailableSlots(...)
    };
  }
}
```

### 2. Booking Flow

```typescript
class AppointmentService {
  /**
   * Create a new appointment with all validations
   */
  async createAppointment(
    request: CreateAppointmentRequest,
    userId: string,
  ): Promise<Appointment> {
    // 1. Validate customer
    const customer = await this.resolveCustomer(request);

    // 2. Validate services exist and are active
    const services = await this.validateServices(request.services);

    // 3. Calculate total duration
    const totalDuration = this.calculateTotalDuration(services);

    // 4. Resolve stylist (auto-assign if not specified)
    const stylistId = await this.resolveStylist({
      branchId: request.branchId,
      date: request.scheduledDate,
      time: request.scheduledTime,
      duration: totalDuration,
      preferredStylistId: request.stylistId,
      genderPreference: request.stylistGenderPreference,
      serviceIds: request.services.map((s) => s.serviceId),
    });

    // 5. Validate slot availability (prevent double booking)
    const isAvailable = await this.availabilityEngine.isSlotAvailable({
      branchId: request.branchId,
      stylistId,
      date: request.scheduledDate,
      startTime: request.scheduledTime,
      duration: totalDuration,
    });

    if (!isAvailable) {
      throw new ConflictError(
        "SLOT_NOT_AVAILABLE",
        "Selected time slot is no longer available",
      );
    }

    // 6. Check prepayment requirement
    const prepaymentRequired = await this.checkPrepaymentRequired(
      customer,
      request.bookingType,
    );

    // 7. Lock prices at booking time
    const pricedServices = await this.lockServicePrices(
      services,
      request.branchId,
    );

    // 8. Calculate totals
    const totals = this.calculateTotals(pricedServices);

    // 9. Create appointment in transaction
    const appointment = await this.db.transaction(async (tx) => {
      // Create appointment
      const apt = await tx.appointments.create({
        ...request,
        customerId: customer?.id,
        stylistId,
        totalDuration,
        endTime: this.calculateEndTime(request.scheduledTime, totalDuration),
        ...totals,
        priceLockedAt: new Date(),
        prepaymentRequired,
        prepaymentAmount: prepaymentRequired ? totals.totalAmount : 0,
        createdBy: userId,
      });

      // Create appointment services
      for (const service of pricedServices) {
        await tx.appointmentServices.create({
          appointmentId: apt.id,
          ...service,
        });
      }

      // Create status history
      await tx.appointmentStatusHistory.create({
        appointmentId: apt.id,
        toStatus: AppointmentStatus.BOOKED,
        changedBy: userId,
      });

      // Generate token for walk-ins
      if (request.bookingType === BookingType.WALK_IN) {
        apt.tokenNumber = await this.generateToken(request.branchId);
      }

      return apt;
    });

    // 10. Schedule reminders (async)
    this.scheduleReminders(appointment);

    // 11. Send confirmation notification (async)
    this.sendBookingConfirmation(appointment);

    return appointment;
  }

  /**
   * Auto-assign stylist based on preferences and availability
   */
  private async resolveStylist(params: {
    branchId: string;
    date: string;
    time: string;
    duration: number;
    preferredStylistId?: string;
    genderPreference?: GenderPreference;
    serviceIds: string[];
  }): Promise<string> {
    // If specific stylist requested, validate availability
    if (params.preferredStylistId) {
      const isAvailable = await this.availabilityEngine.isSlotAvailable({
        branchId: params.branchId,
        stylistId: params.preferredStylistId,
        date: params.date,
        startTime: params.time,
        duration: params.duration,
      });

      if (isAvailable) return params.preferredStylistId;
      throw new ConflictError(
        "STYLIST_NOT_AVAILABLE",
        "Selected stylist is not available",
      );
    }

    // Auto-assign: find available stylists matching criteria
    const availableStylists = await this.getAvailableStylists({
      branchId: params.branchId,
      date: params.date,
      time: params.time,
      duration: params.duration,
      genderPreference: params.genderPreference,
      serviceIds: params.serviceIds,
    });

    if (availableStylists.length === 0) {
      throw new ConflictError(
        "NO_STYLIST_AVAILABLE",
        "No stylist available for selected time",
      );
    }

    // Select stylist with least workload for the day (load balancing)
    return this.selectLeastBusyStylist(availableStylists, params.date);
  }
}
```

### 3. No-Show Policy Engine

```typescript
class NoShowPolicyEngine {
  private readonly FIRST_WARNING_THRESHOLD = 1;
  private readonly PREPAID_ONLY_THRESHOLD = 2;
  private readonly BLOCK_ONLINE_THRESHOLD = 3;

  /**
   * Mark appointment as no-show and apply policy
   */
  async markNoShow(
    appointmentId: string,
    userId: string,
  ): Promise<NoShowResult> {
    const appointment = await this.getAppointment(appointmentId);

    // Update appointment status
    await this.updateAppointmentStatus(
      appointmentId,
      AppointmentStatus.NO_SHOW,
      userId,
    );

    // Increment customer no-show count
    const customer = await this.incrementNoShowCount(appointment.customerId);

    // Apply policy based on count
    const action = await this.applyPolicy(customer);

    // Send notification
    await this.sendNoShowNotification(customer, action);

    // Create audit log
    await this.createAuditLog({
      action: "NO_SHOW_MARKED",
      appointmentId,
      customerId: customer.id,
      noShowCount: customer.noShowCount,
      policyAction: action,
    });

    return { customer, action };
  }

  /**
   * Apply policy based on no-show count
   */
  private async applyPolicy(customer: Customer): Promise<PolicyAction> {
    const count = customer.noShowCount;

    if (count === this.FIRST_WARNING_THRESHOLD) {
      // First no-show: warning only
      return { type: "WARNING", message: "First no-show warning sent" };
    }

    if (count === this.PREPAID_ONLY_THRESHOLD) {
      // Second no-show: flag as prepaid only
      await this.flagCustomerPrepaidOnly(customer.id);
      return {
        type: "PREPAID_ONLY",
        message: "Customer flagged for prepayment",
      };
    }

    if (count >= this.BLOCK_ONLINE_THRESHOLD) {
      // Third+ no-show: block online booking
      await this.blockOnlineBooking(customer.id);
      return { type: "BLOCKED", message: "Online booking blocked" };
    }

    return { type: "NONE", message: "No action required" };
  }

  /**
   * Check if prepayment is required for customer
   */
  async checkPrepaymentRequired(
    customerId: string,
    bookingType: BookingType,
  ): Promise<boolean> {
    if (bookingType !== BookingType.ONLINE) return false;

    const customer = await this.getCustomer(customerId);
    return customer?.isPrepaidOnly ?? false;
  }

  /**
   * Unblock customer (manager action)
   */
  async unblockCustomer(
    customerId: string,
    reason: string,
    userId: string,
  ): Promise<void> {
    await this.db.customers.update(customerId, {
      noShowCount: 0,
      isPrepaidOnly: false,
      isOnlineBlocked: false,
    });

    await this.createAuditLog({
      action: "CUSTOMER_UNBLOCKED",
      customerId,
      reason,
      unlockedBy: userId,
    });
  }
}
```

### 4. Walk-in Queue Management

```typescript
class WalkInQueueService {
  /**
   * Add customer to walk-in queue
   */
  async addToQueue(request: AddToQueueRequest): Promise<WalkInQueueEntry> {
    const { branchId, customerName, customerPhone, serviceIds } = request;
    const today = new Date().toISOString().split("T")[0];

    // Generate token number (sequential per branch per day)
    const tokenNumber = await this.generateToken(branchId, today);

    // Calculate estimated wait time
    const estimatedWait = await this.calculateEstimatedWait(
      branchId,
      serviceIds,
    );

    // Get current position
    const position = (await this.getCurrentQueueLength(branchId, today)) + 1;

    // Create queue entry
    const entry = await this.db.walkInQueue.create({
      tenantId: this.tenantId,
      branchId,
      queueDate: today,
      tokenNumber,
      customerName,
      customerPhone,
      customerId: request.customerId,
      serviceIds,
      stylistPreferenceId: request.stylistPreferenceId,
      genderPreference: request.genderPreference,
      status: QueueStatus.WAITING,
      position,
      estimatedWaitMinutes: estimatedWait,
    });

    // Emit real-time update
    this.emitQueueUpdate(branchId);

    return entry;
  }

  /**
   * Generate sequential token number for the day
   */
  private async generateToken(branchId: string, date: string): Promise<number> {
    const lastToken = await this.db.walkInQueue.findFirst({
      where: { branchId, queueDate: date },
      orderBy: { tokenNumber: "desc" },
    });

    return (lastToken?.tokenNumber ?? 0) + 1;
  }

  /**
   * Calculate estimated wait time based on queue and service durations
   */
  private async calculateEstimatedWait(
    branchId: string,
    serviceIds: string[],
  ): Promise<number> {
    // Get waiting customers ahead
    const waitingAhead = await this.getWaitingCount(branchId);

    // Get average service time for requested services
    const avgServiceTime = await this.getAverageServiceTime(serviceIds);

    // Get number of available stylists
    const availableStylists = await this.getAvailableStylistCount(branchId);

    if (availableStylists === 0) return waitingAhead * avgServiceTime;

    // Estimate: (waiting customers * avg time) / available stylists
    return Math.ceil((waitingAhead * avgServiceTime) / availableStylists);
  }

  /**
   * Call next customer from queue
   */
  async callCustomer(
    queueEntryId: string,
    stylistId: string,
  ): Promise<WalkInQueueEntry> {
    const entry = await this.db.walkInQueue.update(queueEntryId, {
      status: QueueStatus.CALLED,
      calledAt: new Date(),
    });

    // Recalculate positions for remaining queue
    await this.recalculatePositions(entry.branchId);

    // Emit real-time update
    this.emitQueueUpdate(entry.branchId);

    return entry;
  }

  /**
   * Start serving customer (creates appointment)
   */
  async startServing(
    queueEntryId: string,
    stylistId: string,
  ): Promise<{
    queueEntry: WalkInQueueEntry;
    appointment: Appointment;
  }> {
    const entry = await this.db.walkInQueue.findById(queueEntryId);

    // Create walk-in appointment
    const appointment = await this.appointmentService.createAppointment({
      branchId: entry.branchId,
      customerId: entry.customerId,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      scheduledDate: entry.queueDate,
      scheduledTime: new Date().toTimeString().slice(0, 5),
      services: entry.serviceIds.map((id) => ({ serviceId: id })),
      stylistId,
      bookingType: BookingType.WALK_IN,
      tokenNumber: entry.tokenNumber,
    });

    // Update queue entry
    const updatedEntry = await this.db.walkInQueue.update(queueEntryId, {
      status: QueueStatus.SERVING,
      appointmentId: appointment.id,
    });

    this.emitQueueUpdate(entry.branchId);

    return { queueEntry: updatedEntry, appointment };
  }

  /**
   * Get current queue for display
   */
  async getQueue(branchId: string): Promise<QueueDisplay> {
    const today = new Date().toISOString().split("T")[0];

    const queue = await this.db.walkInQueue.findMany({
      where: {
        branchId,
        queueDate: today,
        status: {
          in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.SERVING],
        },
      },
      orderBy: { position: "asc" },
    });

    const stats = await this.getQueueStats(branchId, today);

    return { branchId, date: today, queue, stats };
  }
}
```

### 5. Reminder Scheduler

```typescript
class ReminderScheduler {
  private readonly REMINDER_CONFIGS = [
    { type: ReminderType.DAY_BEFORE, offsetHours: -24 },
    { type: ReminderType.HOUR_BEFORE, offsetHours: -1 },
    { type: ReminderType.CONFIRMATION, offsetMinutes: -30 },
  ];

  /**
   * Schedule all reminders for an appointment
   */
  async scheduleReminders(appointment: Appointment): Promise<void> {
    const appointmentDateTime = this.parseDateTime(
      appointment.scheduledDate,
      appointment.scheduledTime,
    );

    // Get branch reminder settings
    const settings = await this.getBranchReminderSettings(appointment.branchId);

    for (const config of this.REMINDER_CONFIGS) {
      if (!settings[config.type]?.enabled) continue;

      const scheduledAt = this.calculateReminderTime(
        appointmentDateTime,
        config,
      );

      // Don't schedule if time has passed
      if (scheduledAt <= new Date()) continue;

      await this.db.appointmentReminders.create({
        tenantId: appointment.tenantId,
        appointmentId: appointment.id,
        reminderType: config.type,
        scheduledAt,
        channel: settings[config.type].channel ?? ReminderChannel.WHATSAPP,
        status: "pending",
      });
    }
  }

  /**
   * Process pending reminders (called by cron job)
   */
  async processPendingReminders(): Promise<void> {
    const now = new Date();
    const pendingReminders = await this.db.appointmentReminders.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: now },
      },
      include: { appointment: true },
    });

    for (const reminder of pendingReminders) {
      try {
        // Skip if appointment is cancelled/completed
        if (this.shouldSkipReminder(reminder.appointment)) {
          await this.cancelReminder(reminder.id);
          continue;
        }

        // Send reminder
        const result = await this.sendReminder(reminder);

        // Update status
        await this.db.appointmentReminders.update(reminder.id, {
          status: result.success ? "sent" : "failed",
          sentAt: result.success ? new Date() : null,
          messageId: result.messageId,
          errorMessage: result.error,
        });
      } catch (error) {
        await this.db.appointmentReminders.update(reminder.id, {
          status: "failed",
          errorMessage: error.message,
        });
      }
    }
  }

  /**
   * Send reminder via configured channel
   */
  private async sendReminder(
    reminder: AppointmentReminder,
  ): Promise<SendResult> {
    const appointment = reminder.appointment;
    const message = this.buildReminderMessage(
      reminder.reminderType,
      appointment,
    );

    switch (reminder.channel) {
      case ReminderChannel.WHATSAPP:
        return this.whatsappService.sendTemplate(
          appointment.customerPhone,
          "appointment_reminder",
          message.params,
        );
      case ReminderChannel.SMS:
        return this.smsService.send(appointment.customerPhone, message.text);
      case ReminderChannel.EMAIL:
        return this.emailService.send(
          appointment.customerEmail,
          message.subject,
          message.html,
        );
    }
  }

  /**
   * Cancel all pending reminders for an appointment
   */
  async cancelRemindersForAppointment(appointmentId: string): Promise<void> {
    await this.db.appointmentReminders.updateMany({
      where: { appointmentId, status: "pending" },
      data: { status: "cancelled" },
    });
  }
}
```

---

## Validation Schemas

```typescript
import { z } from "zod";

// =====================================================
// CREATE APPOINTMENT
// =====================================================
export const createAppointmentSchema = z
  .object({
    branchId: z.string().uuid(),

    // Customer - at least one identifier required
    customerId: z.string().uuid().optional(),
    customerName: z.string().min(2).max(255).optional(),
    customerPhone: z
      .string()
      .regex(/^[6-9]\d{9}$/)
      .optional(),

    // Scheduling
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),

    // Services
    services: z
      .array(
        z.object({
          serviceId: z.string().uuid(),
          stylistId: z.string().uuid().optional(),
          quantity: z.number().int().min(1).default(1),
        }),
      )
      .min(1),

    // Stylist preference
    stylistId: z.string().uuid().optional(),
    stylistGenderPreference: z.enum(["male", "female", "any"]).optional(),

    // Type
    bookingType: z.enum(["online", "phone", "walk_in"]),
    bookingSource: z.string().max(50).optional(),

    // Notes
    customerNotes: z.string().max(1000).optional(),
    internalNotes: z.string().max(1000).optional(),
  })
  .refine((data) => data.customerId || data.customerName, {
    message: "Either customerId or customerName is required",
  });

// =====================================================
// RESCHEDULE APPOINTMENT
// =====================================================
export const rescheduleAppointmentSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newTime: z.string().regex(/^\d{2}:\d{2}$/),
  stylistId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
});

// =====================================================
// CANCEL APPOINTMENT
// =====================================================
export const cancelAppointmentSchema = z.object({
  reason: z.string().max(500),
  isSalonCancelled: z.boolean().default(false),
});
```

// =====================================================
// AVAILABILITY QUERY
// =====================================================
export const getAvailableSlotsSchema = z.object({
branchId: z.string().uuid(),
date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
serviceIds: z.array(z.string().uuid()).min(1),
stylistId: z.string().uuid().optional(),
genderPreference: z.enum(['male', 'female', 'any']).optional()
});

// =====================================================
// CALENDAR QUERY
// =====================================================
export const getCalendarSchema = z.object({
branchId: z.string().uuid(),
view: z.enum(['day', 'week', 'month']),
date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
stylistId: z.string().uuid().optional()
});

// =====================================================
// WALK-IN QUEUE
// =====================================================
export const addToQueueSchema = z.object({
branchId: z.string().uuid(),
customerId: z.string().uuid().optional(),
customerName: z.string().min(2).max(255),
customerPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
serviceIds: z.array(z.string().uuid()).min(1),
stylistPreferenceId: z.string().uuid().optional(),
genderPreference: z.enum(['male', 'female', 'any']).optional()
});

// =====================================================
// STYLIST BREAK
// =====================================================
export const createStylistBreakSchema = z.object({
name: z.string().min(2).max(100),
dayOfWeek: z.number().int().min(0).max(6).optional(),
startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/)
}).refine(
data => data.startTime < data.endTime,
{ message: 'End time must be after start time' }
);

// =====================================================
// STYLIST BLOCKED SLOT
// =====================================================
export const createBlockedSlotSchema = z.object({
blockedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
reason: z.string().max(255).optional()
}).refine(
data => {
if (data.startTime && data.endTime) {
return data.startTime < data.endTime;
}
return true;
},
{ message: 'End time must be after start time' }
);

````

---

## Integration Points

### Inbound Dependencies (This module uses)

| Module | Integration | Purpose |
|--------|-------------|---------|
| Tenant Management | Branch settings, working hours | Validate booking within branch hours |
| Customer Management | Customer lookup, no-show flags | Resolve customer, check prepayment |
| Services & Pricing | Service details, pricing | Lock prices, calculate duration |
| Staff Management | Stylist availability, skills | Auto-assign, validate availability |

### Outbound Dependencies (Other modules use this)

| Module | Integration | Purpose |
|--------|-------------|---------|
| Billing | Appointment → Invoice | Convert completed appointment to bill |
| Staff Management | Appointment services | Calculate commissions |
| Reports | Appointment data | Utilization, no-show rates |
| Marketing | Appointment events | Trigger post-visit campaigns |

### Event Emissions

```typescript
// Events emitted by this module
const APPOINTMENT_EVENTS = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_CHECKED_IN: 'appointment.checked_in',
  APPOINTMENT_STARTED: 'appointment.started',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_NO_SHOW: 'appointment.no_show',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',

  QUEUE_UPDATED: 'walk_in.queue_updated',
  QUEUE_CUSTOMER_CALLED: 'walk_in.customer_called'
};

// Event payload example
interface AppointmentCreatedEvent {
  appointmentId: string;
  tenantId: string;
  branchId: string;
  customerId?: string;
  stylistId: string;
  bookingType: BookingType;
  scheduledDate: string;
  scheduledTime: string;
  totalAmount: number;
  services: { serviceId: string; serviceName: string }[];
}
````

### External Service Integrations

```typescript
// WhatsApp/SMS for reminders
interface NotificationService {
  sendAppointmentConfirmation(appointment: Appointment): Promise<void>;
  sendRescheduleNotification(appointment: Appointment): Promise<void>;
  sendCancellationNotification(appointment: Appointment): Promise<void>;
  sendReminder(reminder: AppointmentReminder): Promise<SendResult>;
}

// Payment gateway for prepayment
interface PaymentService {
  createPaymentLink(
    amount: number,
    appointmentId: string,
  ): Promise<PaymentLink>;
  verifyPayment(paymentId: string): Promise<PaymentStatus>;
  refundPayment(paymentId: string, amount: number): Promise<RefundResult>;
}
```

---

## Error Handling

```typescript
// Appointment-specific error codes
export const APPOINTMENT_ERRORS = {
  // Availability errors
  SLOT_NOT_AVAILABLE: {
    code: "APT_001",
    message: "Selected time slot is no longer available",
    httpStatus: 409,
  },
  STYLIST_NOT_AVAILABLE: {
    code: "APT_002",
    message: "Selected stylist is not available at this time",
    httpStatus: 409,
  },
  NO_STYLIST_AVAILABLE: {
    code: "APT_003",
    message: "No stylist available for the selected time",
    httpStatus: 409,
  },
  OUTSIDE_WORKING_HOURS: {
    code: "APT_004",
    message: "Booking time is outside branch working hours",
    httpStatus: 400,
  },
  BRANCH_CLOSED: {
    code: "APT_005",
    message: "Branch is closed on the selected date",
    httpStatus: 400,
  },

  // Booking errors
  INVALID_SERVICE: {
    code: "APT_010",
    message: "One or more selected services are not available",
    httpStatus: 400,
  },
  CUSTOMER_BLOCKED: {
    code: "APT_011",
    message: "Customer is blocked from online booking",
    httpStatus: 403,
  },
  PREPAYMENT_REQUIRED: {
    code: "APT_012",
    message: "Prepayment is required for this booking",
    httpStatus: 402,
  },

  // Reschedule errors
  MAX_RESCHEDULES_REACHED: {
    code: "APT_020",
    message: "Maximum reschedule limit (3) reached",
    httpStatus: 400,
  },
  CANNOT_RESCHEDULE_STATUS: {
    code: "APT_021",
    message: "Cannot reschedule appointment in current status",
    httpStatus: 400,
  },

  // Status transition errors
  INVALID_STATUS_TRANSITION: {
    code: "APT_030",
    message: "Invalid status transition",
    httpStatus: 400,
  },
  APPOINTMENT_NOT_FOUND: {
    code: "APT_040",
    message: "Appointment not found",
    httpStatus: 404,
  },
};
```

---

## Testing Considerations

### Unit Tests

```typescript
describe("AvailabilityEngine", () => {
  describe("getAvailableSlots", () => {
    it("should return empty array for closed branch day");
    it("should exclude stylist break times");
    it("should exclude blocked slots");
    it("should exclude existing appointments");
    it("should respect gender preference filter");
    it("should calculate correct slot duration");
    it("should handle processing time overlap");
  });

  describe("isSlotAvailable", () => {
    it("should return false for overlapping appointment");
    it("should return false during break time");
    it("should return false for blocked slot");
    it("should return true for valid available slot");
  });
});

describe("AppointmentService", () => {
  describe("createAppointment", () => {
    it("should create appointment with locked prices");
    it("should auto-assign stylist when not specified");
    it("should generate token for walk-in");
    it("should require prepayment for flagged customer");
    it("should prevent double booking");
    it("should schedule reminders");
  });

  describe("rescheduleAppointment", () => {
    it("should create new appointment and link to original");
    it("should increment reschedule count");
    it("should reject after 3 reschedules");
    it("should free original time slot");
  });
});

describe("NoShowPolicyEngine", () => {
  describe("markNoShow", () => {
    it("should send warning on first no-show");
    it("should flag prepaid-only on second no-show");
    it("should block online booking on third no-show");
  });

  describe("unblockCustomer", () => {
    it("should reset no-show count");
    it("should create audit log");
  });
});

describe("WalkInQueueService", () => {
  describe("addToQueue", () => {
    it("should generate sequential token");
    it("should calculate estimated wait time");
    it("should assign correct position");
  });

  describe("startServing", () => {
    it("should create walk-in appointment");
    it("should update queue status");
    it("should recalculate positions");
  });
});
```

### Integration Tests

```typescript
describe("Appointment Flow Integration", () => {
  it(
    "should complete full booking flow: create → confirm → check-in → start → complete",
  );
  it("should handle concurrent booking attempts for same slot");
  it("should process reminders at scheduled time");
  it("should apply no-show policy across multiple appointments");
  it("should sync queue updates in real-time");
});
```

---

## Performance Considerations

1. **Availability Calculation**: Cache stylist schedules for the day, invalidate on booking/cancellation
2. **Calendar Queries**: Index on (branch_id, scheduled_date, status) for efficient filtering
3. **Queue Updates**: Use WebSocket/SSE for real-time queue display updates
4. **Reminder Processing**: Batch process reminders in cron job, use message queue for sending
5. **Token Generation**: Use database sequence or atomic increment to prevent race conditions

---

## Security Considerations

1. **Authorization**: Stylists can only view/modify their own appointments
2. **Customer Data**: Phone numbers masked in calendar view for non-authorized roles
3. **Prepayment**: Payment links expire after configured time
4. **Rate Limiting**: Limit appointment creation per customer per day
5. **Audit Trail**: Log all status changes with user and timestamp
