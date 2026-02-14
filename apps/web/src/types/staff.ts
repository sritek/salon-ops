/**
 * Staff Management Types
 */

// ============================================
// Enums
// ============================================

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type SkillLevel = 'junior' | 'senior' | 'expert';
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'on_leave'
  | 'holiday'
  | 'week_off';
export type LeaveType =
  | 'casual'
  | 'sick'
  | 'earned'
  | 'unpaid'
  | 'maternity'
  | 'paternity'
  | 'comp_off';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type PayrollStatus = 'draft' | 'processing' | 'approved' | 'paid' | 'cancelled';
export type DeductionType = 'loan' | 'advance' | 'emi' | 'penalty' | 'other';
export type DeductionStatus = 'active' | 'completed' | 'cancelled';

// ============================================
// Staff Profile
// ============================================

export interface StaffProfile {
  id: string;
  tenantId: string;
  userId: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  dateOfJoining: string;
  dateOfLeaving?: string;
  employmentType: EmploymentType;
  skillLevel?: SkillLevel;
  specializations: string[];
  aadharNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfsc?: string;
  salaryType: string;
  baseSalary: number;
  commissionEnabled: boolean;
  defaultCommissionType?: string;
  defaultCommissionRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: StaffUser;
}

export interface StaffUser {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
  gender?: string;
  avatarUrl?: string;
  isActive: boolean;
  branchAssignments?: BranchAssignment[];
}

export interface BranchAssignment {
  id: string;
  branchId: string;
  isPrimary: boolean;
  branch?: {
    id: string;
    name: string;
  };
}

// ============================================
// Shift
// ============================================

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
  createdAt: string;
}

export interface StaffShiftAssignment {
  id: string;
  tenantId: string;
  userId: string;
  branchId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  createdAt: string;
  shift?: Shift;
}

// ============================================
// Attendance
// ============================================

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
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  staffProfile?: StaffProfile;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  holidays: number;
  weekOffs: number;
  totalOvertimeHours: number;
  totalLateMinutes: number;
}

// ============================================
// Leave
// ============================================

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
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  staffProfile?: StaffProfile;
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
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Commission
// ============================================

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
  paidAt?: string;
  commissionDate: string;
  createdAt: string;
  staffProfile?: StaffProfile;
}

export interface CommissionSummary {
  totalEarned: number;
  pending: number;
  approved: number;
  paid: number;
  byService: Record<string, number>;
  transactionCount: number;
}

// ============================================
// Deduction
// ============================================

export interface StaffDeduction {
  id: string;
  tenantId: string;
  userId: string;
  deductionType: DeductionType;
  description: string;
  totalAmount: number;
  monthlyDeduction: number;
  remainingAmount: number;
  startDate: string;
  endDate?: string;
  status: DeductionStatus;
  createdAt: string;
  createdBy?: string;
}

// ============================================
// Payroll
// ============================================

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
  processedAt?: string;
  processedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  paidBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  paidAt?: string;
  createdAt: string;
  staffProfile?: StaffProfile;
}

// ============================================
// Payslip
// ============================================

export type PayslipStatus = 'generated' | 'sent' | 'failed';

export interface Payslip {
  id: string;
  tenantId: string;
  payrollItemId: string;
  userId: string;
  payslipNumber: string;
  payPeriod: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  pdfUrl?: string;
  emailedAt?: string;
  emailStatus?: string;
  whatsappSentAt?: string;
  whatsappStatus?: string;
  generatedAt: string;
  createdAt: string;
  staffProfile?: StaffProfile;
}

// ============================================
// API Input Types
// ============================================

export interface CreateStaffInput {
  name: string;
  email?: string;
  phone: string;
  password: string;
  role: 'branch_manager' | 'receptionist' | 'stylist' | 'accountant';
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  dateOfJoining: string;
  employmentType: EmploymentType;
  skillLevel?: SkillLevel;
  specializations?: string[];
  aadharNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfsc?: string;
  salaryType: 'monthly' | 'daily' | 'hourly';
  baseSalary: number;
  commissionEnabled?: boolean;
  defaultCommissionType?: 'percentage' | 'flat';
  defaultCommissionRate?: number;
  branchAssignments: {
    branchId: string;
    isPrimary: boolean;
  }[];
}

export interface UpdateStaffInput extends Partial<
  Omit<CreateStaffInput, 'password' | 'phone' | 'branchAssignments'>
> {}

export interface CheckInInput {
  branchId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CheckOutInput {
  branchId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ManualAttendanceInput {
  userId: string;
  branchId: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  notes: string;
}

export interface ApplyLeaveInput {
  branchId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayType?: 'first_half' | 'second_half';
  reason: string;
}

export interface AddDeductionInput {
  deductionType: DeductionType;
  description: string;
  totalAmount: number;
  monthlyDeduction: number;
  startDate: string;
  endDate?: string;
}

export interface GeneratePayrollInput {
  branchId?: string;
  payrollMonth: string;
}
