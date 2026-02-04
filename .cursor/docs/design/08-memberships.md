# Module 8: Memberships & Packages - Design Document

## Overview

This module handles membership plans, prepaid packages, benefit configuration, sales, redemption, validity management, freeze functionality, refunds, transfers, and cross-branch usage tracking. Memberships provide ongoing discounts while packages offer prepaid service credits.

**Related Requirements:** 8.1 - 8.19

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Membership_Plan │──────<│Customer_Member- │>──────│    Customer     │
│                 │  1:N  │     ship        │  N:1  │                 │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │ 1:N                     │ 1:N                     │ 1:N
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Membership_     │       │ Membership_     │       │ Customer_       │
│ Benefits        │       │ Usage           │       │ Package         │
└─────────────────┘       └─────────────────┘       └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Package      │──────<│ Package_Service │       │ Package_Credit  │
│                 │  1:N  │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Database Schema

```sql
-- =====================================================
-- MEMBERSHIP CONFIGURATION (Tenant-level settings)
-- =====================================================
CREATE TABLE membership_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,

  -- Feature toggles
  memberships_enabled BOOLEAN DEFAULT true,
  packages_enabled BOOLEAN DEFAULT true,

  -- Default settings
  default_validity_unit VARCHAR(10) DEFAULT 'months', -- days, months, years
  default_validity_value INTEGER DEFAULT 12,

  -- Refund policy
  refund_policy VARCHAR(20) DEFAULT 'partial', -- refundable, non_refundable, partial
  cancellation_fee_percentage DECIMAL(5, 2) DEFAULT 10,

  -- Cross-branch settings
  default_branch_scope VARCHAR(20) DEFAULT 'all_branches', -- all_branches, specific_branches

  -- Precedence rules
  membership_package_precedence VARCHAR(30) DEFAULT 'package_first',
  -- package_first, membership_only, customer_choice

  -- Grace period
  grace_period_days INTEGER DEFAULT 7,

  -- Freeze settings
  max_freeze_days_per_year INTEGER DEFAULT 30,

  -- Notifications
  expiry_reminder_days INTEGER DEFAULT 7,
  low_balance_threshold INTEGER DEFAULT 2, -- credits

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

-- =====================================================
-- MEMBERSHIP PLANS
-- =====================================================
CREATE TABLE membership_plans (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

-- Basic info
name VARCHAR(100) NOT NULL,
code VARCHAR(20),
description TEXT,
tier VARCHAR(20), -- silver, gold, platinum (optional)

-- Pricing
price DECIMAL(10, 2) NOT NULL,
gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18,

-- Validity
validity_value INTEGER NOT NULL,
validity_unit VARCHAR(10) NOT NULL, -- days, months, years

-- Branch scope
branch_scope VARCHAR(20) NOT NULL DEFAULT 'all_branches',
-- all_branches, specific_branches

-- Terms
terms_and_conditions TEXT,

-- Commission
sale_commission_type VARCHAR(20), -- percentage, flat
sale_commission_value DECIMAL(10, 2),

-- Status
is_active BOOLEAN DEFAULT true,

-- Display
display_order INTEGER DEFAULT 0,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),

UNIQUE(tenant_id, code)
);

CREATE INDEX idx_membership_plans ON membership_plans(tenant_id, is_active);

-- =====================================================
-- MEMBERSHIP PLAN BRANCHES (For specific_branches scope)
-- =====================================================
CREATE TABLE membership_plan_branches (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
branch_id UUID NOT NULL REFERENCES branches(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(plan_id, branch_id)
);

CREATE INDEX idx_plan_branches ON membership_plan_branches(plan_id);

-- =====================================================
-- MEMBERSHIP BENEFITS
-- =====================================================
CREATE TABLE membership_benefits (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,

-- Benefit type
benefit_type VARCHAR(30) NOT NULL,
-- flat_discount, service_discount, product_discount, complimentary_service,
-- priority_booking, visit_limit, cooldown_period, benefit_cap, fallback_discount

-- Target (for service-specific benefits)
service_id UUID REFERENCES services(id),
category_id UUID REFERENCES service_categories(id),

-- Value
discount_type VARCHAR(20), -- percentage, flat
discount_value DECIMAL(10, 2),

-- For complimentary services
complimentary_count INTEGER,
complimentary_period VARCHAR(20), -- per_visit, per_month, per_year, total

-- Limits
max_services_per_visit INTEGER,
cooldown_days INTEGER,
benefit_cap_amount DECIMAL(10, 2),
benefit_cap_period VARCHAR(20), -- per_month, per_year

-- Priority
priority_level INTEGER DEFAULT 0,

is_active BOOLEAN DEFAULT true,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_membership_benefits ON membership_benefits(plan_id, benefit_type);

-- =====================================================
-- CUSTOMER MEMBERSHIPS
-- =====================================================
CREATE TABLE customer_memberships (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id),
plan_id UUID NOT NULL REFERENCES membership_plans(id),

-- Membership number
membership_number VARCHAR(50) NOT NULL,

-- Purchase details
purchase_date DATE NOT NULL,
purchase_branch_id UUID NOT NULL REFERENCES branches(id),
purchase_invoice_id UUID REFERENCES invoices(id),

-- Pricing at purchase
price_paid DECIMAL(10, 2) NOT NULL,
gst_paid DECIMAL(10, 2) NOT NULL,
total_paid DECIMAL(10, 2) NOT NULL,

-- Validity
activation_date DATE NOT NULL,
original_expiry_date DATE NOT NULL,
current_expiry_date DATE NOT NULL, -- Adjusted for freezes

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'active',
-- pending, active, frozen, expired, cancelled, transferred

-- Freeze tracking
total_freeze_days_used INTEGER DEFAULT 0,

-- Usage tracking
total_visits INTEGER DEFAULT 0,
total_discount_availed DECIMAL(12, 2) DEFAULT 0,
last_visit_date DATE,
last_visit_branch_id UUID REFERENCES branches(id),

-- Cancellation/Transfer
cancelled_at TIMESTAMP,
cancelled_by UUID REFERENCES users(id),
cancellation_reason TEXT,
refund_amount DECIMAL(10, 2),
transferred_to_id UUID REFERENCES customer_memberships(id),
transferred_from_id UUID REFERENCES customer_memberships(id),

-- Commission
sale_commission_amount DECIMAL(10, 2),
sale_commission_staff_id UUID REFERENCES users(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),

UNIQUE(tenant_id, membership_number)
);

CREATE INDEX idx_customer_memberships ON customer_memberships(customer_id, status);
CREATE INDEX idx_customer_memberships_expiry ON customer_memberships(current_expiry_date, status);
CREATE INDEX idx_customer_memberships_branch ON customer_memberships(purchase_branch_id);

-- =====================================================
-- MEMBERSHIP FREEZE HISTORY
-- =====================================================
CREATE TABLE membership_freezes (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
membership_id UUID NOT NULL REFERENCES customer_memberships(id),

-- Freeze period
freeze_start_date DATE NOT NULL,
freeze_end_date DATE NOT NULL,
freeze_days INTEGER NOT NULL,

-- Reason
reason_code VARCHAR(30) NOT NULL, -- travel, medical, personal, other
reason_description TEXT,

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'active',
-- requested, active, completed, cancelled

-- Approval
requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
requested_by UUID REFERENCES users(id),
approved_at TIMESTAMP,
approved_by UUID REFERENCES users(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_membership_freezes ON membership_freezes(membership_id, status);

-- =====================================================
-- MEMBERSHIP USAGE (Redemption history)
-- =====================================================
CREATE TABLE membership_usage (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
membership_id UUID NOT NULL REFERENCES customer_memberships(id),

-- Usage details
usage_date DATE NOT NULL,
usage_branch_id UUID NOT NULL REFERENCES branches(id),
invoice_id UUID NOT NULL REFERENCES invoices(id),
invoice_item_id UUID REFERENCES invoice_items(id),

-- Service details
service_id UUID REFERENCES services(id),
service_name VARCHAR(255) NOT NULL,

-- Benefit applied
benefit_type VARCHAR(30) NOT NULL,
original_amount DECIMAL(10, 2) NOT NULL,
discount_amount DECIMAL(10, 2) NOT NULL,
final_amount DECIMAL(10, 2) NOT NULL,

-- Complimentary tracking
is_complimentary BOOLEAN DEFAULT false,
complimentary_benefit_id UUID REFERENCES membership_benefits(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_membership_usage ON membership_usage(membership_id, usage_date);
CREATE INDEX idx_membership_usage_branch ON membership_usage(usage_branch_id, usage_date);

-- =====================================================
-- PACKAGES
-- =====================================================
CREATE TABLE packages (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

-- Basic info
name VARCHAR(100) NOT NULL,
code VARCHAR(20),
description TEXT,

-- Package type
package_type VARCHAR(20) NOT NULL,
-- service_package (count-based), value_package (amount-based), combo_package (bundle)

-- Pricing
price DECIMAL(10, 2) NOT NULL,
mrp DECIMAL(10, 2), -- Original value for display
gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18,

-- For value packages
credit_value DECIMAL(10, 2), -- Amount credited to package wallet

-- Validity
validity_value INTEGER NOT NULL,
validity_unit VARCHAR(10) NOT NULL, -- days, months, years

-- Branch scope
branch_scope VARCHAR(20) NOT NULL DEFAULT 'all_branches',

-- Rollover
allow_rollover BOOLEAN DEFAULT false,

-- Terms
terms_and_conditions TEXT,

-- Commission
sale_commission_type VARCHAR(20),
sale_commission_value DECIMAL(10, 2),

-- Status
is_active BOOLEAN DEFAULT true,
display_order INTEGER DEFAULT 0,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),

UNIQUE(tenant_id, code)
);

CREATE INDEX idx_packages ON packages(tenant_id, is_active, package_type);

-- =====================================================
-- PACKAGE BRANCHES (For specific_branches scope)
-- =====================================================
CREATE TABLE package_branches (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
branch_id UUID NOT NULL REFERENCES branches(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(package_id, branch_id)
);

-- =====================================================
-- PACKAGE SERVICES (Services included in package)
-- =====================================================
CREATE TABLE package_services (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
service_id UUID NOT NULL REFERENCES services(id),

-- Credits/Count
credit_count INTEGER NOT NULL, -- Number of times service can be redeemed

-- Price locked at package creation
locked_price DECIMAL(10, 2) NOT NULL,

-- Variant support
variant_id UUID REFERENCES service_variants(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(package_id, service_id, variant_id)
);

CREATE INDEX idx_package_services ON package_services(package_id);

-- =====================================================
-- CUSTOMER PACKAGES
-- =====================================================
CREATE TABLE customer_packages (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id),
package_id UUID NOT NULL REFERENCES packages(id),

-- Package number
package_number VARCHAR(50) NOT NULL,

-- Purchase details
purchase_date DATE NOT NULL,
purchase_branch_id UUID NOT NULL REFERENCES branches(id),
purchase_invoice_id UUID REFERENCES invoices(id),

-- Pricing at purchase
price_paid DECIMAL(10, 2) NOT NULL,
gst_paid DECIMAL(10, 2) NOT NULL,
total_paid DECIMAL(10, 2) NOT NULL,

-- For value packages
initial_credit_value DECIMAL(10, 2),
remaining_credit_value DECIMAL(10, 2),

-- Validity
activation_date DATE NOT NULL,
expiry_date DATE NOT NULL,

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'active',
-- pending, active, expired, exhausted, cancelled, transferred

-- Usage tracking
total_redemptions INTEGER DEFAULT 0,
total_redeemed_value DECIMAL(12, 2) DEFAULT 0,
last_redemption_date DATE,
last_redemption_branch_id UUID REFERENCES branches(id),

-- Cancellation/Transfer
cancelled_at TIMESTAMP,
cancelled_by UUID REFERENCES users(id),
cancellation_reason TEXT,
refund_amount DECIMAL(10, 2),
transferred_to_id UUID REFERENCES customer_packages(id),
transferred_from_id UUID REFERENCES customer_packages(id),

-- Commission
sale_commission_amount DECIMAL(10, 2),
sale_commission_staff_id UUID REFERENCES users(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),

UNIQUE(tenant_id, package_number)
);

CREATE INDEX idx_customer_packages ON customer_packages(customer_id, status);
CREATE INDEX idx_customer_packages_expiry ON customer_packages(expiry_date, status);

-- =====================================================
-- PACKAGE CREDITS (Per-service credit tracking)
-- =====================================================
CREATE TABLE package_credits (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_package_id UUID NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
package_service_id UUID NOT NULL REFERENCES package_services(id),
service_id UUID NOT NULL REFERENCES services(id),

-- Credits
initial_credits INTEGER NOT NULL,
remaining_credits INTEGER NOT NULL,

-- Locked price
locked_price DECIMAL(10, 2) NOT NULL,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(customer_package_id, package_service_id)
);

CREATE INDEX idx_package_credits ON package_credits(customer_package_id);

-- =====================================================
-- PACKAGE REDEMPTIONS (Usage history)
-- =====================================================
CREATE TABLE package_redemptions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_package_id UUID NOT NULL REFERENCES customer_packages(id),
package_credit_id UUID REFERENCES package_credits(id),

-- Redemption details
redemption_date DATE NOT NULL,
redemption_branch_id UUID NOT NULL REFERENCES branches(id),
invoice_id UUID NOT NULL REFERENCES invoices(id),
invoice_item_id UUID REFERENCES invoice_items(id),

-- Service details
service_id UUID NOT NULL REFERENCES services(id),
service_name VARCHAR(255) NOT NULL,

-- For service packages
credits_used INTEGER,

-- For value packages
value_used DECIMAL(10, 2),

-- Locked price at redemption
locked_price DECIMAL(10, 2) NOT NULL,

-- Staff commission
stylist_id UUID REFERENCES users(id),
redemption_commission_amount DECIMAL(10, 2),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_package_redemptions ON package_redemptions(customer_package_id, redemption_date);
CREATE INDEX idx_package_redemptions_branch ON package_redemptions(redemption_branch_id, redemption_date);

```

