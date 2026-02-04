# Module 6: Staff Management - Design Document

## Overview

This module handles staff profiles, attendance tracking, shift management, leave management, commission calculation, salary processing, and payroll. Staff belong to the business-level pool and can be assigned to multiple branches.

**Related Requirements:** 6.1 - 6.20

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │──────<│ Branch_Assignment│>──────│     Branch      │
│    (Staff)      │  1:N  │                 │  N:1  │                 │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Attendance    │       │     Shifts      │       │     Leaves      │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Commissions   │       │    Payroll      │       │   Deductions    │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Database Schema

```sql
-- =====================================================
-- STAFF PROFILES (Extended user data)
-- =====================================================
CREATE TABLE staff_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,

  -- Personal details
  date_of_birth DATE,
  gender VARCHAR(10),
  blood_group VARCHAR(5),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),

  -- Employment
  employee_code VARCHAR(50),
  designation VARCHAR(100),
  department VARCHAR(100),
  date_of_joining DATE NOT NULL,
  date_of_leaving DATE,
  employment_type VARCHAR(20) DEFAULT 'full_time',
  -- full_time, part_time, contract, intern

  -- Skills (for stylists)
  skill_level VARCHAR(20),  -- junior, senior, expert
  specializations TEXT[],  -- hair_color, bridal, etc.

  -- Documents
  aadhar_number VARCHAR(20),
  pan_number VARCHAR(20),
  bank_account_number VARCHAR(30),
  bank_name VARCHAR(100),
  bank_ifsc VARCHAR(20),

  -- Salary
  salary_type VARCHAR(20) DEFAULT 'monthly',  -- monthly, daily, hourly
  base_salary DECIMAL(12, 2) DEFAULT 0,

  -- Commission settings (can override service-level)
  commission_enabled BOOLEAN DEFAULT true,
  default_commission_type VARCHAR(20),  -- percentage, flat
  default_commission_rate DECIMAL(5, 2),

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_profiles ON staff_profiles(tenant_id, user_id);
CREATE INDEX idx_staff_employee_code ON staff_profiles(tenant_id, employee_code);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_profiles
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- BRANCH ASSIGNMENTS
-- =====================================================
CREATE TABLE staff_branch_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),

  is_primary BOOLEAN DEFAULT false,

  -- Branch-specific settings
  working_hours_override JSONB,  -- Override default working hours
  commission_override DECIMAL(5, 2),  -- Override commission rate

  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),

  UNIQUE(user_id, branch_id)
);

CREATE INDEX idx_staff_assignments ON staff_branch_assignments(user_id);
CREATE INDEX idx_branch_staff ON staff_branch_assignments(branch_id);

-- =====================================================
-- SHIFTS
-- =====================================================
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID NOT NULL REFERENCES branches(id),

  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration_minutes INTEGER DEFAULT 0,

  -- Days applicable
  applicable_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',  -- 0=Sun, 6=Sat

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(branch_id, name)
);

CREATE INDEX idx_shifts ON shifts(branch_id, is_active);

-- =====================================================
-- STAFF SHIFT ASSIGNMENTS
-- =====================================================
CREATE TABLE staff_shift_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  shift_id UUID NOT NULL REFERENCES shifts(id),

  effective_from DATE NOT NULL,
  effective_until DATE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_staff_shifts ON staff_shift_assignments(user_id, effective_from);
```

-- =====================================================
-- ATTENDANCE
-- =====================================================
CREATE TABLE attendance (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
branch_id UUID NOT NULL REFERENCES branches(id),
user_id UUID NOT NULL REFERENCES users(id),

attendance_date DATE NOT NULL,

-- Check-in/out
check_in_time TIME,
check_out_time TIME,

-- Calculated
scheduled_hours DECIMAL(4, 2),
actual_hours DECIMAL(4, 2),
overtime_hours DECIMAL(4, 2) DEFAULT 0,
late_minutes INTEGER DEFAULT 0,
early_leave_minutes INTEGER DEFAULT 0,

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'absent',
-- present, absent, half_day, on_leave, holiday, week_off

-- Leave reference
leave_id UUID REFERENCES leaves(id),

-- Notes
notes TEXT,

-- Approval (for manual entries)
is_manual_entry BOOLEAN DEFAULT false,
approved_by UUID REFERENCES users(id),
approved_at TIMESTAMP,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(branch_id, user_id, attendance_date)
);

