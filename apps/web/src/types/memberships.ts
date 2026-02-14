/**
 * Memberships & Packages Module Types
 * Frontend type definitions for the memberships management module
 */

// ============================================
// Enums
// ============================================

export type ValidityUnit = 'days' | 'months' | 'years';

export type RefundPolicy = 'refundable' | 'non_refundable' | 'partial';

export type BranchScope = 'all_branches' | 'specific_branches';

export type MembershipPackagePrecedence = 'package_first' | 'membership_only' | 'customer_choice';

export type MembershipTier = 'silver' | 'gold' | 'platinum';

export type BenefitType =
  | 'flat_discount'
  | 'service_discount'
  | 'product_discount'
  | 'complimentary_service'
  | 'priority_booking'
  | 'visit_limit'
  | 'cooldown_period'
  | 'benefit_cap'
  | 'fallback_discount';

export type ComplimentaryPeriod = 'per_visit' | 'per_month' | 'per_year' | 'total';

export type DiscountType = 'percentage' | 'flat';

export type MembershipStatus =
  | 'pending'
  | 'active'
  | 'frozen'
  | 'expired'
  | 'cancelled'
  | 'transferred';

export type FreezeReasonCode = 'travel' | 'medical' | 'personal' | 'other';

export type FreezeStatus = 'requested' | 'active' | 'completed' | 'cancelled';

export type PackageType = 'service_package' | 'value_package' | 'combo_package';

export type PackageStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'exhausted'
  | 'cancelled'
  | 'transferred';

export type CommissionType = 'percentage' | 'flat';

// ============================================
// Membership Config Types
// ============================================