```

---

## TypeScript Types

```typescript
// =====================================================
// ENUMS
// =====================================================
export enum ValidityUnit {
  DAYS = "days",
  MONTHS = "months",
  YEARS = "years",
}

export enum RefundPolicy {
  REFUNDABLE = "refundable",
  NON_REFUNDABLE = "non_refundable",
  PARTIAL = "partial",
}

export enum BranchScope {
  ALL_BRANCHES = "all_branches",
  SPECIFIC_BRANCHES = "specific_branches",
}

export enum MembershipPackagePrecedence {
  PACKAGE_FIRST = "package_first",
  MEMBERSHIP_ONLY = "membership_only",
  CUSTOMER_CHOICE = "customer_choice",
}

export enum MembershipTier {
  SILVER = "silver",
  GOLD = "gold",
  PLATINUM = "platinum",
}

export enum BenefitType {
  FLAT_DISCOUNT = "flat_discount",
  SERVICE_DISCOUNT = "service_discount",
  PRODUCT_DISCOUNT = "product_discount",
  COMPLIMENTARY_SERVICE = "complimentary_service",
  PRIORITY_BOOKING = "priority_booking",
  VISIT_LIMIT = "visit_limit",
  COOLDOWN_PERIOD = "cooldown_period",
  BENEFIT_CAP = "benefit_cap",
  FALLBACK_DISCOUNT = "fallback_discount",
}