CREATE INDEX idx_attendance_user ON attendance(user_id, attendance_date);
CREATE INDEX idx_attendance_branch ON attendance(branch_id, attendance_date);
CREATE INDEX idx_attendance_status ON attendance(branch_id, status, attendance_date);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attendance
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- LEAVES
-- =====================================================
CREATE TABLE leaves (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
user_id UUID NOT NULL REFERENCES users(id),
branch_id UUID NOT NULL REFERENCES branches(id),

leave_type VARCHAR(20) NOT NULL,
-- casual, sick, earned, unpaid, maternity, paternity, comp_off

start_date DATE NOT NULL,
end_date DATE NOT NULL,
total_days DECIMAL(4, 1) NOT NULL,

-- Half day support
is_half_day BOOLEAN DEFAULT false,
half_day_type VARCHAR(10), -- first_half, second_half

reason TEXT NOT NULL,

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'pending',
-- pending, approved, rejected, cancelled

-- Approval
approved_by UUID REFERENCES users(id),
approved_at TIMESTAMP,
rejection_reason TEXT,

-- Metadata
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaves_user ON leaves(user_id, start_date);
CREATE INDEX idx_leaves_status ON leaves(user_id, status);

-- =====================================================
-- LEAVE BALANCES
-- =====================================================
CREATE TABLE leave_balances (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
user_id UUID NOT NULL REFERENCES users(id),

financial_year VARCHAR(10) NOT NULL, -- 2024-25
leave_type VARCHAR(20) NOT NULL,

opening_balance DECIMAL(4, 1) DEFAULT 0,
accrued DECIMAL(4, 1) DEFAULT 0,
used DECIMAL(4, 1) DEFAULT 0,
lapsed DECIMAL(4, 1) DEFAULT 0,
carried_forward DECIMAL(4, 1) DEFAULT 0,
current_balance DECIMAL(4, 1) DEFAULT 0,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(user_id, financial_year, leave_type)
);

CREATE INDEX idx_leave_balances ON leave_balances(user_id, financial_year);

-- =====================================================
-- COMMISSIONS
-- =====================================================
CREATE TABLE commissions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
branch_id UUID NOT NULL REFERENCES branches(id),
user_id UUID NOT NULL REFERENCES users(id),

-- Reference
invoice_id UUID NOT NULL REFERENCES invoices(id),
invoice_item_id UUID NOT NULL REFERENCES invoice_items(id),

-- Service details
service_id UUID REFERENCES services(id),
service_name VARCHAR(255) NOT NULL,

-- Amounts
service_amount DECIMAL(10, 2) NOT NULL,
commission_type VARCHAR(20) NOT NULL, -- percentage, flat
commission_rate DECIMAL(5, 2) NOT NULL,
commission_amount DECIMAL(10, 2) NOT NULL,

-- Role
role_type VARCHAR(20) NOT NULL, -- primary, assistant

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'pending',
-- pending, approved, paid, cancelled

-- Payout reference
payroll_id UUID REFERENCES payroll(id),
paid_at TIMESTAMP,

commission_date DATE NOT NULL,
created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commissions_user ON commissions(user_id, commission_date);
CREATE INDEX idx_commissions_invoice ON commissions(invoice_id);
CREATE INDEX idx_commissions_status ON commissions(user_id, status);
CREATE INDEX idx_commissions_payroll ON commissions(payroll_id);

-- =====================================================
-- SALARY COMPONENTS
-- =====================================================
CREATE TABLE salary_components (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

name VARCHAR(100) NOT NULL,
code VARCHAR(20) NOT NULL,
component_type VARCHAR(20) NOT NULL, -- earning, deduction

-- Calculation
calculation_type VARCHAR(20) NOT NULL, -- fixed, percentage
calculation_base VARCHAR(50), -- base_salary, gross_salary
default_value DECIMAL(10, 2),

-- Tax
is_taxable BOOLEAN DEFAULT true,

-- Display
display_order INTEGER DEFAULT 0,
is_active BOOLEAN DEFAULT true,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(tenant_id, code)
);

-- =====================================================
-- STAFF SALARY STRUCTURE
-- =====================================================
CREATE TABLE staff_salary_structure (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
user_id UUID NOT NULL REFERENCES users(id),

component_id UUID NOT NULL REFERENCES salary_components(id),
amount DECIMAL(10, 2) NOT NULL,

effective_from DATE NOT NULL,
effective_until DATE,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_salary_structure ON staff_salary_structure(user_id, effective_from);

-- =====================================================
-- STAFF DEDUCTIONS (Loans, Advances, etc.)
-- =====================================================
CREATE TABLE staff_deductions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
user_id UUID NOT NULL REFERENCES users(id),

deduction_type VARCHAR(20) NOT NULL,
-- loan, advance, emi, penalty, other

description VARCHAR(255) NOT NULL,

total_amount DECIMAL(10, 2) NOT NULL,
monthly_deduction DECIMAL(10, 2) NOT NULL,
remaining_amount DECIMAL(10, 2) NOT NULL,

start_date DATE NOT NULL,
end_date DATE,

status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_staff_deductions ON staff_deductions(user_id, status);

-- =====================================================
-- PAYROLL
-- =====================================================
CREATE TABLE payroll (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
branch_id UUID REFERENCES branches(id), -- NULL for consolidated

payroll_month VARCHAR(7) NOT NULL, -- YYYY-MM

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'draft',
-- draft, processing, approved, paid, cancelled

-- Summary
total_employees INTEGER DEFAULT 0,
total_gross_salary DECIMAL(14, 2) DEFAULT 0,
total_deductions DECIMAL(14, 2) DEFAULT 0,
total_commissions DECIMAL(14, 2) DEFAULT 0,
total_net_salary DECIMAL(14, 2) DEFAULT 0,

-- Processing
processed_at TIMESTAMP,
processed_by UUID REFERENCES users(id),
approved_at TIMESTAMP,
approved_by UUID REFERENCES users(id),
paid_at TIMESTAMP,
paid_by UUID REFERENCES users(id),

notes TEXT,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(tenant_id, branch_id, payroll_month)
);

CREATE INDEX idx_payroll ON payroll(tenant_id, payroll_month);

-- =====================================================
-- PAYROLL ITEMS (Per employee)
-- =====================================================
CREATE TABLE payroll_items (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
payroll_id UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id),

-- Attendance summary
working_days INTEGER NOT NULL,
present_days DECIMAL(4, 1) NOT NULL,
absent_days DECIMAL(4, 1) NOT NULL,
leave_days DECIMAL(4, 1) NOT NULL,
overtime_hours DECIMAL(6, 2) DEFAULT 0,

-- Earnings
base_salary DECIMAL(10, 2) NOT NULL,
earnings_json JSONB NOT NULL, -- Component-wise breakdown
total_earnings DECIMAL(10, 2) NOT NULL,

-- Commissions
total_commissions DECIMAL(10, 2) DEFAULT 0,
commission_count INTEGER DEFAULT 0,

-- Deductions
deductions_json JSONB NOT NULL, -- Component-wise breakdown
total_deductions DECIMAL(10, 2) NOT NULL,

-- Overtime
overtime_rate DECIMAL(10, 2) DEFAULT 0,
overtime_amount DECIMAL(10, 2) DEFAULT 0,

-- Loss of pay
lop_days DECIMAL(4, 1) DEFAULT 0,
lop_amount DECIMAL(10, 2) DEFAULT 0,

-- Net
gross_salary DECIMAL(10, 2) NOT NULL,
net_salary DECIMAL(10, 2) NOT NULL,

-- Payment
payment_mode VARCHAR(20), -- bank_transfer, cash, cheque
payment_reference VARCHAR(100),
paid_at TIMESTAMP,

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payroll_items ON payroll_items(payroll_id);
CREATE INDEX idx_payroll_items_user ON payroll_items(user_id);

-- =====================================================
-- PAYSLIPS
-- =====================================================
CREATE TABLE payslips (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
payroll_item_id UUID NOT NULL REFERENCES payroll_items(id),
user_id UUID NOT NULL REFERENCES users(id),

payslip_number VARCHAR(50) NOT NULL,
payslip_month VARCHAR(7) NOT NULL,

-- PDF storage
pdf_url VARCHAR(500),
generated_at TIMESTAMP,

-- Email tracking
emailed_at TIMESTAMP,
email_status VARCHAR(20),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(tenant_id, payslip_number)
);

CREATE INDEX idx_payslips ON payslips(user_id, payslip_month);

````

---

## TypeScript Types

```typescript
// =====================================================
// ENUMS
// =====================================================
export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern'
}

export enum SkillLevel {
  JUNIOR = 'junior',
  SENIOR = 'senior',
  EXPERT = 'expert'
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
  HOLIDAY = 'holiday',
  WEEK_OFF = 'week_off'
}

export enum LeaveType {
  CASUAL = 'casual',
  SICK = 'sick',
  EARNED = 'earned',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  COMP_OFF = 'comp_off'
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export enum CommissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum PayrollStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum DeductionType {
  LOAN = 'loan',
  ADVANCE = 'advance',
  EMI = 'emi',
  PENALTY = 'penalty',
  OTHER = 'other'
}
````

// =====================================================
// CORE TYPES
// =====================================================
export interface StaffProfile {
id: string;
tenantId: string;
userId: string;

// Personal
dateOfBirth?: string;
gender?: string;
bloodGroup?: string;
emergencyContactName?: string;
emergencyContactPhone?: string;

// Address
addressLine1?: string;
addressLine2?: string;
city?: string;
state?: string;
pincode?: string;

// Employment
employeeCode?: string;
designation?: string;
department?: string;
dateOfJoining: string;
dateOfLeaving?: string;
employmentType: EmploymentType;

// Skills
skillLevel?: SkillLevel;
specializations: string[];

// Documents
aadharNumber?: string;
panNumber?: string;
bankAccountNumber?: string;
bankName?: string;
bankIfsc?: string;

// Salary
salaryType: string;
baseSalary: number;

// Commission
commissionEnabled: boolean;
defaultCommissionType?: string;
defaultCommissionRate?: number;

isActive: boolean;
createdAt: Date;
updatedAt: Date;

// Relations
user?: User;
branchAssignments?: BranchAssignment[];
}

export interface BranchAssignment {
id: string;
tenantId: string;
userId: string;
branchId: string;
isPrimary: boolean;
workingHoursOverride?: any;
commissionOverride?: number;
assignedAt: Date;
assignedBy?: string;

branch?: Branch;
}

export interface Shift {
id: string;
tenantId: string;
branchId: string;
name: string;
startTime: string;
endTime: string;
breakDurationMinutes: number;
applicableDays: number[];
isActive: boolean;
createdAt: Date;
}

export interface Attendance {
id: string;
tenantId: string;
branchId: string;
userId: string;
attendanceDate: string;
checkInTime?: string;
checkOutTime?: string;
scheduledHours?: number;
actualHours?: number;
overtimeHours: number;
lateMinutes: number;
earlyLeaveMinutes: number;
status: AttendanceStatus;
leaveId?: string;
notes?: string;
isManualEntry: boolean;
approvedBy?: string;
approvedAt?: Date;
createdAt: Date;
updatedAt: Date;
}

export interface Leave {
id: string;
tenantId: string;
userId: string;
branchId: string;
leaveType: LeaveType;
startDate: string;
endDate: string;
totalDays: number;
isHalfDay: boolean;
halfDayType?: string;
reason: string;
status: LeaveStatus;
approvedBy?: string;
approvedAt?: Date;
rejectionReason?: string;
createdAt: Date;
updatedAt: Date;
}

export interface LeaveBalance {
id: string;
tenantId: string;
userId: string;
financialYear: string;
leaveType: LeaveType;
openingBalance: number;
accrued: number;
used: number;
lapsed: number;
carriedForward: number;
currentBalance: number;
createdAt: Date;
updatedAt: Date;
}

export interface Commission {
id: string;
tenantId: string;
branchId: string;
userId: string;
invoiceId: string;
invoiceItemId: string;
serviceId?: string;
serviceName: string;
serviceAmount: number;
commissionType: string;
commissionRate: number;
commissionAmount: number;
roleType: string;
status: CommissionStatus;
payrollId?: string;
paidAt?: Date;
commissionDate: string;
createdAt: Date;
}

export interface Payroll {
id: string;
tenantId: string;
branchId?: string;
payrollMonth: string;
status: PayrollStatus;
totalEmployees: number;
totalGrossSalary: number;
totalDeductions: number;
totalCommissions: number;
totalNetSalary: number;
processedAt?: Date;
processedBy?: string;
approvedAt?: Date;
approvedBy?: string;
paidAt?: Date;
paidBy?: string;
notes?: string;
createdAt: Date;
updatedAt: Date;

items?: PayrollItem[];
}

export interface PayrollItem {
id: string;
tenantId: string;
payrollId: string;
userId: string;
workingDays: number;
presentDays: number;
absentDays: number;
leaveDays: number;
overtimeHours: number;
baseSalary: number;
earningsJson: Record<string, number>;
totalEarnings: number;
totalCommissions: number;
commissionCount: number;
deductionsJson: Record<string, number>;
totalDeductions: number;
overtimeRate: number;
overtimeAmount: number;
lopDays: number;
lopAmount: number;
grossSalary: number;
netSalary: number;
paymentMode?: string;
paymentReference?: string;
paidAt?: Date;
createdAt: Date;

user?: User;
}

```

---

## API Endpoints

### Staff Profile

```

GET /api/v1/staff List all staff
POST /api/v1/staff Create staff member
GET /api/v1/staff/:id Get staff details
PATCH /api/v1/staff/:id Update staff profile
DELETE /api/v1/staff/:id Deactivate staff
GET /api/v1/staff/:id/summary Get staff summary (performance)

```

### Branch Assignments

```

GET /api/v1/staff/:id/branches Get branch assignments
POST /api/v1/staff/:id/branches Assign to branch
DELETE /api/v1/staff/:id/branches/:branchId Remove from branch
PATCH /api/v1/staff/:id/branches/:branchId Update assignment

```

### Shifts

```

GET /api/v1/branches/:id/shifts List shifts for branch
POST /api/v1/branches/:id/shifts Create shift
PATCH /api/v1/shifts/:id Update shift
DELETE /api/v1/shifts/:id Delete shift
POST /api/v1/staff/:id/shifts Assign shift to staff

```

### Attendance

```

POST /api/v1/attendance/check-in Record check-in
POST /api/v1/attendance/check-out Record check-out
GET /api/v1/attendance Get attendance records
POST /api/v1/attendance/manual Manual attendance entry
PATCH /api/v1/attendance/:id Update attendance
GET /api/v1/attendance/summary Get attendance summary

```

### Leaves

```

GET /api/v1/leaves List leave requests
POST /api/v1/leaves Apply for leave
GET /api/v1/leaves/:id Get leave details
PATCH /api/v1/leaves/:id Update leave request
POST /api/v1/leaves/:id/approve Approve leave
POST /api/v1/leaves/:id/reject Reject leave
POST /api/v1/leaves/:id/cancel Cancel leave
GET /api/v1/staff/:id/leave-balance Get leave balances

```

### Commissions

```

GET /api/v1/commissions List commissions
GET /api/v1/staff/:id/commissions Get staff commissions
GET /api/v1/commissions/summary Get commission summary
POST /api/v1/commissions/approve Bulk approve commissions

```

### Payroll

```

GET /api/v1/payroll List payroll records
POST /api/v1/payroll/generate Generate payroll
GET /api/v1/payroll/:id Get payroll details
POST /api/v1/payroll/:id/process Process payroll
POST /api/v1/payroll/:id/approve Approve payroll
POST /api/v1/payroll/:id/pay Mark as paid
GET /api/v1/payroll/:id/payslips Get payslips
POST /api/v1/payroll/:id/payslips/generate Generate payslip PDFs

```

### Deductions

```

GET /api/v1/staff/:id/deductions Get staff deductions
POST /api/v1/staff/:id/deductions Add deduction
PATCH /api/v1/deductions/:id Update deduction
DELETE /api/v1/deductions/:id Cancel deduction

````

---

## Request/Response Schemas

### Create Staff

```typescript
// POST /api/v1/staff
interface CreateStaffRequest {
  // User account
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'branch_manager' | 'receptionist' | 'stylist' | 'accountant';

  // Profile
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Employment
  employeeCode?: string;
  designation?: string;
  department?: string;
  dateOfJoining: string;
  employmentType: EmploymentType;

  // Skills (for stylists)
  skillLevel?: SkillLevel;
  specializations?: string[];

  // Documents
  aadharNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfsc?: string;

  // Salary
  salaryType: 'monthly' | 'daily' | 'hourly';
  baseSalary: number;

  // Commission
  commissionEnabled?: boolean;
  defaultCommissionType?: 'percentage' | 'flat';
  defaultCommissionRate?: number;

  // Branch assignment
  branchAssignments: {
    branchId: string;
    isPrimary: boolean;
    workingHoursOverride?: Record<string, { start: string; end: string }>;
    commissionOverride?: number;
  }[];
}

interface CreateStaffResponse {
  success: boolean;
  data: {
    staff: StaffProfile;
    user: User;
    credentials: {
      username: string;
      temporaryPassword: boolean;
    };
  };
}
````

### Attendance Check-in/Check-out

```typescript
// POST /api/v1/attendance/check-in
interface CheckInRequest {
  branchId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceInfo?: {
    deviceId: string;
    deviceType: string;
  };
}

interface CheckInResponse {
  success: boolean;
  data: {
    attendance: Attendance;
    shift: Shift;
    isLate: boolean;
    lateMinutes: number;
    locationValid?: boolean;
  };
}

// POST /api/v1/attendance/check-out
interface CheckOutRequest {
  branchId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface CheckOutResponse {
  success: boolean;
  data: {
    attendance: Attendance;
    actualHours: number;
    overtimeHours: number;
    earlyLeaveMinutes: number;
  };
}
```

### Manual Attendance Entry

```typescript
// POST /api/v1/attendance/manual
interface ManualAttendanceRequest {
  userId: string;
  branchId: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  notes: string; // Mandatory for manual entries
}

interface ManualAttendanceResponse {
  success: boolean;
  data: {
    attendance: Attendance;
    requiresApproval: boolean;
  };
}
```

### Leave Application

```typescript
// POST /api/v1/leaves
interface ApplyLeaveRequest {
  branchId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayType?: "first_half" | "second_half";
  reason: string;
}

interface ApplyLeaveResponse {
  success: boolean;
  data: {
    leave: Leave;
    leaveBalance: LeaveBalance;
    daysRequested: number;
    remainingBalance: number;
  };
}

// POST /api/v1/leaves/:id/approve
interface ApproveLeaveRequest {
  comment?: string;
}

interface ApproveLeaveResponse {
  success: boolean;
  data: {
    leave: Leave;
    updatedBalance: LeaveBalance;
    appointmentsAffected: number;
  };
}
```

### Payroll Generation

```typescript
// POST /api/v1/payroll/generate
interface GeneratePayrollRequest {
  branchId?: string; // Optional: null for all branches
  payrollMonth: string; // YYYY-MM format
}

interface GeneratePayrollResponse {
  success: boolean;
  data: {
    payroll: Payroll;
    items: PayrollItem[];
    summary: {
      totalEmployees: number;
      totalGrossSalary: number;
      totalDeductions: number;
      totalCommissions: number;
      totalNetSalary: number;
    };
    warnings: string[]; // e.g., "3 employees have incomplete attendance"
  };
}

// POST /api/v1/payroll/:id/process
interface ProcessPayrollRequest {
  adjustments?: {
    userId: string;
    adjustmentType: "bonus" | "deduction" | "correction";
    amount: number;
    reason: string;
  }[];
}

interface ProcessPayrollResponse {
  success: boolean;
  data: {
    payroll: Payroll;
    items: PayrollItem[];
  };
}
```

### Staff Deductions

```typescript
// POST /api/v1/staff/:id/deductions
interface AddDeductionRequest {
  deductionType: DeductionType;
  description: string;
  totalAmount: number;
  monthlyDeduction: number;
  startDate: string;
  endDate?: string;
}

interface AddDeductionResponse {
  success: boolean;
  data: {
    deduction: StaffDeduction;
    totalMonths: number;
  };
}
```

---

## Business Logic

### 1. Attendance Service

```typescript
class AttendanceService {
  /**
   * Record staff check-in
   */
  async checkIn(
    userId: string,
    branchId: string,
    location?: GeoLocation,
    deviceInfo?: DeviceInfo,
  ): Promise<CheckInResult> {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Check if already checked in
    const existing = await this.db.attendance.findFirst({
      where: { userId, branchId, attendanceDate: today },
    });

    if (existing?.checkInTime) {
      throw new ConflictError("ALREADY_CHECKED_IN", "Already checked in today");
    }

    // Get staff's assigned shift
    const shift = await this.getStaffShift(userId, branchId, today);
    if (!shift) {
      throw new BadRequestError(
        "NO_SHIFT_ASSIGNED",
        "No shift assigned for today",
      );
    }

    // Validate location if geo-validation enabled
    let locationValid = true;
    if (this.config.geoValidationEnabled) {
      locationValid = await this.validateLocation(branchId, location);
    }

    // Calculate late minutes
    const shiftStartTime = this.parseTime(shift.startTime);
    const checkInTime = now;
    const gracePeriod = this.config.gracePeriodMinutes || 15;

    let lateMinutes = 0;
    const diffMinutes = this.getMinutesDiff(shiftStartTime, checkInTime);
    if (diffMinutes > gracePeriod) {
      lateMinutes = diffMinutes;
    }

    // Determine status
    let status = AttendanceStatus.PRESENT;
    if (lateMinutes > 0) {
      status = AttendanceStatus.PRESENT; // Still present, but late is tracked
    }

    // Create or update attendance record
    const attendance = existing
      ? await this.db.attendance.update(existing.id, {
          checkInTime: now.toTimeString().slice(0, 8),
          status,
          lateMinutes,
          isManualEntry: false,
          updatedAt: now,
        })
      : await this.db.attendance.create({
          tenantId: this.tenantId,
          branchId,
          userId,
          attendanceDate: today,
          checkInTime: now.toTimeString().slice(0, 8),
          scheduledHours: this.calculateScheduledHours(shift),
          status,
          lateMinutes,
          isManualEntry: false,
        });

    // Log device info if provided
    if (deviceInfo) {
      await this.logDeviceInfo(attendance.id, deviceInfo);
    }

    return {
      attendance,
      shift,
      isLate: lateMinutes > 0,
      lateMinutes,
      locationValid,
    };
  }

  /**
   * Record staff check-out
   */
  async checkOut(
    userId: string,
    branchId: string,
    location?: GeoLocation,
  ): Promise<CheckOutResult> {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Get today's attendance
    const attendance = await this.db.attendance.findFirst({
      where: { userId, branchId, attendanceDate: today },
    });

    if (!attendance) {
      throw new NotFoundError("NO_CHECK_IN", "No check-in found for today");
    }

    if (attendance.checkOutTime) {
      throw new ConflictError(
        "ALREADY_CHECKED_OUT",
        "Already checked out today",
      );
    }

    // Get shift for overtime calculation
    const shift = await this.getStaffShift(userId, branchId, today);

    // Calculate hours
    const checkInTime = this.parseTime(attendance.checkInTime!);
    const checkOutTime = now;
    const actualHours = this.getHoursDiff(checkInTime, checkOutTime);

    // Calculate overtime
    let overtimeHours = 0;
    if (shift) {
      const scheduledHours = this.calculateScheduledHours(shift);
      if (actualHours > scheduledHours) {
        overtimeHours = actualHours - scheduledHours;
      }
    }

    // Calculate early leave
    let earlyLeaveMinutes = 0;
    if (shift) {
      const shiftEndTime = this.parseTime(shift.endTime);
      const diffMinutes = this.getMinutesDiff(checkOutTime, shiftEndTime);
      if (diffMinutes > 0) {
        earlyLeaveMinutes = diffMinutes;
      }
    }

    // Determine final status
    let status = attendance.status;
    const halfDayThreshold = this.config.halfDayHours || 4;
    if (actualHours < halfDayThreshold && status === AttendanceStatus.PRESENT) {
      status = AttendanceStatus.HALF_DAY;
    }

    // Update attendance
    const updatedAttendance = await this.db.attendance.update(attendance.id, {
      checkOutTime: now.toTimeString().slice(0, 8),
      actualHours,
      overtimeHours,
      earlyLeaveMinutes,
      status,
      updatedAt: now,
    });

    return {
      attendance: updatedAttendance,
      actualHours,
      overtimeHours,
      earlyLeaveMinutes,
    };
  }

  /**
   * Auto-mark absent for staff who didn't check in
   */
  async autoMarkAbsent(branchId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const autoMarkTime = this.config.autoMarkAbsentTime || "12:00";

    // Get all staff assigned to this branch
    const staffAssignments = await this.db.staffBranchAssignments.findMany({
      where: { branchId },
    });

    let markedCount = 0;

    for (const assignment of staffAssignments) {
      // Check if already has attendance record
      const existing = await this.db.attendance.findFirst({
        where: { userId: assignment.userId, branchId, attendanceDate: today },
      });

      if (existing) continue;

      // Check if on approved leave
      const leave = await this.db.leaves.findFirst({
        where: {
          userId: assignment.userId,
          startDate: { lte: today },
          endDate: { gte: today },
          status: LeaveStatus.APPROVED,
        },
      });

      if (leave) {
        // Mark as on leave
        await this.db.attendance.create({
          tenantId: this.tenantId,
          branchId,
          userId: assignment.userId,
          attendanceDate: today,
          status: AttendanceStatus.ON_LEAVE,
          leaveId: leave.id,
          isManualEntry: true,
          notes: `Auto-marked: On ${leave.leaveType} leave`,
        });
      } else {
        // Check if weekly off
        const isWeeklyOff = await this.isWeeklyOff(assignment.userId, today);

        if (isWeeklyOff) {
          await this.db.attendance.create({
            tenantId: this.tenantId,
            branchId,
            userId: assignment.userId,
            attendanceDate: today,
            status: AttendanceStatus.WEEK_OFF,
            isManualEntry: true,
            notes: "Auto-marked: Weekly off",
          });
        } else {
          // Mark as absent
          await this.db.attendance.create({
            tenantId: this.tenantId,
            branchId,
            userId: assignment.userId,
            attendanceDate: today,
            status: AttendanceStatus.ABSENT,
            isManualEntry: true,
            notes: "Auto-marked: No check-in",
          });
        }
      }

      markedCount++;
    }

    return markedCount;
  }
}
```

### 2. Leave Service

```typescript
class LeaveService {
  /**
   * Apply for leave
   */
  async applyLeave(userId: string, request: ApplyLeaveRequest): Promise<Leave> {
    // Calculate total days
    const totalDays = request.isHalfDay
      ? 0.5
      : this.calculateLeaveDays(request.startDate, request.endDate);

    // Check leave balance
    const balance = await this.getLeaveBalance(userId, request.leaveType);

    if (
      request.leaveType !== LeaveType.UNPAID &&
      balance.currentBalance < totalDays
    ) {
      throw new BadRequestError(
        "INSUFFICIENT_LEAVE_BALANCE",
        `Insufficient ${request.leaveType} leave balance. Available: ${balance.currentBalance}, Requested: ${totalDays}`,
      );
    }

    // Check for overlapping leaves
    const overlapping = await this.db.leaves.findFirst({
      where: {
        userId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        OR: [
          {
            startDate: { lte: request.endDate },
            endDate: { gte: request.startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictError(
        "OVERLAPPING_LEAVE",
        "Leave request overlaps with existing leave",
      );
    }

    // Check for appointments on leave dates
    const appointments = await this.db.appointments.findMany({
      where: {
        stylistId: userId,
        appointmentDate: { gte: request.startDate, lte: request.endDate },
        status: { in: ["booked", "confirmed"] },
      },
    });

    // Create leave request
    const leave = await this.db.leaves.create({
      tenantId: this.tenantId,
      userId,
      branchId: request.branchId,
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays,
      isHalfDay: request.isHalfDay || false,
      halfDayType: request.halfDayType,
      reason: request.reason,
      status: LeaveStatus.PENDING,
    });

    // Notify manager
    await this.notificationService.notifyLeaveRequest(
      leave,
      appointments.length,
    );

    return leave;
  }

  /**
   * Approve leave request
   */
  async approveLeave(
    leaveId: string,
    approverId: string,
    comment?: string,
  ): Promise<Leave> {
    const leave = await this.db.leaves.findUnique({ where: { id: leaveId } });

    if (!leave) {
      throw new NotFoundError("LEAVE_NOT_FOUND", "Leave request not found");
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestError(
        "INVALID_STATUS",
        "Leave is not in pending status",
      );
    }

    return this.db.transaction(async (tx) => {
      // Update leave status
      const updatedLeave = await tx.leaves.update(leaveId, {
        status: LeaveStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date(),
      });

      // Deduct from leave balance (except unpaid)
      if (leave.leaveType !== LeaveType.UNPAID) {
        await this.deductLeaveBalance(
          tx,
          leave.userId,
          leave.leaveType,
          leave.totalDays,
        );
      }

      // Block appointments for leave period
      const affectedAppointments = await tx.appointments.updateMany({
        where: {
          stylistId: leave.userId,
          appointmentDate: { gte: leave.startDate, lte: leave.endDate },
          status: { in: ["booked", "confirmed"] },
        },
        data: {
          status: "cancelled",
          cancellationReason: "Stylist on leave",
          cancelledBy: approverId,
        },
      });

      // Notify staff
      await this.notificationService.notifyLeaveApproved(updatedLeave);

      // Notify affected customers
      if (affectedAppointments.count > 0) {
        await this.notificationService.notifyAppointmentsCancelled(
          leave.userId,
          leave.startDate,
          leave.endDate,
        );
      }

      return updatedLeave;
    });
  }

  /**
   * Initialize leave balances for new financial year
   */
  async initializeLeaveBalances(
    userId: string,
    financialYear: string,
    employmentType: EmploymentType,
  ): Promise<LeaveBalance[]> {
    const entitlements = this.getLeaveEntitlements(employmentType);
    const balances: LeaveBalance[] = [];

    for (const [leaveType, entitlement] of Object.entries(entitlements)) {
      // Check for carry forward from previous year
      const previousYear = this.getPreviousFinancialYear(financialYear);
      const previousBalance = await this.db.leaveBalances.findFirst({
        where: { userId, financialYear: previousYear, leaveType },
      });

      const carriedForward = previousBalance
        ? Math.min(
            previousBalance.currentBalance,
            entitlement.maxCarryForward || 0,
          )
        : 0;

      const balance = await this.db.leaveBalances.create({
        tenantId: this.tenantId,
        userId,
        financialYear,
        leaveType,
        openingBalance: carriedForward,
        accrued: entitlement.annual,
        used: 0,
        lapsed: 0,
        carriedForward,
        currentBalance: carriedForward + entitlement.annual,
      });

      balances.push(balance);
    }

    return balances;
  }
}
```

### 3. Commission Service

```typescript
class CommissionService {
  /**
   * Calculate and lock commission at billing time
   */
  async lockCommission(
    invoiceItem: InvoiceItem,
    branchId: string,
  ): Promise<Commission | null> {
    if (!invoiceItem.stylistId) return null;

    // Get commission rate (priority: staff override > service default)
    const commissionConfig = await this.getCommissionConfig(
      invoiceItem.stylistId,
      invoiceItem.referenceId,
      branchId,
    );

    if (!commissionConfig.enabled) return null;

    // Calculate commission amount
    const commissionAmount =
      commissionConfig.type === "percentage"
        ? (invoiceItem.netAmount * commissionConfig.rate) / 100
        : commissionConfig.rate;

    // Create commission record
    const commission = await this.db.commissions.create({
      tenantId: this.tenantId,
      branchId,
      userId: invoiceItem.stylistId,
      invoiceId: invoiceItem.invoiceId,
      invoiceItemId: invoiceItem.id,
      serviceId: invoiceItem.referenceId,
      serviceName: invoiceItem.name,
      serviceAmount: invoiceItem.netAmount,
      commissionType: commissionConfig.type,
      commissionRate: commissionConfig.rate,
      commissionAmount,
      roleType: "primary",
      status: CommissionStatus.PENDING,
      commissionDate: new Date().toISOString().split("T")[0],
    });

    // Handle assistant commission if applicable
    if (invoiceItem.assistantId) {
      const assistantConfig = await this.getAssistantCommissionConfig(branchId);
      if (assistantConfig.enabled) {
        await this.db.commissions.create({
          tenantId: this.tenantId,
          branchId,
          userId: invoiceItem.assistantId,
          invoiceId: invoiceItem.invoiceId,
          invoiceItemId: invoiceItem.id,
          serviceId: invoiceItem.referenceId,
          serviceName: invoiceItem.name,
          serviceAmount: invoiceItem.netAmount,
          commissionType: assistantConfig.type,
          commissionRate: assistantConfig.rate,
          commissionAmount:
            assistantConfig.type === "percentage"
              ? (invoiceItem.netAmount * assistantConfig.rate) / 100
              : assistantConfig.rate,
          roleType: "assistant",
          status: CommissionStatus.PENDING,
          commissionDate: new Date().toISOString().split("T")[0],
        });
      }
    }

    return commission;
  }

  /**
   * Get commission summary for staff
   */
  async getCommissionSummary(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<CommissionSummary> {
    const commissions = await this.db.commissions.findMany({
      where: {
        userId,
        commissionDate: { gte: startDate, lte: endDate },
      },
    });

    const byStatus = commissions.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + c.commissionAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byService = commissions.reduce(
      (acc, c) => {
        acc[c.serviceName] = (acc[c.serviceName] || 0) + c.commissionAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalEarned: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      pending: byStatus[CommissionStatus.PENDING] || 0,
      approved: byStatus[CommissionStatus.APPROVED] || 0,
      paid: byStatus[CommissionStatus.PAID] || 0,
      byService,
      transactionCount: commissions.length,
    };
  }
}
```

### 4. Payroll Service

```typescript
class PayrollService {
  /**
   * Generate payroll for a month
   */
  async generatePayroll(
    payrollMonth: string,
    branchId?: string,
  ): Promise<Payroll> {
    // Check if payroll already exists
    const existing = await this.db.payroll.findFirst({
      where: { payrollMonth, branchId: branchId || null },
    });

    if (existing && existing.status !== PayrollStatus.DRAFT) {
      throw new ConflictError(
        "PAYROLL_EXISTS",
        "Payroll already exists for this month",
      );
    }

    // Get all active staff
    const staffQuery = branchId
      ? { branchAssignments: { some: { branchId } } }
      : {};

    const staffList = await this.db.staffProfiles.findMany({
      where: { ...staffQuery, isActive: true },
      include: { user: true },
    });

    // Calculate payroll for each staff
    const items: PayrollItemData[] = [];
    const warnings: string[] = [];

    for (const staff of staffList) {
      try {
        const itemData = await this.calculateStaffPayroll(
          staff,
          payrollMonth,
          branchId,
        );
        items.push(itemData);
      } catch (error) {
        warnings.push(
          `Error calculating payroll for ${staff.user.name}: ${error.message}`,
        );
      }
    }

    // Create or update payroll
    const payroll = existing
      ? await this.db.payroll.update(existing.id, {
          status: PayrollStatus.DRAFT,
          totalEmployees: items.length,
          totalGrossSalary: items.reduce((sum, i) => sum + i.grossSalary, 0),
          totalDeductions: items.reduce((sum, i) => sum + i.totalDeductions, 0),
          totalCommissions: items.reduce(
            (sum, i) => sum + i.totalCommissions,
            0,
          ),
          totalNetSalary: items.reduce((sum, i) => sum + i.netSalary, 0),
          updatedAt: new Date(),
        })
      : await this.db.payroll.create({
          tenantId: this.tenantId,
          branchId,
          payrollMonth,
          status: PayrollStatus.DRAFT,
          totalEmployees: items.length,
          totalGrossSalary: items.reduce((sum, i) => sum + i.grossSalary, 0),
          totalDeductions: items.reduce((sum, i) => sum + i.totalDeductions, 0),
          totalCommissions: items.reduce(
            (sum, i) => sum + i.totalCommissions,
            0,
          ),
          totalNetSalary: items.reduce((sum, i) => sum + i.netSalary, 0),
        });

    // Create payroll items
    for (const itemData of items) {
      await this.db.payrollItems.create({
        tenantId: this.tenantId,
        payrollId: payroll.id,
        ...itemData,
      });
    }

    return payroll;
  }

  /**
   * Calculate payroll for single staff member
   */
  private async calculateStaffPayroll(
    staff: StaffProfile,
    payrollMonth: string,
    branchId?: string,
  ): Promise<PayrollItemData> {
    const [year, month] = payrollMonth.split("-").map(Number);
    const startDate = `${payrollMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    // Get attendance summary
    const attendance = await this.getAttendanceSummary(
      staff.userId,
      startDate,
      endDate,
      branchId,
    );

    // Get salary structure
    const salaryStructure = await this.getSalaryStructure(staff.userId);

    // Calculate earnings
    const earnings: Record<string, number> = {};
    let totalEarnings = 0;

    for (const component of salaryStructure.filter(
      (c) => c.componentType === "earning",
    )) {
      const amount = this.calculateComponent(
        component,
        staff.baseSalary,
        attendance,
      );
      earnings[component.code] = amount;
      totalEarnings += amount;
    }

    // Get commissions for the month
    const commissions = await this.db.commissions.findMany({
      where: {
        userId: staff.userId,
        commissionDate: { gte: startDate, lte: endDate },
        status: { in: [CommissionStatus.PENDING, CommissionStatus.APPROVED] },
      },
    });
    const totalCommissions = commissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0,
    );

    // Calculate deductions
    const deductions: Record<string, number> = {};
    let totalDeductions = 0;

    // Salary component deductions
    for (const component of salaryStructure.filter(
      (c) => c.componentType === "deduction",
    )) {
      const amount = this.calculateComponent(
        component,
        staff.baseSalary,
        attendance,
      );
      deductions[component.code] = amount;
      totalDeductions += amount;
    }

    // Active deductions (loans, advances)
    const activeDeductions = await this.db.staffDeductions.findMany({
      where: { userId: staff.userId, status: "active" },
    });
    for (const ded of activeDeductions) {
      deductions[ded.deductionType] =
        (deductions[ded.deductionType] || 0) + ded.monthlyDeduction;
      totalDeductions += ded.monthlyDeduction;
    }

    // Calculate LOP (Loss of Pay)
    const lopDays = attendance.absentDays;
    const perDaySalary = staff.baseSalary / attendance.workingDays;
    const lopAmount = lopDays * perDaySalary;
    totalDeductions += lopAmount;

    // Calculate overtime
    const overtimeRate =
      (staff.baseSalary / (attendance.workingDays * 8)) * 1.5;
    const overtimeAmount = attendance.overtimeHours * overtimeRate;
    totalEarnings += overtimeAmount;

    // Calculate gross and net
    const grossSalary = totalEarnings + totalCommissions;
    const netSalary = grossSalary - totalDeductions;

    return {
      userId: staff.userId,
      workingDays: attendance.workingDays,
      presentDays: attendance.presentDays,
      absentDays: attendance.absentDays,
      leaveDays: attendance.leaveDays,
      overtimeHours: attendance.overtimeHours,
      baseSalary: staff.baseSalary,
      earningsJson: earnings,
      totalEarnings,
      totalCommissions,
      commissionCount: commissions.length,
      deductionsJson: deductions,
      totalDeductions,
      overtimeRate,
      overtimeAmount,
      lopDays,
      lopAmount,
      grossSalary,
      netSalary,
    };
  }

  /**
   * Process and approve payroll
   */
  async processPayroll(payrollId: string, userId: string): Promise<Payroll> {
    const payroll = await this.db.payroll.findUnique({
      where: { id: payrollId },
      include: { items: true },
    });

    if (!payroll) {
      throw new NotFoundError("PAYROLL_NOT_FOUND", "Payroll not found");
    }

    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new BadRequestError(
        "INVALID_STATUS",
        "Payroll is not in draft status",
      );
    }

    return this.db.transaction(async (tx) => {
      // Update payroll status
      const updatedPayroll = await tx.payroll.update(payrollId, {
        status: PayrollStatus.PROCESSING,
        processedAt: new Date(),
        processedBy: userId,
      });

      // Mark commissions as approved
      for (const item of payroll.items!) {
        await tx.commissions.updateMany({
          where: {
            userId: item.userId,
            status: CommissionStatus.PENDING,
            payrollId: null,
          },
          data: {
            status: CommissionStatus.APPROVED,
            payrollId,
          },
        });
      }

      return updatedPayroll;
    });
  }

  /**
   * Generate payslips
   */
  async generatePayslips(payrollId: string): Promise<Payslip[]> {
    const payroll = await this.db.payroll.findUnique({
      where: { id: payrollId },
      include: { items: { include: { user: true } } },
    });

    if (!payroll) {
      throw new NotFoundError("PAYROLL_NOT_FOUND", "Payroll not found");
    }

    const payslips: Payslip[] = [];

    for (const item of payroll.items!) {
      // Generate payslip number
      const payslipNumber = await this.generatePayslipNumber(
        payroll.payrollMonth,
      );

      // Generate PDF
      const pdfUrl = await this.pdfService.generatePayslip(item, payroll);

      // Create payslip record
      const payslip = await this.db.payslips.create({
        tenantId: this.tenantId,
        payrollItemId: item.id,
        userId: item.userId,
        payslipNumber,
        payslipMonth: payroll.payrollMonth,
        pdfUrl,
        generatedAt: new Date(),
      });

      payslips.push(payslip);
    }

    return payslips;
  }
}
```

---

## Validation Schemas

```typescript
import { z } from "zod";