export interface MembershipConfig {
  id: string;
  tenantId: string;
  membershipsEnabled: boolean;
  packagesEnabled: boolean;
  defaultValidityUnit: ValidityUnit;
  defaultValidityValue: number;
  refundPolicy: RefundPolicy;
  cancellationFeePercentage: number;
  defaultBranchScope: BranchScope;
  membershipPackagePrecedence: MembershipPackagePrecedence;
  gracePeriodDays: number;
  maxFreezeDaysPerYear: number;
  expiryReminderDays: number;
  lowBalanceThreshold: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Membership Plan Types
// ============================================

export interface MembershipPlanBranch {
  id: string;
  planId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
}

export interface MembershipBenefit {
  id: string;
  tenantId: string;
  planId: string;
  benefitType: BenefitType;
  serviceId?: string | null;
  categoryId?: string | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  complimentaryCount?: number | null;
  complimentaryPeriod?: ComplimentaryPeriod | null;
  maxServicesPerVisit?: number | null;
  cooldownDays?: number | null;
  benefitCapAmount?: number | null;
  benefitCapPeriod?: string | null;
  priorityLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  service?: {
    id: string;
    name: string;
  } | null;
  category?: {
    id: string;
    name: string;
  } | null;
}

export interface MembershipPlan {
  id: string;
  tenantId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  tier?: MembershipTier | null;
  price: number;
  gstRate: number;
  validityValue: number;
  validityUnit: ValidityUnit;
  branchScope: BranchScope;
  termsAndConditions?: string | null;
  saleCommissionType?: CommissionType | null;
  saleCommissionValue?: number | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Relations
  branches?: MembershipPlanBranch[];
  benefits?: MembershipBenefit[];
  _count?: {
    customerMemberships: number;
  };
}

// ============================================
// Customer Membership Types
// ============================================

export interface MembershipFreeze {
  id: string;
  tenantId: string;
  membershipId: string;
  freezeStartDate: string;
  freezeEndDate: string;
  freezeDays: number;
  reasonCode: FreezeReasonCode;
  reasonDescription?: string | null;
  status: FreezeStatus;
  requestedAt: string;
  requestedBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt: string;
}

export interface MembershipUsage {
  id: string;
  tenantId: string;
  membershipId: string;
  usageDate: string;
  usageBranchId: string;
  invoiceId: string;
  invoiceItemId?: string | null;
  serviceId?: string | null;
  serviceName: string;
  benefitType: BenefitType;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  isComplimentary: boolean;
  complimentaryBenefitId?: string | null;
  createdAt: string;
  createdBy?: string | null;
  // Relations
  usageBranch?: {
    id: string;
    name: string;
  };
}

export interface CustomerMembership {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  membershipNumber: string;
  purchaseDate: string;
  purchaseBranchId: string;
  purchaseInvoiceId?: string | null;
  pricePaid: number;
  gstPaid: number;
  totalPaid: number;
  activationDate: string;
  originalExpiryDate: string;
  currentExpiryDate: string;
  status: MembershipStatus;
  totalFreezeDaysUsed: number;
  totalVisits: number;
  totalDiscountAvailed: number;
  lastVisitDate?: string | null;
  lastVisitBranchId?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  refundAmount?: number | null;
  transferredToId?: string | null;
  transferredFromId?: string | null;
  saleCommissionAmount?: number | null;
  saleCommissionStaffId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Relations
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  plan?: MembershipPlan;
  purchaseBranch?: {
    id: string;
    name: string;
  };
  freezes?: MembershipFreeze[];
  usage?: MembershipUsage[];
}

// ============================================
// Package Types
// ============================================

export interface PackageBranch {
  id: string;
  packageId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
}

export interface PackageService {
  id: string;
  tenantId: string;
  packageId: string;
  serviceId: string;
  creditCount: number;
  lockedPrice: number;
  variantId?: string | null;
  createdAt: string;
  // Relations
  service?: {
    id: string;
    name: string;
  };
  variant?: {
    id: string;
    name: string;
  } | null;
}

export interface Package {
  id: string;
  tenantId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  packageType: PackageType;
  price: number;
  mrp?: number | null;
  gstRate: number;
  creditValue?: number | null;
  validityValue: number;
  validityUnit: ValidityUnit;
  branchScope: BranchScope;
  allowRollover: boolean;
  termsAndConditions?: string | null;
  saleCommissionType?: CommissionType | null;
  saleCommissionValue?: number | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Relations
  branches?: PackageBranch[];
  services?: PackageService[];
  _count?: {
    customerPackages: number;
  };
}

// ============================================
// Customer Package Types
// ============================================

export interface PackageCredit {
  id: string;
  tenantId: string;
  customerPackageId: string;
  packageServiceId: string;
  serviceId: string;
  initialCredits: number;
  remainingCredits: number;
  lockedPrice: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  service?: {
    id: string;
    name: string;
  };
}

export interface PackageRedemption {
  id: string;
  tenantId: string;
  customerPackageId: string;
  packageCreditId?: string | null;
  redemptionDate: string;
  redemptionBranchId: string;
  invoiceId: string;
  invoiceItemId?: string | null;
  serviceId: string;
  serviceName: string;
  creditsUsed?: number | null;
  valueUsed?: number | null;
  lockedPrice: number;
  stylistId?: string | null;
  redemptionCommissionAmount?: number | null;
  createdAt: string;
  createdBy?: string | null;
  // Relations
  redemptionBranch?: {
    id: string;
    name: string;
  };
}

export interface CustomerPackage {
  id: string;
  tenantId: string;
  customerId: string;
  packageId: string;
  packageNumber: string;
  purchaseDate: string;
  purchaseBranchId: string;
  purchaseInvoiceId?: string | null;
  pricePaid: number;
  gstPaid: number;
  totalPaid: number;
  initialCreditValue?: number | null;
  remainingCreditValue?: number | null;
  activationDate: string;
  expiryDate: string;
  status: PackageStatus;
  totalRedemptions: number;
  totalRedeemedValue: number;
  lastRedemptionDate?: string | null;
  lastRedemptionBranchId?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  refundAmount?: number | null;
  transferredToId?: string | null;
  transferredFromId?: string | null;
  saleCommissionAmount?: number | null;
  saleCommissionStaffId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Relations
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  package?: Package;
  purchaseBranch?: {
    id: string;
    name: string;
  };
  credits?: PackageCredit[];
  redemptions?: PackageRedemption[];
}

// ============================================
// Redemption Types
// ============================================

export interface ApplicableBenefit {
  serviceId: string;
  benefitType: BenefitType;
  discountAmount: number;
  isComplimentary: boolean;
}

export interface MembershipBenefitCheck {
  membershipId: string;
  membershipNumber: string;
  planName: string;
  status: MembershipStatus;
  expiryDate: string;
  applicableBenefits: ApplicableBenefit[];
  totalDiscount: number;
}

export interface AvailableCredit {
  serviceId: string;
  serviceName: string;
  remainingCredits: number;
  lockedPrice: number;
}

export interface PackageBenefitCheck {
  packageId: string;
  packageNumber: string;
  packageName: string;
  status: PackageStatus;
  expiryDate: string;
  availableCredits: AvailableCredit[];
  remainingValue?: number;
}

export interface CheckBenefitsResponse {
  memberships: MembershipBenefitCheck[];
  packages: PackageBenefitCheck[];
  precedenceRule: MembershipPackagePrecedence;
  recommendedOption: 'membership' | 'package' | 'both';
}

export interface CustomerBenefitsSummary {
  customerId: string;
  activeMemberships: CustomerMembership[];
  activePackages: CustomerPackage[];
  totalMembershipValue: number;
  totalPackageCredits: number;
  totalPackageValue: number;
}

// ============================================
// Input Types - Membership Config
// ============================================

export interface UpdateMembershipConfigInput {
  membershipsEnabled?: boolean;
  packagesEnabled?: boolean;
  defaultValidityUnit?: ValidityUnit;
  defaultValidityValue?: number;
  refundPolicy?: RefundPolicy;
  cancellationFeePercentage?: number;
  defaultBranchScope?: BranchScope;
  membershipPackagePrecedence?: MembershipPackagePrecedence;
  gracePeriodDays?: number;
  maxFreezeDaysPerYear?: number;
  expiryReminderDays?: number;
  lowBalanceThreshold?: number;
}

// ============================================
// Input Types - Membership Plan
// ============================================

export interface CreateBenefitInput {
  benefitType: BenefitType;
  serviceId?: string | null;
  categoryId?: string | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  complimentaryCount?: number | null;
  complimentaryPeriod?: ComplimentaryPeriod | null;
  maxServicesPerVisit?: number | null;
  cooldownDays?: number | null;
  benefitCapAmount?: number | null;
  benefitCapPeriod?: string | null;
}

export interface CreateMembershipPlanInput {
  name: string;
  code?: string | null;
  description?: string | null;
  tier?: MembershipTier | null;
  price: number;
  gstRate?: number;
  validityValue: number;
  validityUnit: ValidityUnit;
  branchScope: BranchScope;
  branchIds?: string[];
  termsAndConditions?: string | null;
  saleCommissionType?: CommissionType | null;
  saleCommissionValue?: number | null;
  benefits?: CreateBenefitInput[];
}

export interface UpdateMembershipPlanInput {
  name?: string;
  code?: string | null;
  description?: string | null;
  tier?: MembershipTier | null;
  price?: number;
  gstRate?: number;
  validityValue?: number;
  validityUnit?: ValidityUnit;
  branchScope?: BranchScope;
  branchIds?: string[];
  termsAndConditions?: string | null;
  saleCommissionType?: CommissionType | null;
  saleCommissionValue?: number | null;
  isActive?: boolean;
  displayOrder?: number;
}

export interface MembershipPlanFilters {
  page?: number;
  limit?: number;
  isActive?: boolean;
  tier?: MembershipTier;
  branchId?: string;
  search?: string;
  sortBy?: 'name' | 'price' | 'createdAt' | 'displayOrder';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Input Types - Customer Membership
// ============================================

export interface SellMembershipInput {
  customerId: string;
  planId: string;
  branchId: string;
  activationDate?: string;
  staffId?: string;
}

export interface FreezeMembershipInput {
  freezeStartDate: string;
  freezeEndDate: string;
  reasonCode: FreezeReasonCode;
  reasonDescription?: string;
}

export interface CancelMembershipInput {
  reason: string;
  refundMethod: 'wallet' | 'cash' | 'none';
}

export interface CustomerMembershipFilters {
  page?: number;
  limit?: number;
  customerId?: string;
  planId?: string;
  branchId?: string;
  status?: MembershipStatus | MembershipStatus[];
  expiringWithinDays?: number;
  search?: string;
  sortBy?: 'membershipNumber' | 'purchaseDate' | 'currentExpiryDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Input Types - Package
// ============================================

export interface CreatePackageServiceInput {
  serviceId: string;
  variantId?: string | null;
  creditCount: number;
}

export interface CreatePackageInput {
  name: string;
  code?: string | null;
  description?: string | null;
  packageType: PackageType;
  price: number;
  mrp?: number | null;
  gstRate?: number;
  creditValue?: number | null;
  validityValue: number;
  validityUnit: ValidityUnit;
  branchScope: BranchScope;
  branchIds?: string[];
  allowRollover?: boolean;
  termsAndConditions?: string | null;
  saleCommissionType?: CommissionType | null;
  saleCommissionValue?: number | null;
  services?: CreatePackageServiceInput[];
}

export interface UpdatePackageInput {
  name?: string;
  code?: string | null;
  description?: string | null;
  price?: number;
  mrp?: number | null;
  gstRate?: number;
  creditValue?: number | null;
  validityValue?: number;
  validityUnit?: ValidityUnit;
  branchScope?: BranchScope;
  branchIds?: string[];
  allowRollover?: boolean;
  termsAndConditions?: string | null;
  saleCommissionType?: CommissionType | null;
  saleCommissionValue?: number | null;
  isActive?: boolean;
  displayOrder?: number;
}

export interface PackageFilters {
  page?: number;
  limit?: number;
  isActive?: boolean;
  packageType?: PackageType;
  branchId?: string;
  search?: string;
  sortBy?: 'name' | 'price' | 'createdAt' | 'displayOrder';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Input Types - Customer Package
// ============================================

export interface SellPackageInput {
  customerId: string;
  packageId: string;
  branchId: string;
  activationDate?: string;
  staffId?: string;
}

export interface CancelPackageInput {
  reason: string;
  refundMethod: 'wallet' | 'cash' | 'none';
}

export interface CustomerPackageFilters {
  page?: number;
  limit?: number;
  customerId?: string;
  packageId?: string;
  branchId?: string;
  status?: PackageStatus | PackageStatus[];
  packageType?: PackageType;
  expiringWithinDays?: number;
  search?: string;
  sortBy?: 'packageNumber' | 'purchaseDate' | 'expiryDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Input Types - Redemption
// ============================================

export interface CheckBenefitsInput {
  customerId: string;
  branchId: string;
  services: {
    serviceId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface ApplyMembershipInput {
  membershipId: string;
  invoiceId: string;
  invoiceItemId: string;
  serviceId: string;
  originalAmount: number;
  discountAmount: number;
  benefitType: BenefitType;
  isComplimentary?: boolean;
}

export interface RedeemPackageInput {
  customerPackageId: string;
  invoiceId: string;
  invoiceItemId: string;
  serviceId: string;
  creditsToUse?: number;
  valueToUse?: number;
}

// ============================================
// Response Types
// ============================================

export interface SellMembershipResponse {
  membership: CustomerMembership;
  invoiceId?: string;
}

export interface FreezeMembershipResponse {
  membership: CustomerMembership;
  freeze: MembershipFreeze;
  newExpiryDate: string;
  remainingFreezeDays: number;
}

export interface CancelResponse {
  refundAmount: number;
  usedValue: number;
  cancellationFee: number;
  walletCredited?: number;
}

export interface SellPackageResponse {
  customerPackage: CustomerPackage;
  credits: PackageCredit[];
  invoiceId?: string;
}

// ============================================
// UI Helper Types
// ============================================

export const VALIDITY_UNIT_LABELS: Record<ValidityUnit, string> = {
  days: 'Days',
  months: 'Months',
  years: 'Years',
};

export const REFUND_POLICY_LABELS: Record<RefundPolicy, string> = {
  refundable: 'Fully Refundable',
  non_refundable: 'Non-Refundable',
  partial: 'Partial Refund',
};

export const BRANCH_SCOPE_LABELS: Record<BranchScope, string> = {
  all_branches: 'All Branches',
  specific_branches: 'Specific Branches',
};

export const MEMBERSHIP_TIER_LABELS: Record<MembershipTier, string> = {
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export const BENEFIT_TYPE_LABELS: Record<BenefitType, string> = {
  flat_discount: 'Flat Discount',
  service_discount: 'Service Discount',
  product_discount: 'Product Discount',
  complimentary_service: 'Complimentary Service',
  priority_booking: 'Priority Booking',
  visit_limit: 'Visit Limit',
  cooldown_period: 'Cooldown Period',
  benefit_cap: 'Benefit Cap',
  fallback_discount: 'Fallback Discount',
};

export const COMPLIMENTARY_PERIOD_LABELS: Record<ComplimentaryPeriod, string> = {
  per_visit: 'Per Visit',
  per_month: 'Per Month',
  per_year: 'Per Year',
  total: 'Total',
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  frozen: 'Frozen',
  expired: 'Expired',
  cancelled: 'Cancelled',
  transferred: 'Transferred',
};

export const FREEZE_REASON_LABELS: Record<FreezeReasonCode, string> = {
  travel: 'Travel',
  medical: 'Medical',
  personal: 'Personal',
  other: 'Other',
};

export const FREEZE_STATUS_LABELS: Record<FreezeStatus, string> = {
  requested: 'Requested',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  service_package: 'Service Package',
  value_package: 'Value Package',
  combo_package: 'Combo Package',
};

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  expired: 'Expired',
  exhausted: 'Exhausted',
  cancelled: 'Cancelled',
  transferred: 'Transferred',
};

export const PRECEDENCE_LABELS: Record<MembershipPackagePrecedence, string> = {
  package_first: 'Package First',
  membership_only: 'Membership Only',
  customer_choice: 'Customer Choice',
};