export enum ComplimentaryPeriod {
  PER_VISIT = "per_visit",
  PER_MONTH = "per_month",
  PER_YEAR = "per_year",
  TOTAL = "total",
}
```

export enum MembershipStatus {
PENDING = 'pending',
ACTIVE = 'active',
FROZEN = 'frozen',
EXPIRED = 'expired',
CANCELLED = 'cancelled',
TRANSFERRED = 'transferred',
}

export enum FreezeReasonCode {
TRAVEL = 'travel',
MEDICAL = 'medical',
PERSONAL = 'personal',
OTHER = 'other',
}

export enum FreezeStatus {
REQUESTED = 'requested',
ACTIVE = 'active',
COMPLETED = 'completed',
CANCELLED = 'cancelled',
}

export enum PackageType {
SERVICE_PACKAGE = 'service_package',
VALUE_PACKAGE = 'value_package',
COMBO_PACKAGE = 'combo_package',
}

export enum PackageStatus {
PENDING = 'pending',
ACTIVE = 'active',
EXPIRED = 'expired',
EXHAUSTED = 'exhausted',
CANCELLED = 'cancelled',
TRANSFERRED = 'transferred',
}

// =====================================================
// CORE TYPES
// =====================================================
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
createdAt: Date;
updatedAt: Date;
}

export interface MembershipPlan {
id: string;
tenantId: string;
name: string;
code?: string;
description?: string;
tier?: MembershipTier;
price: number;
gstRate: number;
validityValue: number;
validityUnit: ValidityUnit;
branchScope: BranchScope;
termsAndConditions?: string;
saleCommissionType?: string;
saleCommissionValue?: number;
isActive: boolean;
displayOrder: number;
createdAt: Date;
updatedAt: Date;
createdBy?: string;

branches?: Branch[];
benefits?: MembershipBenefit[];
}

export interface MembershipBenefit {
id: string;
tenantId: string;
planId: string;
benefitType: BenefitType;
serviceId?: string;
categoryId?: string;
discountType?: string;
discountValue?: number;
complimentaryCount?: number;
complimentaryPeriod?: ComplimentaryPeriod;
maxServicesPerVisit?: number;
cooldownDays?: number;
benefitCapAmount?: number;
benefitCapPeriod?: string;
priorityLevel: number;
isActive: boolean;
createdAt: Date;
updatedAt: Date;

service?: Service;
category?: ServiceCategory;
}

export interface CustomerMembership {
id: string;
tenantId: string;
customerId: string;
planId: string;
membershipNumber: string;
purchaseDate: string;
purchaseBranchId: string;
purchaseInvoiceId?: string;
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
lastVisitDate?: string;
lastVisitBranchId?: string;
cancelledAt?: Date;
cancelledBy?: string;
cancellationReason?: string;
refundAmount?: number;
transferredToId?: string;
transferredFromId?: string;
saleCommissionAmount?: number;
saleCommissionStaffId?: string;
createdAt: Date;
updatedAt: Date;
createdBy?: string;

customer?: Customer;
plan?: MembershipPlan;
purchaseBranch?: Branch;
freezes?: MembershipFreeze[];
usage?: MembershipUsage[];
}

export interface MembershipFreeze {
id: string;
tenantId: string;
membershipId: string;
freezeStartDate: string;
freezeEndDate: string;
freezeDays: number;
reasonCode: FreezeReasonCode;
reasonDescription?: string;
status: FreezeStatus;
requestedAt: Date;
requestedBy?: string;
approvedAt?: Date;
approvedBy?: string;
createdAt: Date;
}

export interface MembershipUsage {
id: string;
tenantId: string;
membershipId: string;
usageDate: string;
usageBranchId: string;
invoiceId: string;
invoiceItemId?: string;
serviceId?: string;
serviceName: string;
benefitType: BenefitType;
originalAmount: number;
discountAmount: number;
finalAmount: number;
isComplimentary: boolean;
complimentaryBenefitId?: string;
createdAt: Date;
createdBy?: string;
}

export interface Package {
id: string;
tenantId: string;
name: string;
code?: string;
description?: string;
packageType: PackageType;
price: number;
mrp?: number;
gstRate: number;
creditValue?: number;
validityValue: number;
validityUnit: ValidityUnit;
branchScope: BranchScope;
allowRollover: boolean;
termsAndConditions?: string;
saleCommissionType?: string;
saleCommissionValue?: number;
isActive: boolean;
displayOrder: number;
createdAt: Date;
updatedAt: Date;
createdBy?: string;

branches?: Branch[];
services?: PackageService[];
}

export interface PackageService {
id: string;
tenantId: string;
packageId: string;
serviceId: string;
creditCount: number;
lockedPrice: number;
variantId?: string;
createdAt: Date;

service?: Service;
variant?: ServiceVariant;
}

export interface CustomerPackage {
id: string;
tenantId: string;
customerId: string;
packageId: string;
packageNumber: string;
purchaseDate: string;
purchaseBranchId: string;
purchaseInvoiceId?: string;
pricePaid: number;
gstPaid: number;
totalPaid: number;
initialCreditValue?: number;
remainingCreditValue?: number;
activationDate: string;
expiryDate: string;
status: PackageStatus;
totalRedemptions: number;
totalRedeemedValue: number;
lastRedemptionDate?: string;
lastRedemptionBranchId?: string;
cancelledAt?: Date;
cancelledBy?: string;
cancellationReason?: string;
refundAmount?: number;
transferredToId?: string;
transferredFromId?: string;
saleCommissionAmount?: number;
saleCommissionStaffId?: string;
createdAt: Date;
updatedAt: Date;
createdBy?: string;

customer?: Customer;
package?: Package;
credits?: PackageCredit[];
redemptions?: PackageRedemption[];
}

export interface PackageCredit {
id: string;
tenantId: string;
customerPackageId: string;
packageServiceId: string;
serviceId: string;
initialCredits: number;
remainingCredits: number;
lockedPrice: number;
createdAt: Date;
updatedAt: Date;

service?: Service;
}

export interface PackageRedemption {
id: string;
tenantId: string;
customerPackageId: string;
packageCreditId?: string;
redemptionDate: string;
redemptionBranchId: string;
invoiceId: string;
invoiceItemId?: string;
serviceId: string;
serviceName: string;
creditsUsed?: number;
valueUsed?: number;
lockedPrice: number;
stylistId?: string;
redemptionCommissionAmount?: number;
createdAt: Date;
createdBy?: string;
}

```

```

---

## API Endpoints

### Membership Configuration

```
GET    /api/v1/membership-config           Get tenant config
PATCH  /api/v1/membership-config           Update tenant config
```

### Membership Plans

```
GET    /api/v1/membership-plans            List membership plans
POST   /api/v1/membership-plans            Create membership plan
GET    /api/v1/membership-plans/:id        Get plan details
PATCH  /api/v1/membership-plans/:id        Update plan
DELETE /api/v1/membership-plans/:id        Deactivate plan
POST   /api/v1/membership-plans/:id/benefits  Add benefit to plan
PATCH  /api/v1/membership-plans/:id/benefits/:bid  Update benefit
DELETE /api/v1/membership-plans/:id/benefits/:bid  Remove benefit
```

### Customer Memberships

```
GET    /api/v1/memberships                 List customer memberships
POST   /api/v1/memberships                 Sell membership
GET    /api/v1/memberships/:id             Get membership details
GET    /api/v1/memberships/:id/usage       Get usage history
POST   /api/v1/memberships/:id/freeze      Request freeze
POST   /api/v1/memberships/:id/unfreeze    End freeze early
POST   /api/v1/memberships/:id/cancel      Cancel membership
POST   /api/v1/memberships/:id/transfer    Transfer membership
GET    /api/v1/customers/:id/memberships   Get customer's memberships
```

### Packages

```
GET    /api/v1/packages                    List packages
POST   /api/v1/packages                    Create package
GET    /api/v1/packages/:id                Get package details
PATCH  /api/v1/packages/:id                Update package
DELETE /api/v1/packages/:id                Deactivate package
```

### Customer Packages

```
GET    /api/v1/customer-packages           List customer packages
POST   /api/v1/customer-packages           Sell package
GET    /api/v1/customer-packages/:id       Get package details
GET    /api/v1/customer-packages/:id/credits  Get credit balance
GET    /api/v1/customer-packages/:id/redemptions  Get redemption history
POST   /api/v1/customer-packages/:id/cancel  Cancel package
POST   /api/v1/customer-packages/:id/transfer  Transfer package
GET    /api/v1/customers/:id/packages      Get customer's packages
```

### Redemption

```
POST   /api/v1/redemption/check            Check available benefits
POST   /api/v1/redemption/apply            Apply benefits to invoice
```

---

## Request/Response Schemas

### Create Membership Plan

```typescript
// POST /api/v1/membership-plans
interface CreateMembershipPlanRequest {
  name: string;
  code?: string;
  description?: string;
  tier?: MembershipTier;
  price: number;
  gstRate?: number;
  validityValue: number;
  validityUnit: ValidityUnit;
  branchScope: BranchScope;
  branchIds?: string[]; // Required if branchScope is specific_branches
  termsAndConditions?: string;
  saleCommissionType?: string;
  saleCommissionValue?: number;

  benefits?: {
    benefitType: BenefitType;
    serviceId?: string;
    categoryId?: string;
    discountType?: string;
    discountValue?: number;
    complimentaryCount?: number;
    complimentaryPeriod?: ComplimentaryPeriod;
    maxServicesPerVisit?: number;
    cooldownDays?: number;
    benefitCapAmount?: number;
    benefitCapPeriod?: string;
  }[];
}

interface CreateMembershipPlanResponse {
  success: boolean;
  data: {
    plan: MembershipPlan;
  };
}
```

### Sell Membership

```typescript
// POST /api/v1/memberships
interface SellMembershipRequest {
  customerId: string;
  planId: string;
  branchId: string;
  activationDate?: string; // Defaults to today
  staffId?: string; // For commission attribution
  paymentMethod: PaymentMethod;
  transactionId?: string;
}

interface SellMembershipResponse {
  success: boolean;
  data: {
    membership: CustomerMembership;
    invoice: Invoice;
    expiryDate: string;
  };
}
```

### Freeze Membership

```typescript
// POST /api/v1/memberships/:id/freeze
interface FreezeMembershipRequest {
  freezeStartDate: string;
  freezeEndDate: string;
  reasonCode: FreezeReasonCode;
  reasonDescription?: string;
}