// =====================================================
// CREATE STAFF
// =====================================================
export const createStaffSchema = z.object({
  // User account
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  password: z.string().min(8).max(50),
  role: z.enum(["branch_manager", "receptionist", "stylist", "accountant"]),

  // Profile
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  bloodGroup: z.string().max(5).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),

  // Address
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),

  // Employment
  employeeCode: z.string().max(50).optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  dateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]),

  // Skills
  skillLevel: z.enum(["junior", "senior", "expert"]).optional(),
  specializations: z.array(z.string()).optional(),

  // Documents
  aadharNumber: z
    .string()
    .regex(/^\d{12}$/)
    .optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional(),
  bankAccountNumber: z.string().max(30).optional(),
  bankName: z.string().max(100).optional(),
  bankIfsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .optional(),

  // Salary
  salaryType: z.enum(["monthly", "daily", "hourly"]),
  baseSalary: z.number().min(0),

  // Commission
  commissionEnabled: z.boolean().default(true),
  defaultCommissionType: z.enum(["percentage", "flat"]).optional(),
  defaultCommissionRate: z.number().min(0).max(100).optional(),

  // Branch assignments
  branchAssignments: z
    .array(
      z.object({
        branchId: z.string().uuid(),
        isPrimary: z.boolean(),
        workingHoursOverride: z
          .record(
            z.object({
              start: z.string().regex(/^\d{2}:\d{2}$/),
              end: z.string().regex(/^\d{2}:\d{2}$/),
            }),
          )
          .optional(),
        commissionOverride: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1),
});