interface FreezeMembershipResponse {
  success: boolean;
  data: {
    membership: CustomerMembership;
    freeze: MembershipFreeze;
    newExpiryDate: string;
    remainingFreezeDays: number;
  };
}
```

### Create Package

```typescript
// POST /api/v1/packages
interface CreatePackageRequest {
  name: string;
  code?: string;
  description?: string;
  packageType: PackageType;
  price: number;
  mrp?: number;
  gstRate?: number;
  creditValue?: number; // For value packages
  validityValue: number;
  validityUnit: ValidityUnit;
  branchScope: BranchScope;
  branchIds?: string[];
  allowRollover?: boolean;
  termsAndConditions?: string;
  saleCommissionType?: string;
  saleCommissionValue?: number;

  // For service/combo packages
  services?: {
    serviceId: string;
    variantId?: string;
    creditCount: number;
  }[];
}

interface CreatePackageResponse {
  success: boolean;
  data: {
    package: Package;
  };
}
```

### Sell Package

```typescript
// POST /api/v1/customer-packages
interface SellPackageRequest {
  customerId: string;
  packageId: string;
  branchId: string;
  activationDate?: string;
  staffId?: string;
  paymentMethod: PaymentMethod;
  transactionId?: string;
}

interface SellPackageResponse {
  success: boolean;
  data: {
    customerPackage: CustomerPackage;
    invoice: Invoice;
    credits: PackageCredit[];
    expiryDate: string;
  };
}
```

### Check Available Benefits

```typescript
// POST /api/v1/redemption/check
interface CheckBenefitsRequest {
  customerId: string;
  branchId: string;
  services: {
    serviceId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

interface CheckBenefitsResponse {
  success: boolean;
  data: {
    memberships: {
      membershipId: string;
      membershipNumber: string;
      planName: string;
      status: MembershipStatus;
      expiryDate: string;
      applicableBenefits: {
        serviceId: string;
        benefitType: BenefitType;
        discountAmount: number;
        isComplimentary: boolean;
      }[];
      totalDiscount: number;
    }[];

    packages: {
      packageId: string;
      packageNumber: string;
      packageName: string;
      status: PackageStatus;
      expiryDate: string;
      availableCredits: {
        serviceId: string;
        serviceName: string;
        remainingCredits: number;
        lockedPrice: number;
      }[];
    }[];

    precedenceRule: MembershipPackagePrecedence;
    recommendedOption: "membership" | "package" | "both";
  };
}
```

### Apply Benefits to Invoice

```typescript
// POST /api/v1/redemption/apply
interface ApplyBenefitsRequest {
  invoiceId: string;

  // Membership redemption
  membershipRedemptions?: {
    membershipId: string;
    invoiceItemId: string;
    benefitType: BenefitType;
  }[];

  // Package redemption
  packageRedemptions?: {
    customerPackageId: string;
    invoiceItemId: string;
    creditsToUse?: number; // For service packages
    valueToUse?: number; // For value packages
  }[];
}

interface ApplyBenefitsResponse {
  success: boolean;
  data: {
    invoice: Invoice;
    membershipUsage: MembershipUsage[];
    packageRedemptions: PackageRedemption[];
    totalMembershipDiscount: number;
    totalPackageValue: number;
  };
}
```

### Cancel Membership/Package

```typescript
// POST /api/v1/memberships/:id/cancel
// POST /api/v1/customer-packages/:id/cancel
interface CancelRequest {
  reason: string;
  refundMethod: "wallet" | "cash" | "none";
}

interface CancelResponse {
  success: boolean;
  data: {
    refundAmount: number;
    usedValue: number;
    cancellationFee: number;
    walletCredited?: number;
  };
}
```

### Transfer Membership/Package

```typescript
// POST /api/v1/memberships/:id/transfer
// POST /api/v1/customer-packages/:id/transfer
interface TransferRequest {
  toCustomerId: string;
  reason: string;
  verificationMethod: "otp" | "physical_card";
  verificationCode?: string;
}

interface TransferResponse {
  success: boolean;
  data: {
    originalId: string;
    newId: string;
    transferredTo: Customer;
    remainingValue: number;
  };
}
```

---

## Business Logic

### 1. Membership Service

```typescript
class MembershipService {
  /**
   * Sell membership to customer
   */
  async sellMembership(
    request: SellMembershipRequest,
    userId: string
  ): Promise<{ membership: CustomerMembership; invoice: Invoice }> {
    const plan = await this.db.membershipPlans.findUnique({
      where: { id: request.planId },
      include: { branches: true },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundError('PLAN_NOT_FOUND', 'Membership plan not found or inactive');
    }

    // Validate branch eligibility
    if (plan.branchScope === BranchScope.SPECIFIC_BRANCHES) {
      const branchIds = plan.branches!.map(b => b.branchId);
      if (!branchIds.includes(request.branchId)) {
        throw new BadRequestError(
          'BRANCH_NOT_ELIGIBLE',
          'This plan is not available at this branch'
        );
      }
    }
```

    // Check if customer already has active membership of same plan
    const existingMembership = await this.db.customerMemberships.findFirst({
      where: {
        customerId: request.customerId,
        planId: request.planId,
        status: { in: [MembershipStatus.ACTIVE, MembershipStatus.FROZEN] },
      },
    });

    if (existingMembership) {
      throw new ConflictError(
        'MEMBERSHIP_EXISTS',
        'Customer already has an active membership of this plan'
      );
    }

    return this.db.transaction(async (tx) => {
      // Calculate dates
      const activationDate = request.activationDate || new Date().toISOString().split('T')[0];
      const expiryDate = this.calculateExpiryDate(
        activationDate,
        plan.validityValue,
        plan.validityUnit
      );

      // Generate membership number
      const membershipNumber = await this.generateMembershipNumber();

      // Calculate GST
      const gstAmount = plan.price * (plan.gstRate / 100);
      const totalAmount = plan.price + gstAmount;

      // Create invoice
      const invoice = await this.billingService.createMembershipInvoice(tx, {
        customerId: request.customerId,
        branchId: request.branchId,
        itemName: `Membership: ${plan.name}`,
        amount: plan.price,
        gstRate: plan.gstRate,
        gstAmount,
        totalAmount,
        paymentMethod: request.paymentMethod,
        transactionId: request.transactionId,
        userId,
      });


      // Calculate commission
      let commissionAmount = 0;
      if (plan.saleCommissionType && plan.saleCommissionValue) {
        commissionAmount = plan.saleCommissionType === 'percentage'
          ? plan.price * (plan.saleCommissionValue / 100)
          : plan.saleCommissionValue;
      }

      // Create membership
      const membership = await tx.customerMemberships.create({
        tenantId: this.tenantId,
        customerId: request.customerId,
        planId: request.planId,
        membershipNumber,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseBranchId: request.branchId,
        purchaseInvoiceId: invoice.id,
        pricePaid: plan.price,
        gstPaid: gstAmount,
        totalPaid: totalAmount,
        activationDate,
        originalExpiryDate: expiryDate,
        currentExpiryDate: expiryDate,
        status: MembershipStatus.ACTIVE,
        saleCommissionAmount: commissionAmount,
        saleCommissionStaffId: request.staffId,
        createdBy: userId,
      });

      // Send confirmation notification
      await this.notificationService.sendMembershipPurchaseConfirmation(
        request.customerId,
        membership,
        plan
      );

      // Emit event
      this.eventEmitter.emit(MEMBERSHIP_EVENTS.MEMBERSHIP_SOLD, {
        membershipId: membership.id,
        customerId: request.customerId,
        planId: request.planId,
        branchId: request.branchId,
        amount: totalAmount,
      });

      return { membership, invoice };
    });

}

/\*\*

- Freeze membership
  \*/
  async freezeMembership(
  membershipId: string,
  request: FreezeMembershipRequest,
  userId: string
  ): Promise<{ membership: CustomerMembership; freeze: MembershipFreeze }> {
  const membership = await this.db.customerMemberships.findUnique({
  where: { id: membershipId },
  });

  if (!membership) {
  throw new NotFoundError('MEMBERSHIP_NOT_FOUND', 'Membership not found');
  }

  if (membership.status !== MembershipStatus.ACTIVE) {
  throw new BadRequestError(
  'INVALID_STATUS',
  'Only active memberships can be frozen'
  );
  }

  // Calculate freeze days
  const freezeStart = new Date(request.freezeStartDate);
  const freezeEnd = new Date(request.freezeEndDate);
  const freezeDays = Math.ceil(
  (freezeEnd.getTime() - freezeStart.getTime()) / (1000 _ 60 _ 60 \* 24)
  );

  // Check freeze limit
  const config = await this.getConfig();
  const remainingFreezeDays = config.maxFreezeDaysPerYear - membership.totalFreezeDaysUsed;

  if (freezeDays > remainingFreezeDays) {
  throw new BadRequestError(
  'FREEZE_LIMIT_EXCEEDED',
  `Maximum freeze days exceeded. Remaining: ${remainingFreezeDays} days`
  );
  }

  return this.db.transaction(async (tx) => {
  // Create freeze record
  const freeze = await tx.membershipFreezes.create({
  tenantId: this.tenantId,
  membershipId,
  freezeStartDate: request.freezeStartDate,
  freezeEndDate: request.freezeEndDate,
  freezeDays,
  reasonCode: request.reasonCode,
  reasonDescription: request.reasonDescription,
  status: FreezeStatus.ACTIVE,
  requestedBy: userId,
  approvedAt: new Date(),
  approvedBy: userId,
  });

      // Extend expiry date
      const currentExpiry = new Date(membership.currentExpiryDate);
      currentExpiry.setDate(currentExpiry.getDate() + freezeDays);
      const newExpiryDate = currentExpiry.toISOString().split('T')[0];

      // Update membership
      const updatedMembership = await tx.customerMemberships.update(membershipId, {
        status: MembershipStatus.FROZEN,
        currentExpiryDate: newExpiryDate,
        totalFreezeDaysUsed: membership.totalFreezeDaysUsed + freezeDays,
      });

      return {
        membership: updatedMembership,
        freeze,
        newExpiryDate,
        remainingFreezeDays: remainingFreezeDays - freezeDays,
      };

  });

}

/\*\*

- Calculate expiry date based on validity
  \*/
  private calculateExpiryDate(
  startDate: string,
  validityValue: number,
  validityUnit: ValidityUnit
  ): string {
  const date = new Date(startDate);

  switch (validityUnit) {
  case ValidityUnit.DAYS:
  date.setDate(date.getDate() + validityValue);
  break;
  case ValidityUnit.MONTHS:
  date.setMonth(date.getMonth() + validityValue);
  break;
  case ValidityUnit.YEARS:
  date.setFullYear(date.getFullYear() + validityValue);
  break;
  }

  return date.toISOString().split('T')[0];

}

/\*\*

- Process expired memberships (scheduled job)
  \*/
  async processExpiredMemberships(): Promise<number> {
  const config = await this.getConfig();
  const today = new Date().toISOString().split('T')[0];

  // Get memberships past grace period
  const graceDate = new Date();
  graceDate.setDate(graceDate.getDate() - config.gracePeriodDays);
  const graceDateStr = graceDate.toISOString().split('T')[0];

  const expiredMemberships = await this.db.customerMemberships.findMany({
  where: {
  status: MembershipStatus.ACTIVE,
  currentExpiryDate: { lt: graceDateStr },
  },
  });

  for (const membership of expiredMemberships) {
  await this.db.customerMemberships.update(membership.id, {
  status: MembershipStatus.EXPIRED,
  });

      // Send expiry notification
      await this.notificationService.sendMembershipExpiredNotification(
        membership.customerId,
        membership
      );

  }

  return expiredMemberships.length;

}
}

```

```

### 2. Package Service

```typescript
class PackageService {
  /**
   * Sell package to customer
   */
  async sellPackage(
    request: SellPackageRequest,
    userId: string
  ): Promise<{ customerPackage: CustomerPackage; invoice: Invoice; credits: PackageCredit[] }> {
    const pkg = await this.db.packages.findUnique({
      where: { id: request.packageId },
      include: { services: true, branches: true },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundError('PACKAGE_NOT_FOUND', 'Package not found or inactive');
    }

    // Validate branch eligibility
    if (pkg.branchScope === BranchScope.SPECIFIC_BRANCHES) {
      const branchIds = pkg.branches!.map(b => b.branchId);
      if (!branchIds.includes(request.branchId)) {
        throw new BadRequestError(
          'BRANCH_NOT_ELIGIBLE',
          'This package is not available at this branch'
        );
      }
    }

    return this.db.transaction(async (tx) => {
      // Calculate dates
      const activationDate = request.activationDate || new Date().toISOString().split('T')[0];
      const expiryDate = this.calculateExpiryDate(
        activationDate,
        pkg.validityValue,
        pkg.validityUnit
      );

      // Generate package number
      const packageNumber = await this.generatePackageNumber();

      // Calculate GST
      const gstAmount = pkg.price * (pkg.gstRate / 100);
      const totalAmount = pkg.price + gstAmount;

      // Create invoice
      const invoice = await this.billingService.createPackageInvoice(tx, {
        customerId: request.customerId,
        branchId: request.branchId,
        itemName: `Package: ${pkg.name}`,
        amount: pkg.price,
        gstRate: pkg.gstRate,
        gstAmount,
        totalAmount,
        paymentMethod: request.paymentMethod,
        transactionId: request.transactionId,
        userId,
      });
```

      // Calculate commission
      let commissionAmount = 0;
      if (pkg.saleCommissionType && pkg.saleCommissionValue) {
        commissionAmount = pkg.saleCommissionType === 'percentage'
          ? pkg.price * (pkg.saleCommissionValue / 100)
          : pkg.saleCommissionValue;
      }

      // Create customer package
      const customerPackage = await tx.customerPackages.create({
        tenantId: this.tenantId,
        customerId: request.customerId,
        packageId: request.packageId,
        packageNumber,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseBranchId: request.branchId,
        purchaseInvoiceId: invoice.id,
        pricePaid: pkg.price,
        gstPaid: gstAmount,
        totalPaid: totalAmount,
        initialCreditValue: pkg.creditValue,
        remainingCreditValue: pkg.creditValue,
        activationDate,
        expiryDate,
        status: PackageStatus.ACTIVE,
        saleCommissionAmount: commissionAmount,
        saleCommissionStaffId: request.staffId,
        createdBy: userId,
      });

      // Create package credits for service packages
      const credits: PackageCredit[] = [];
      if (pkg.packageType !== PackageType.VALUE_PACKAGE && pkg.services) {
        for (const pkgService of pkg.services) {
          const credit = await tx.packageCredits.create({
            tenantId: this.tenantId,
            customerPackageId: customerPackage.id,
            packageServiceId: pkgService.id,
            serviceId: pkgService.serviceId,
            initialCredits: pkgService.creditCount,
            remainingCredits: pkgService.creditCount,
            lockedPrice: pkgService.lockedPrice,
          });
          credits.push(credit);
        }
      }

      // Send confirmation
      await this.notificationService.sendPackagePurchaseConfirmation(
        request.customerId,
        customerPackage,
        pkg,
        credits
      );

      return { customerPackage, invoice, credits };
    });

}

/\*\*

- Redeem package credits
  \*/
  async redeemCredits(
  customerPackageId: string,
  serviceId: string,
  creditsToUse: number,
  invoiceId: string,
  invoiceItemId: string,
  stylistId: string | undefined,
  userId: string
  ): Promise<PackageRedemption> {
  const customerPackage = await this.db.customerPackages.findUnique({
  where: { id: customerPackageId },
  include: { credits: true, package: true },
  });

  if (!customerPackage) {
  throw new NotFoundError('PACKAGE_NOT_FOUND', 'Customer package not found');
  }

  // Validate status
  if (customerPackage.status !== PackageStatus.ACTIVE) {
  throw new BadRequestError(
  'PACKAGE_NOT_ACTIVE',
  'Package is not active'
  );
  }

  // Check expiry
  const today = new Date().toISOString().split('T')[0];
  if (customerPackage.expiryDate < today) {
  throw new BadRequestError('PACKAGE_EXPIRED', 'Package has expired');
  }

  // Find credit for this service
  const credit = customerPackage.credits!.find(c => c.serviceId === serviceId);
  if (!credit) {
  throw new BadRequestError(
  'SERVICE_NOT_IN_PACKAGE',
  'This service is not included in the package'
  );
  }

  if (credit.remainingCredits < creditsToUse) {
  throw new BadRequestError(
  'INSUFFICIENT_CREDITS',
  `Insufficient credits. Available: ${credit.remainingCredits}`
  );
  }

  return this.db.transaction(async (tx) => {
  // Deduct credits
  const newRemainingCredits = credit.remainingCredits - creditsToUse;
  await tx.packageCredits.update(credit.id, {
  remainingCredits: newRemainingCredits,
  });

      // Get service name
      const service = await tx.services.findUnique({ where: { id: serviceId } });

      // Create redemption record
      const redemption = await tx.packageRedemptions.create({
        tenantId: this.tenantId,
        customerPackageId,
        packageCreditId: credit.id,
        redemptionDate: today,
        redemptionBranchId: this.branchId,
        invoiceId,
        invoiceItemId,
        serviceId,
        serviceName: service!.name,
        creditsUsed: creditsToUse,
        lockedPrice: credit.lockedPrice,
        stylistId,
        createdBy: userId,
      });

      // Update package stats
      await tx.customerPackages.update(customerPackageId, {
        totalRedemptions: customerPackage.totalRedemptions + 1,
        totalRedeemedValue: customerPackage.totalRedeemedValue + (creditsToUse * credit.lockedPrice),
        lastRedemptionDate: today,
        lastRedemptionBranchId: this.branchId,
      });

      // Check if package is exhausted
      const allCredits = await tx.packageCredits.findMany({
        where: { customerPackageId },
      });
      const totalRemaining = allCredits.reduce((sum, c) => sum + c.remainingCredits, 0);

      if (totalRemaining === 0) {
        await tx.customerPackages.update(customerPackageId, {
          status: PackageStatus.EXHAUSTED,
        });
      }

      // Send usage notification
      await this.notificationService.sendPackageUsageNotification(
        customerPackage.customerId,
        customerPackage,
        redemption,
        newRemainingCredits
      );

      return redemption;

  });

}
}

```

```

### 3. Redemption Engine

```typescript
class RedemptionEngine {
  /**
   * Check available benefits for customer
   */
  async checkAvailableBenefits(
    customerId: string,
    branchId: string,
    services: { serviceId: string; variantId?: string; quantity: number; unitPrice: number }[]
  ): Promise<AvailableBenefits> {
    const config = await this.getConfig();
    const today = new Date().toISOString().split('T')[0];

    // Get active memberships
    const memberships = await this.db.customerMemberships.findMany({
      where: {
        customerId,
        status: MembershipStatus.ACTIVE,
        currentExpiryDate: { gte: today },
      },
      include: {
        plan: { include: { benefits: true, branches: true } },
      },
    });

    // Get active packages
    const packages = await this.db.customerPackages.findMany({
      where: {
        customerId,
        status: PackageStatus.ACTIVE,
        expiryDate: { gte: today },
      },
      include: {
        credits: true,
        package: { include: { branches: true } },
      },
    });

    // Calculate membership benefits
    const membershipBenefits = await Promise.all(
      memberships.map(async (membership) => {
        // Check branch eligibility
        if (membership.plan!.branchScope === BranchScope.SPECIFIC_BRANCHES) {
          const branchIds = membership.plan!.branches!.map(b => b.branchId);
          if (!branchIds.includes(branchId)) {
            return null;
          }
        }

        // Check cooldown
        if (membership.lastVisitDate) {
          const cooldownBenefit = membership.plan!.benefits!.find(
            b => b.benefitType === BenefitType.COOLDOWN_PERIOD
          );
          if (cooldownBenefit?.cooldownDays) {
            const lastVisit = new Date(membership.lastVisitDate);
            const cooldownEnd = new Date(lastVisit);
            cooldownEnd.setDate(cooldownEnd.getDate() + cooldownBenefit.cooldownDays);
            if (new Date() < cooldownEnd) {
              return null; // Still in cooldown
            }
          }
        }

        // Calculate applicable benefits for each service
        const applicableBenefits = services.map(service => {
          return this.calculateMembershipBenefit(
            membership,
            service.serviceId,
            service.unitPrice
          );
        });

        return {
          membershipId: membership.id,
          membershipNumber: membership.membershipNumber,
          planName: membership.plan!.name,
          status: membership.status,
          expiryDate: membership.currentExpiryDate,
          applicableBenefits: applicableBenefits.filter(b => b !== null),
          totalDiscount: applicableBenefits.reduce((sum, b) => sum + (b?.discountAmount || 0), 0),
        };
      })
    );
```

    // Calculate package credits
    const packageBenefits = packages.map(pkg => {
      // Check branch eligibility
      if (pkg.package!.branchScope === BranchScope.SPECIFIC_BRANCHES) {
        const branchIds = pkg.package!.branches!.map(b => b.branchId);
        if (!branchIds.includes(branchId)) {
          return null;
        }
      }

      const availableCredits = pkg.credits!
        .filter(c => c.remainingCredits > 0)
        .map(c => ({
          serviceId: c.serviceId,
          serviceName: '', // Will be populated
          remainingCredits: c.remainingCredits,
          lockedPrice: c.lockedPrice,
        }));

      return {
        packageId: pkg.id,
        packageNumber: pkg.packageNumber,
        packageName: pkg.package!.name,
        status: pkg.status,
        expiryDate: pkg.expiryDate,
        availableCredits,
      };
    });

    return {
      memberships: membershipBenefits.filter(m => m !== null),
      packages: packageBenefits.filter(p => p !== null),
      precedenceRule: config.membershipPackagePrecedence,
      recommendedOption: this.getRecommendedOption(
        membershipBenefits,
        packageBenefits,
        services,
        config.membershipPackagePrecedence
      ),
    };

}

/\*\*

- Calculate membership benefit for a service
  \*/
  private calculateMembershipBenefit(
  membership: CustomerMembership & { plan: MembershipPlan & { benefits: MembershipBenefit[] } },
  serviceId: string,
  unitPrice: number
  ): { serviceId: string; benefitType: BenefitType; discountAmount: number; isComplimentary: boolean } | null {
  const benefits = membership.plan.benefits;

  // Check for service-specific discount
  const serviceDiscount = benefits.find(
  b => b.benefitType === BenefitType.SERVICE_DISCOUNT && b.serviceId === serviceId
  );

  if (serviceDiscount) {
  const discountAmount = serviceDiscount.discountType === 'percentage'
  ? unitPrice \* (serviceDiscount.discountValue! / 100)
  : serviceDiscount.discountValue!;

      return {
        serviceId,
        benefitType: BenefitType.SERVICE_DISCOUNT,
        discountAmount,
        isComplimentary: false,
      };

  }

  // Check for flat discount
  const flatDiscount = benefits.find(b => b.benefitType === BenefitType.FLAT_DISCOUNT);
  if (flatDiscount) {
  const discountAmount = flatDiscount.discountType === 'percentage'
  ? unitPrice \* (flatDiscount.discountValue! / 100)
  : flatDiscount.discountValue!;

      return {
        serviceId,
        benefitType: BenefitType.FLAT_DISCOUNT,
        discountAmount,
        isComplimentary: false,
      };

  }

  // Check for complimentary service
  const complimentary = benefits.find(
  b => b.benefitType === BenefitType.COMPLIMENTARY_SERVICE && b.serviceId === serviceId
  );

  if (complimentary) {
  // Check if complimentary quota is available
  // (would need to check usage history)
  return {
  serviceId,
  benefitType: BenefitType.COMPLIMENTARY_SERVICE,
  discountAmount: unitPrice,
  isComplimentary: true,
  };
  }

  return null;

}
}

```

```

### 4. Refund Service

```typescript
class MembershipPackageRefundService {
  /**
   * Cancel membership and process refund
   */
  async cancelMembership(
    membershipId: string,
    request: CancelRequest,
    userId: string,
  ): Promise<CancelResponse> {
    const membership = await this.db.customerMemberships.findUnique({
      where: { id: membershipId },
      include: { plan: true, usage: true },
    });

    if (!membership) {
      throw new NotFoundError("MEMBERSHIP_NOT_FOUND", "Membership not found");
    }

    if (membership.status === MembershipStatus.CANCELLED) {
      throw new BadRequestError(
        "ALREADY_CANCELLED",
        "Membership is already cancelled",
      );
    }

    const config = await this.getConfig();

    // Calculate used value
    const usedValue = membership.totalDiscountAvailed;

    // Calculate refund based on policy
    let refundAmount = 0;
    let cancellationFee = 0;

    if (config.refundPolicy === RefundPolicy.REFUNDABLE) {
      refundAmount = membership.pricePaid - usedValue;
    } else if (config.refundPolicy === RefundPolicy.PARTIAL) {
      cancellationFee =
        membership.pricePaid * (config.cancellationFeePercentage / 100);
      refundAmount = membership.pricePaid - usedValue - cancellationFee;
    }
    // NON_REFUNDABLE: refundAmount stays 0

    refundAmount = Math.max(0, refundAmount);

    return this.db.transaction(async (tx) => {
      // Update membership status
      await tx.customerMemberships.update(membershipId, {
        status: MembershipStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: request.reason,
        refundAmount,
      });

      // Process refund
      let walletCredited = 0;
      if (refundAmount > 0) {
        if (request.refundMethod === "wallet") {
          await this.walletService.credit(
            membership.customerId,
            refundAmount,
            "membership_refund",
            membershipId,
            `Refund for membership ${membership.membershipNumber}`,
          );
          walletCredited = refundAmount;
        } else if (request.refundMethod === "cash") {
          // Record cash refund
          await this.billingService.recordCashRefund(
            tx,
            membership.purchaseBranchId,
            refundAmount,
            membershipId,
            "membership_refund",
          );
        }
      }

      // Reverse commission if applicable
      if (membership.saleCommissionAmount && membership.saleCommissionStaffId) {
        await this.commissionService.reverseCommission(
          membership.saleCommissionStaffId,
          membership.saleCommissionAmount,
          "membership_cancellation",
          membershipId,
        );
      }

      // Audit log
      await this.auditService.log({
        action: "MEMBERSHIP_CANCELLED",
        entityType: "customer_membership",
        entityId: membershipId,
        customerId: membership.customerId,
        pricePaid: membership.pricePaid,
        usedValue,
        cancellationFee,
        refundAmount,
        refundMethod: request.refundMethod,
        reason: request.reason,
        userId,
      });

      return {
        refundAmount,
        usedValue,
        cancellationFee,
        walletCredited,
      };
    });
  }
}
```

---

## Validation Schemas

```typescript
import { z } from "zod";

// =====================================================
// MEMBERSHIP PLAN
// =====================================================
export const createMembershipPlanSchema = z
  .object({
    name: z.string().min(2).max(100),
    code: z.string().max(20).optional(),
    description: z.string().max(1000).optional(),
    tier: z.enum(["silver", "gold", "platinum"]).optional(),
    price: z.number().min(0),
    gstRate: z.number().min(0).max(28).default(18),
    validityValue: z.number().int().min(1),
    validityUnit: z.enum(["days", "months", "years"]),
    branchScope: z.enum(["all_branches", "specific_branches"]),
    branchIds: z.array(z.string().uuid()).optional(),
    termsAndConditions: z.string().max(5000).optional(),
    saleCommissionType: z.enum(["percentage", "flat"]).optional(),
    saleCommissionValue: z.number().min(0).optional(),
    benefits: z
      .array(
        z.object({
          benefitType: z.enum([
            "flat_discount",
            "service_discount",
            "product_discount",
            "complimentary_service",
            "priority_booking",
            "visit_limit",
            "cooldown_period",
            "benefit_cap",
            "fallback_discount",
          ]),
          serviceId: z.string().uuid().optional(),
          categoryId: z.string().uuid().optional(),
          discountType: z.enum(["percentage", "flat"]).optional(),
          discountValue: z.number().min(0).optional(),
          complimentaryCount: z.number().int().min(1).optional(),
          complimentaryPeriod: z
            .enum(["per_visit", "per_month", "per_year", "total"])
            .optional(),
          maxServicesPerVisit: z.number().int().min(1).optional(),
          cooldownDays: z.number().int().min(1).optional(),
          benefitCapAmount: z.number().min(0).optional(),
          benefitCapPeriod: z.enum(["per_month", "per_year"]).optional(),
        }),
      )
      .optional(),
  })
  .refine(
    (data) =>
      !(
        data.branchScope === "specific_branches" &&
        (!data.branchIds || data.branchIds.length === 0)
      ),
    { message: "branchIds required when branchScope is specific_branches" },
  );
```

// =====================================================
// SELL MEMBERSHIP
// =====================================================
export const sellMembershipSchema = z.object({
customerId: z.string().uuid(),
planId: z.string().uuid(),
branchId: z.string().uuid(),
activationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
staffId: z.string().uuid().optional(),
paymentMethod: z.enum(['cash', 'card', 'upi', 'wallet', 'bank_transfer']),
transactionId: z.string().max(100).optional(),
});

// =====================================================
// FREEZE MEMBERSHIP
// =====================================================
export const freezeMembershipSchema = z.object({
freezeStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  freezeEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
reasonCode: z.enum(['travel', 'medical', 'personal', 'other']),
reasonDescription: z.string().max(500).optional(),
}).refine(
data => new Date(data.freezeEndDate) > new Date(data.freezeStartDate),
{ message: 'freezeEndDate must be after freezeStartDate' }
);

// =====================================================
// PACKAGE
// =====================================================
export const createPackageSchema = z.object({
name: z.string().min(2).max(100),
code: z.string().max(20).optional(),
description: z.string().max(1000).optional(),
packageType: z.enum(['service_package', 'value_package', 'combo_package']),
price: z.number().min(0),
mrp: z.number().min(0).optional(),
gstRate: z.number().min(0).max(28).default(18),
creditValue: z.number().min(0).optional(),
validityValue: z.number().int().min(1),
validityUnit: z.enum(['days', 'months', 'years']),
branchScope: z.enum(['all_branches', 'specific_branches']),
branchIds: z.array(z.string().uuid()).optional(),
allowRollover: z.boolean().default(false),
termsAndConditions: z.string().max(5000).optional(),
saleCommissionType: z.enum(['percentage', 'flat']).optional(),
saleCommissionValue: z.number().min(0).optional(),
services: z.array(z.object({
serviceId: z.string().uuid(),
variantId: z.string().uuid().optional(),
creditCount: z.number().int().min(1),
})).optional(),
}).refine(
data => !(data.packageType === 'value_package' && !data.creditValue),
{ message: 'creditValue required for value packages' }
).refine(
data => !(data.packageType !== 'value_package' && (!data.services || data.services.length === 0)),
{ message: 'services required for service/combo packages' }
);

// =====================================================
// SELL PACKAGE
// =====================================================
export const sellPackageSchema = z.object({
customerId: z.string().uuid(),
packageId: z.string().uuid(),
branchId: z.string().uuid(),
activationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
staffId: z.string().uuid().optional(),
paymentMethod: z.enum(['cash', 'card', 'upi', 'wallet', 'bank_transfer']),
transactionId: z.string().max(100).optional(),
});

// =====================================================
// REDEMPTION
// =====================================================
export const checkBenefitsSchema = z.object({
customerId: z.string().uuid(),
branchId: z.string().uuid(),
services: z.array(z.object({
serviceId: z.string().uuid(),
variantId: z.string().uuid().optional(),
quantity: z.number().int().min(1),
unitPrice: z.number().min(0),
})).min(1),
});

export const applyBenefitsSchema = z.object({
invoiceId: z.string().uuid(),
membershipRedemptions: z.array(z.object({
membershipId: z.string().uuid(),
invoiceItemId: z.string().uuid(),
benefitType: z.enum([
'flat_discount', 'service_discount', 'complimentary_service'
]),
})).optional(),
packageRedemptions: z.array(z.object({
customerPackageId: z.string().uuid(),
invoiceItemId: z.string().uuid(),
creditsToUse: z.number().int().min(1).optional(),
valueToUse: z.number().min(0).optional(),
})).optional(),
});

// =====================================================
// CANCEL & TRANSFER
// =====================================================
export const cancelSchema = z.object({
reason: z.string().min(10).max(500),
refundMethod: z.enum(['wallet', 'cash', 'none']),
});

export const transferSchema = z.object({
toCustomerId: z.string().uuid(),
reason: z.string().min(10).max(500),
verificationMethod: z.enum(['otp', 'physical_card']),
verificationCode: z.string().max(10).optional(),
});

```

```

---

## Integration Points

### Inbound Dependencies (This module uses)

| Module             | Integration             | Purpose                                |
| ------------------ | ----------------------- | -------------------------------------- |
| Customers          | Customer data           | Link memberships/packages to customers |
| Services & Pricing | Service catalog, prices | Define package services, lock prices   |
| Billing            | Invoice creation        | Generate purchase invoices             |
| Staff Management   | Staff data              | Commission attribution                 |

### Outbound Dependencies (Other modules use this)

| Module       | Integration             | Purpose                          |
| ------------ | ----------------------- | -------------------------------- |
| Billing      | Redemption engine       | Apply discounts during billing   |
| Appointments | Priority booking        | Check membership for priority    |
| Reports      | Membership/package data | Liability reports, usage reports |
| Customers    | Membership status       | Display on customer profile      |

### Event Emissions

```typescript
// Events emitted by this module
const MEMBERSHIP_EVENTS = {
  // Membership events
  MEMBERSHIP_SOLD: "membership.sold",
  MEMBERSHIP_ACTIVATED: "membership.activated",
  MEMBERSHIP_FROZEN: "membership.frozen",
  MEMBERSHIP_UNFROZEN: "membership.unfrozen",
  MEMBERSHIP_EXPIRED: "membership.expired",
  MEMBERSHIP_CANCELLED: "membership.cancelled",
  MEMBERSHIP_TRANSFERRED: "membership.transferred",
  MEMBERSHIP_USED: "membership.used",

  // Package events
  PACKAGE_SOLD: "package.sold",
  PACKAGE_ACTIVATED: "package.activated",
  PACKAGE_REDEEMED: "package.redeemed",
  PACKAGE_EXPIRED: "package.expired",
  PACKAGE_EXHAUSTED: "package.exhausted",
  PACKAGE_CANCELLED: "package.cancelled",
  PACKAGE_TRANSFERRED: "package.transferred",

  // Alert events
  EXPIRY_REMINDER: "membership_package.expiry_reminder",
  LOW_BALANCE_ALERT: "package.low_balance_alert",
};
```

// Event payload examples
interface MembershipSoldEvent {
tenantId: string;
membershipId: string;
customerId: string;
planId: string;
branchId: string;
amount: number;
expiryDate: string;
}

interface PackageRedeemedEvent {
tenantId: string;
customerPackageId: string;
customerId: string;
branchId: string;
serviceId: string;
creditsUsed: number;
remainingCredits: number;
invoiceId: string;
}

interface ExpiryReminderEvent {
tenantId: string;
type: 'membership' | 'package';
entityId: string;
customerId: string;
expiryDate: string;
daysRemaining: number;
}

````

---

## Error Handling

```typescript
// Membership & Package specific error codes
export const MEMBERSHIP_PACKAGE_ERRORS = {
  // Plan/Package errors
  PLAN_NOT_FOUND: {
    code: 'MEM_001',
    message: 'Membership plan not found',
    httpStatus: 404,
  },
  PACKAGE_NOT_FOUND: {
    code: 'MEM_002',
    message: 'Package not found',
    httpStatus: 404,
  },
  PLAN_INACTIVE: {
    code: 'MEM_003',
    message: 'Membership plan is inactive',
    httpStatus: 400,
  },
  PACKAGE_INACTIVE: {
    code: 'MEM_004',
    message: 'Package is inactive',
    httpStatus: 400,
  },
````

// Customer membership/package errors
MEMBERSHIP_NOT_FOUND: {
code: 'MEM_010',
message: 'Customer membership not found',
httpStatus: 404,
},
CUSTOMER_PACKAGE_NOT_FOUND: {
code: 'MEM_011',
message: 'Customer package not found',
httpStatus: 404,
},
MEMBERSHIP_EXISTS: {
code: 'MEM_012',
message: 'Customer already has an active membership of this plan',
httpStatus: 409,
},
MEMBERSHIP_NOT_ACTIVE: {
code: 'MEM_013',
message: 'Membership is not active',
httpStatus: 400,
},
PACKAGE_NOT_ACTIVE: {
code: 'MEM_014',
message: 'Package is not active',
httpStatus: 400,
},

// Branch eligibility errors
BRANCH_NOT_ELIGIBLE: {
code: 'MEM_020',
message: 'This plan/package is not available at this branch',
httpStatus: 400,
},

// Validity errors
MEMBERSHIP_EXPIRED: {
code: 'MEM_030',
message: 'Membership has expired',
httpStatus: 400,
},
PACKAGE_EXPIRED: {
code: 'MEM_031',
message: 'Package has expired',
httpStatus: 400,
},
IN_GRACE_PERIOD: {
code: 'MEM_032',
message: 'Membership is in grace period',
httpStatus: 200, // Warning, not error
},

// Freeze errors
FREEZE_LIMIT_EXCEEDED: {
code: 'MEM_040',
message: 'Maximum freeze days exceeded for this year',
httpStatus: 400,
},
ALREADY_FROZEN: {
code: 'MEM_041',
message: 'Membership is already frozen',
httpStatus: 400,
},
NOT_FROZEN: {
code: 'MEM_042',
message: 'Membership is not frozen',
httpStatus: 400,
},

// Redemption errors
INSUFFICIENT_CREDITS: {
code: 'MEM_050',
message: 'Insufficient package credits',
httpStatus: 400,
},
SERVICE_NOT_IN_PACKAGE: {
code: 'MEM_051',
message: 'Service is not included in this package',
httpStatus: 400,
},
COOLDOWN_ACTIVE: {
code: 'MEM_052',
message: 'Membership is in cooldown period',
httpStatus: 400,
},
BENEFIT_CAP_REACHED: {
code: 'MEM_053',
message: 'Benefit cap reached for this period',
httpStatus: 400,
},
VISIT_LIMIT_REACHED: {
code: 'MEM_054',
message: 'Maximum services per visit limit reached',
httpStatus: 400,
},

// Cancel/Transfer errors
ALREADY_CANCELLED: {
code: 'MEM_060',
message: 'Already cancelled',
httpStatus: 400,
},
NON_REFUNDABLE: {
code: 'MEM_061',
message: 'This membership/package is non-refundable',
httpStatus: 400,
},
TRANSFER_VERIFICATION_FAILED: {
code: 'MEM_062',
message: 'Transfer verification failed',
httpStatus: 400,
},
CANNOT_TRANSFER_TO_SELF: {
code: 'MEM_063',
message: 'Cannot transfer to the same customer',
httpStatus: 400,
},
};

```

```

---

## Testing Considerations

### Unit Tests

```typescript
describe("MembershipService", () => {
  describe("sellMembership", () => {
    it("should create membership with correct validity dates");
    it("should generate unique membership number");
    it("should create invoice for membership purchase");
    it("should calculate and attribute commission");
    it("should prevent duplicate active memberships");
    it("should validate branch eligibility");
  });

  describe("freezeMembership", () => {
    it("should extend expiry date by freeze duration");
    it("should enforce maximum freeze days per year");
    it("should block benefits during freeze");
    it("should require approval for freeze");
  });

  describe("processExpiredMemberships", () => {
    it("should mark memberships as expired after grace period");
    it("should send expiry notifications");
  });
});

describe("PackageService", () => {
  describe("sellPackage", () => {
    it("should create package with correct credits");
    it("should lock service prices at purchase time");
    it("should handle value packages with credit value");
  });

  describe("redeemCredits", () => {
    it("should deduct credits correctly");
    it("should mark package as exhausted when all credits used");
    it("should prevent redemption of expired packages");
    it("should validate service is in package");
  });
});
```

describe('RedemptionEngine', () => {
describe('checkAvailableBenefits', () => {
it('should return applicable membership benefits');
it('should return available package credits');
it('should check branch eligibility');
it('should check cooldown period');
it('should apply precedence rules');
});

describe('calculateMembershipBenefit', () => {
it('should apply service-specific discount');
it('should apply flat discount as fallback');
it('should handle complimentary services');
it('should enforce benefit cap');
});
});

describe('MembershipPackageRefundService', () => {
describe('cancelMembership', () => {
it('should calculate refund based on policy');
it('should deduct used value from refund');
it('should apply cancellation fee for partial refund');
it('should credit wallet for wallet refund');
it('should reverse commission on cancellation');
});
});

````

### Integration Tests

```typescript
describe('Membership & Package Flow Integration', () => {
  it('should complete full membership flow: sell → use → freeze → unfreeze → expire');
  it('should complete full package flow: sell → redeem → exhaust');
  it('should apply membership discount during billing');
  it('should redeem package credits during billing');
  it('should handle membership + package precedence correctly');
  it('should track cross-branch usage');
  it('should process refund and update all related records');
});
````

---

## Performance Considerations

1. **Benefit Calculation**: Cache membership benefits per plan, avoid repeated lookups
2. **Credit Balance**: Denormalize remaining credits in customer_packages for quick display
3. **Expiry Processing**: Scheduled job to process expirations in batches, not real-time
4. **Usage History**: Index on (membership_id, usage_date) for efficient history queries
5. **Cross-Branch Reports**: Pre-aggregate cross-branch usage daily via scheduled job
6. **Redemption Check**: Cache customer's active memberships/packages in session

---

## Security Considerations

1. **Plan Management**: Only Super_Owner or Regional_Manager can create/edit plans
2. **Refund Authorization**: Require Branch_Manager or higher for refunds
3. **Transfer Verification**: Require OTP or physical card verification for transfers
4. **Price Locking**: Lock service prices at package purchase, prevent manipulation
5. **Benefit Abuse Prevention**: Enforce cooldown periods, visit limits, and benefit caps
6. **Audit Trail**: Log all sales, redemptions, refunds, transfers, and freezes
7. **Commission Integrity**: Lock commission at sale time, reverse on cancellation
8. **Cross-Branch Tracking**: Track selling vs redeeming branch for liability settlement