// =====================================================
// ATTENDANCE
// =====================================================
export const checkInSchema = z.object({
  branchId: z.string().uuid(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  deviceInfo: z
    .object({
      deviceId: z.string(),
      deviceType: z.string(),
    })
    .optional(),
});

export const manualAttendanceSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkInTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  checkOutTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  status: z.enum([
    "present",
    "absent",
    "half_day",
    "on_leave",
    "holiday",
    "week_off",
  ]),
  notes: z.string().min(10).max(500), // Mandatory for manual entries
});

// =====================================================
// LEAVE
// =====================================================
export const applyLeaveSchema = z
  .object({
    branchId: z.string().uuid(),
    leaveType: z.enum([
      "casual",
      "sick",
      "earned",
      "unpaid",
      "maternity",
      "paternity",
      "comp_off",
    ]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isHalfDay: z.boolean().default(false),
    halfDayType: z.enum(["first_half", "second_half"]).optional(),
    reason: z.string().min(10).max(500),
  })
  .refine(
    (data) => {
      if (data.isHalfDay && !data.halfDayType) {
        return false;
      }
      return true;
    },
    { message: "halfDayType is required when isHalfDay is true" },
  )
  .refine(
    (data) => {
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    { message: "startDate must be before or equal to endDate" },
  );

export const approveLeaveSchema = z.object({
  comment: z.string().max(500).optional(),
});

export const rejectLeaveSchema = z.object({
  reason: z.string().min(10).max(500),
});

// =====================================================
// SHIFT
// =====================================================
export const createShiftSchema = z.object({
  name: z.string().min(2).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakDurationMinutes: z.number().int().min(0).max(120).default(0),
  applicableDays: z.array(z.number().int().min(0).max(6)).min(1),
});

export const assignShiftSchema = z.object({
  shiftId: z.string().uuid(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// =====================================================
// PAYROLL
// =====================================================
export const generatePayrollSchema = z.object({
  branchId: z.string().uuid().optional(),
  payrollMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

export const processPayrollSchema = z.object({
  adjustments: z
    .array(
      z.object({
        userId: z.string().uuid(),
        adjustmentType: z.enum(["bonus", "deduction", "correction"]),
        amount: z.number(),
        reason: z.string().min(10).max(255),
      }),
    )
    .optional(),
});

// =====================================================
// DEDUCTIONS
// =====================================================
export const addDeductionSchema = z
  .object({
    deductionType: z.enum(["loan", "advance", "emi", "penalty", "other"]),
    description: z.string().min(5).max(255),
    totalAmount: z.number().min(0),
    monthlyDeduction: z.number().min(0),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine(
    (data) => {
      return data.monthlyDeduction <= data.totalAmount;
    },
    { message: "monthlyDeduction cannot exceed totalAmount" },
  );
```

---

## Integration Points

### Inbound Dependencies (This module uses)

| Module            | Integration             | Purpose                                 |
| ----------------- | ----------------------- | --------------------------------------- |
| Tenant Management | User accounts, branches | Staff user creation, branch assignments |
| Billing           | Invoice items           | Commission calculation at billing       |
| Appointments      | Stylist bookings        | Block slots during leave                |

### Outbound Dependencies (Other modules use this)

| Module       | Integration              | Purpose                         |
| ------------ | ------------------------ | ------------------------------- |
| Appointments | Stylist availability     | Check availability for booking  |
| Billing      | Commission rates         | Calculate commission at billing |
| Reports      | Attendance, payroll data | Staff performance reports       |
| Expenses     | Salary payments          | Track salary as expense         |

### Event Emissions

```typescript
// Events emitted by this module
const STAFF_EVENTS = {
  // Staff lifecycle
  STAFF_CREATED: "staff.created",
  STAFF_UPDATED: "staff.updated",
  STAFF_DEACTIVATED: "staff.deactivated",

  // Attendance
  STAFF_CHECKED_IN: "attendance.checked_in",
  STAFF_CHECKED_OUT: "attendance.checked_out",
  ATTENDANCE_MARKED: "attendance.marked",

  // Leave
  LEAVE_REQUESTED: "leave.requested",
  LEAVE_APPROVED: "leave.approved",
  LEAVE_REJECTED: "leave.rejected",
  LEAVE_CANCELLED: "leave.cancelled",

  // Commission
  COMMISSION_EARNED: "commission.earned",
  COMMISSION_APPROVED: "commission.approved",
  COMMISSION_PAID: "commission.paid",

  // Payroll
  PAYROLL_GENERATED: "payroll.generated",
  PAYROLL_PROCESSED: "payroll.processed",
  PAYROLL_APPROVED: "payroll.approved",
  PAYROLL_PAID: "payroll.paid",
  PAYSLIP_GENERATED: "payslip.generated",
};

// Event payload examples
interface StaffCheckedInEvent {
  userId: string;
  tenantId: string;
  branchId: string;
  checkInTime: string;
  isLate: boolean;
  lateMinutes: number;
}

interface LeaveApprovedEvent {
  leaveId: string;
  userId: string;
  tenantId: string;
  branchId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  appointmentsAffected: number;
}

interface PayrollPaidEvent {
  payrollId: string;
  tenantId: string;
  branchId?: string;
  payrollMonth: string;
  totalEmployees: number;
  totalNetSalary: number;
}
```

---

## Error Handling

```typescript
// Staff module error codes
export const STAFF_ERRORS = {
  // Staff profile errors
  STAFF_NOT_FOUND: {
    code: "STF_001",
    message: "Staff member not found",
    httpStatus: 404,
  },
  STAFF_ALREADY_EXISTS: {
    code: "STF_002",
    message: "Staff with this email/phone already exists",
    httpStatus: 409,
  },
  INVALID_EMPLOYEE_CODE: {
    code: "STF_003",
    message: "Employee code already in use",
    httpStatus: 409,
  },
  STAFF_INACTIVE: {
    code: "STF_004",
    message: "Staff member is inactive",
    httpStatus: 400,
  },

  // Attendance errors
  ALREADY_CHECKED_IN: {
    code: "ATT_001",
    message: "Already checked in today",
    httpStatus: 409,
  },
  ALREADY_CHECKED_OUT: {
    code: "ATT_002",
    message: "Already checked out today",
    httpStatus: 409,
  },
  NO_CHECK_IN: {
    code: "ATT_003",
    message: "No check-in found for today",
    httpStatus: 400,
  },
  NO_SHIFT_ASSIGNED: {
    code: "ATT_004",
    message: "No shift assigned for today",
    httpStatus: 400,
  },
  ATTENDANCE_LOCKED: {
    code: "ATT_005",
    message: "Attendance for this period is locked",
    httpStatus: 403,
  },
  INVALID_LOCATION: {
    code: "ATT_006",
    message: "Check-in location is outside allowed radius",
    httpStatus: 400,
  },

  // Leave errors
  LEAVE_NOT_FOUND: {
    code: "LEV_001",
    message: "Leave request not found",
    httpStatus: 404,
  },
  INSUFFICIENT_LEAVE_BALANCE: {
    code: "LEV_002",
    message: "Insufficient leave balance",
    httpStatus: 400,
  },
  OVERLAPPING_LEAVE: {
    code: "LEV_003",
    message: "Leave request overlaps with existing leave",
    httpStatus: 409,
  },
  INVALID_LEAVE_STATUS: {
    code: "LEV_004",
    message: "Invalid leave status for this action",
    httpStatus: 400,
  },
  LEAVE_PERIOD_PASSED: {
    code: "LEV_005",
    message: "Cannot apply leave for past dates",
    httpStatus: 400,
  },

  // Shift errors
  SHIFT_NOT_FOUND: {
    code: "SHF_001",
    message: "Shift not found",
    httpStatus: 404,
  },
  SHIFT_OVERLAP: {
    code: "SHF_002",
    message: "Shift times overlap with existing shift",
    httpStatus: 409,
  },
  INVALID_SHIFT_TIMES: {
    code: "SHF_003",
    message: "End time must be after start time",
    httpStatus: 400,
  },

  // Commission errors
  COMMISSION_NOT_FOUND: {
    code: "COM_001",
    message: "Commission record not found",
    httpStatus: 404,
  },
  COMMISSION_ALREADY_PAID: {
    code: "COM_002",
    message: "Commission has already been paid",
    httpStatus: 400,
  },
  COMMISSION_CANCELLED: {
    code: "COM_003",
    message: "Commission has been cancelled",
    httpStatus: 400,
  },

  // Payroll errors
  PAYROLL_NOT_FOUND: {
    code: "PAY_001",
    message: "Payroll not found",
    httpStatus: 404,
  },
  PAYROLL_EXISTS: {
    code: "PAY_002",
    message: "Payroll already exists for this month",
    httpStatus: 409,
  },
  INVALID_PAYROLL_STATUS: {
    code: "PAY_003",
    message: "Invalid payroll status for this action",
    httpStatus: 400,
  },
  PAYROLL_ALREADY_PAID: {
    code: "PAY_004",
    message: "Payroll has already been paid",
    httpStatus: 400,
  },
  INCOMPLETE_ATTENDANCE: {
    code: "PAY_005",
    message: "Attendance data is incomplete for some staff",
    httpStatus: 400,
  },

  // Deduction errors
  DEDUCTION_NOT_FOUND: {
    code: "DED_001",
    message: "Deduction not found",
    httpStatus: 404,
  },
  DEDUCTION_COMPLETED: {
    code: "DED_002",
    message: "Deduction has already been completed",
    httpStatus: 400,
  },
  INVALID_DEDUCTION_AMOUNT: {
    code: "DED_003",
    message: "Monthly deduction exceeds remaining amount",
    httpStatus: 400,
  },
};
```

---

## Testing Considerations

### Unit Tests

```typescript
describe("AttendanceService", () => {
  describe("checkIn", () => {
    it("should record check-in with correct timestamp");
    it("should calculate late minutes correctly");
    it("should validate geo-location when enabled");
    it("should reject duplicate check-in");
    it("should handle staff without assigned shift");
  });

  describe("checkOut", () => {
    it("should calculate actual hours correctly");
    it("should calculate overtime hours");
    it("should mark half-day when hours below threshold");
    it("should reject check-out without check-in");
  });

  describe("autoMarkAbsent", () => {
    it("should mark absent for staff without check-in");
    it("should mark on-leave for staff with approved leave");
    it("should mark week-off for staff on weekly off");
  });
});

describe("LeaveService", () => {
  describe("applyLeave", () => {
    it("should calculate leave days correctly");
    it("should check leave balance");
    it("should detect overlapping leaves");
    it("should allow unpaid leave without balance check");
  });

  describe("approveLeave", () => {
    it("should deduct from leave balance");
    it("should cancel affected appointments");
    it("should notify staff and customers");
  });
});

describe("CommissionService", () => {
  describe("lockCommission", () => {
    it("should calculate percentage commission correctly");
    it("should calculate flat commission correctly");
    it("should use staff override when available");
    it("should handle assistant commission");
  });
});

describe("PayrollService", () => {
  describe("generatePayroll", () => {
    it("should calculate earnings from salary structure");
    it("should include commissions");
    it("should calculate deductions");
    it("should calculate LOP correctly");
    it("should calculate overtime correctly");
  });

  describe("processPayroll", () => {
    it("should update commission status");
    it("should update deduction remaining amounts");
  });
});
```

### Integration Tests

```typescript
describe("Staff Management Integration", () => {
  it("should complete full attendance cycle: check-in → check-out → summary");
  it("should complete leave flow: apply → approve → attendance marked");
  it("should complete payroll flow: generate → process → approve → pay");
  it("should block appointments when leave is approved");
  it("should calculate commission correctly at billing");
});
```

---

## Performance Considerations

1. **Attendance Queries**: Index on (branch_id, user_id, attendance_date) for fast lookups
2. **Leave Balance**: Cache current balance, update on leave approval/rejection
3. **Commission Aggregation**: Pre-aggregate monthly totals for dashboard
4. **Payroll Generation**: Process in batches for large staff counts
5. **Payslip PDF**: Generate asynchronously, store in S3

---

## Security Considerations

1. **Salary Data**: Encrypt bank account numbers, restrict access to HR/Accountant roles
2. **Attendance Manipulation**: Log all manual entries, require approval for backdated entries
3. **Commission Tampering**: Lock commissions at billing, prevent post-billing edits
4. **Payroll Access**: Restrict to Super_Owner and Accountant roles
5. **Document Storage**: Encrypt ID documents (Aadhaar, PAN) at rest
6. **Geo-Location**: Store location data only when geo-validation is enabled
7. **Audit Trail**: Log all sensitive operations (salary changes, attendance overrides, payroll approvals)
