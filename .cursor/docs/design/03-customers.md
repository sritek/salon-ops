# Module 3: Customer Management (CRM) - Design Document

## Overview

This module handles customer data management, profiles, visit history, loyalty programs, wallet management, referrals, and customer segmentation. Customers are shared across all branches of a business with phone number as the unique identifier.

**Related Requirements:** 3.1 - 3.15

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Customer     │──────<│  Customer_Visit │>──────│     Branch      │
│                 │  1:N  │                 │  N:1  │                 │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Customer_Tags   │       │ Loyalty_Points  │       │ Customer_Wallet │
│                 │       │   Transactions  │       │   Transactions  │
└─────────────────┘       └─────────────────┘       └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Referrals    │       │ Customer_Notes  │       │ Customer_Prefs  │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Database Schema

```sql
-- =====================================================
-- CUSTOMERS
-- =====================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Identity (phone is unique per tenant)
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),

  -- Profile
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  full_name VARCHAR(255) GENERATED ALWAYS AS (
    CASE WHEN last_name IS NULL THEN first_name
    ELSE first_name || ' ' || last_name END
  ) STORED,
  gender VARCHAR(10),  -- male, female, other
  date_of_birth DATE,
  anniversary_date DATE,
  profile_photo_url VARCHAR(500),

  -- Contact preferences
  preferred_branch_id UUID REFERENCES branches(id),
  preferred_stylist_id UUID REFERENCES users(id),
  communication_language VARCHAR(10) DEFAULT 'en',  -- en, hi

  -- Marketing consent
  marketing_consent BOOLEAN DEFAULT true,
  whatsapp_consent BOOLEAN DEFAULT true,
  sms_consent BOOLEAN DEFAULT true,
  email_consent BOOLEAN DEFAULT true,
  dnd_flag BOOLEAN DEFAULT false,
  consent_updated_at TIMESTAMP,

  -- No-show tracking
  no_show_count INTEGER DEFAULT 0,
  is_prepaid_only BOOLEAN DEFAULT false,
  is_online_blocked BOOLEAN DEFAULT false,

  -- Loyalty
  loyalty_points_balance INTEGER DEFAULT 0,
  lifetime_points_earned INTEGER DEFAULT 0,
  loyalty_tier VARCHAR(20) DEFAULT 'bronze',  -- bronze, silver, gold, platinum

  -- Wallet
  wallet_balance DECIMAL(10, 2) DEFAULT 0,

  -- Referral
  referral_code VARCHAR(20) UNIQUE,
  referred_by_id UUID REFERENCES customers(id),
  referral_count INTEGER DEFAULT 0,

  -- Analytics
  first_visit_date DATE,
  last_visit_date DATE,
  total_visits INTEGER DEFAULT 0,
  lifetime_value DECIMAL(12, 2) DEFAULT 0,
  average_bill_value DECIMAL(10, 2) DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- active, inactive, blocked
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  UNIQUE(tenant_id, phone),
  CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'blocked'))
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);
CREATE INDEX idx_customers_email ON customers(tenant_id, email);
CREATE INDEX idx_customers_name ON customers(tenant_id, full_name);
CREATE INDEX idx_customers_loyalty_tier ON customers(tenant_id, loyalty_tier);
CREATE INDEX idx_customers_last_visit ON customers(tenant_id, last_visit_date);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

-- =====================================================
-- CUSTOMER TAGS
-- =====================================================
CREATE TABLE customer_tags (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

name VARCHAR(50) NOT NULL,
color VARCHAR(7) DEFAULT '#6B7280', -- Hex color
description VARCHAR(255),
is_system BOOLEAN DEFAULT false, -- VIP, Regular, New, Inactive

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),

UNIQUE(tenant_id, name)
);

CREATE TABLE customer_tag_assignments (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,

assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
assigned_by UUID REFERENCES users(id),

UNIQUE(customer_id, tag_id)
);

CREATE INDEX idx_customer_tags ON customer_tag_assignments(customer_id);

-- =====================================================
-- CUSTOMER VISITS (Denormalized for quick access)
-- =====================================================
CREATE TABLE customer_visits (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
branch_id UUID NOT NULL REFERENCES branches(id),

visit_date DATE NOT NULL,
appointment_id UUID REFERENCES appointments(id),
invoice_id UUID REFERENCES invoices(id),

-- Summary
services_availed TEXT[],
stylist_id UUID REFERENCES users(id),
total_amount DECIMAL(10, 2) NOT NULL,
points_earned INTEGER DEFAULT 0,
points_redeemed INTEGER DEFAULT 0,

-- Feedback
rating INTEGER, -- 1-5
feedback TEXT,

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_visits ON customer_visits(customer_id, visit_date DESC);
CREATE INDEX idx_customer_visits_branch ON customer_visits(branch_id, visit_date);

-- =====================================================
-- LOYALTY POINTS TRANSACTIONS
-- =====================================================
CREATE TABLE loyalty_points_transactions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
branch_id UUID REFERENCES branches(id),

transaction_type VARCHAR(20) NOT NULL,
-- earn_purchase, earn_referral, earn_birthday, earn_manual
-- redeem_discount, redeem_service, expire, adjust

points INTEGER NOT NULL, -- Positive for earn, negative for redeem/expire
balance_after INTEGER NOT NULL,

-- Reference
reference_type VARCHAR(20), -- invoice, referral, manual
reference_id UUID,

description VARCHAR(255),
expires_at DATE, -- For earned points

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_loyalty_transactions ON loyalty_points_transactions(customer_id, created_at DESC);

-- =====================================================
-- CUSTOMER WALLET TRANSACTIONS
-- =====================================================
CREATE TABLE customer_wallet_transactions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
branch_id UUID REFERENCES branches(id),

transaction_type VARCHAR(20) NOT NULL,
-- credit_purchase, credit_refund, credit_gift, credit_manual
-- debit_payment, debit_expire, debit_adjust

amount DECIMAL(10, 2) NOT NULL, -- Positive for credit, negative for debit
balance_after DECIMAL(10, 2) NOT NULL,

-- Reference
reference_type VARCHAR(20), -- invoice, refund, manual
reference_id UUID,

description VARCHAR(255),
payment_method VARCHAR(20), -- For credits: cash, card, upi

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_wallet_transactions ON customer_wallet_transactions(customer_id, created_at DESC);

-- =====================================================
-- REFERRALS
-- =====================================================
CREATE TABLE referrals (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

referrer_id UUID NOT NULL REFERENCES customers(id),
referred_id UUID NOT NULL REFERENCES customers(id),
referral_code VARCHAR(20) NOT NULL,

status VARCHAR(20) DEFAULT 'pending', -- pending, completed, rewarded

-- Rewards
referrer_reward_type VARCHAR(20), -- points, discount, wallet_credit
referrer_reward_value DECIMAL(10, 2),
referrer_rewarded_at TIMESTAMP,

referred_reward_type VARCHAR(20),
referred_reward_value DECIMAL(10, 2),
referred_rewarded_at TIMESTAMP,

-- Completion tracking
referred_first_visit_date DATE,
referred_first_invoice_id UUID REFERENCES invoices(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(referred_id) -- A customer can only be referred once
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- =====================================================
-- CUSTOMER NOTES
-- =====================================================
CREATE TABLE customer_notes (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

note_type VARCHAR(20) NOT NULL, -- general, preference, allergy, complaint, follow_up
content TEXT NOT NULL,
is_pinned BOOLEAN DEFAULT false,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_customer_notes ON customer_notes(customer_id, created_at DESC);

-- =====================================================
-- CUSTOMER PREFERENCES
-- =====================================================
CREATE TABLE customer_preferences (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

preference_type VARCHAR(50) NOT NULL, -- hair_color, skin_type, allergies, etc.
preference_value TEXT NOT NULL,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_by UUID REFERENCES users(id),

UNIQUE(customer_id, preference_type)
);

CREATE INDEX idx_customer_preferences ON customer_preferences(customer_id);

-- =====================================================
-- CUSTOMER SEGMENTS (Dynamic)
-- =====================================================
CREATE TABLE customer_segments (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

name VARCHAR(100) NOT NULL,
description VARCHAR(255),

-- Segment rules (JSON)
rules JSONB NOT NULL,
-- Example: {"conditions": [{"field": "total_visits", "operator": ">=", "value": 5}]}

is_active BOOLEAN DEFAULT true,
customer_count INTEGER DEFAULT 0,
last_computed_at TIMESTAMP,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),

UNIQUE(tenant_id, name)
);

CREATE TABLE customer_segment_members (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

added_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(segment_id, customer_id)
);

CREATE INDEX idx_segment_members ON customer_segment_members(segment_id);
CREATE INDEX idx_customer_segments ON customer_segment_members(customer_id);

````

---

## TypeScript Types

```typescript
// =====================================================
// ENUMS
// =====================================================
export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum'
}

export enum LoyaltyTransactionType {
  EARN_PURCHASE = 'earn_purchase',
  EARN_REFERRAL = 'earn_referral',
  EARN_BIRTHDAY = 'earn_birthday',
  EARN_MANUAL = 'earn_manual',
  REDEEM_DISCOUNT = 'redeem_discount',
  REDEEM_SERVICE = 'redeem_service',
  EXPIRE = 'expire',
  ADJUST = 'adjust'
}

export enum WalletTransactionType {
  CREDIT_PURCHASE = 'credit_purchase',
  CREDIT_REFUND = 'credit_refund',
  CREDIT_GIFT = 'credit_gift',
  CREDIT_MANUAL = 'credit_manual',
  DEBIT_PAYMENT = 'debit_payment',
  DEBIT_EXPIRE = 'debit_expire',
  DEBIT_ADJUST = 'debit_adjust'
}

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REWARDED = 'rewarded'
}

export enum NoteType {
  GENERAL = 'general',
  PREFERENCE = 'preference',
  ALLERGY = 'allergy',
  COMPLAINT = 'complaint',
  FOLLOW_UP = 'follow_up'
}
````

// =====================================================
// CORE TYPES
// =====================================================
export interface Customer {
id: string;
tenantId: string;

// Identity
phone: string;
email?: string;

// Profile
firstName: string;
lastName?: string;
fullName: string;
gender?: Gender;
dateOfBirth?: string;
anniversaryDate?: string;
profilePhotoUrl?: string;

// Preferences
preferredBranchId?: string;
preferredStylistId?: string;
communicationLanguage: string;

// Marketing consent
marketingConsent: boolean;
whatsappConsent: boolean;
smsConsent: boolean;
emailConsent: boolean;
dndFlag: boolean;
consentUpdatedAt?: Date;

// No-show tracking
noShowCount: number;
isPrepaidOnly: boolean;
isOnlineBlocked: boolean;

// Loyalty
loyaltyPointsBalance: number;
lifetimePointsEarned: number;
loyaltyTier: LoyaltyTier;

// Wallet
walletBalance: number;

// Referral
referralCode: string;
referredById?: string;
referralCount: number;

// Analytics
firstVisitDate?: string;
lastVisitDate?: string;
totalVisits: number;
lifetimeValue: number;
averageBillValue: number;

// Status
status: CustomerStatus;
isDeleted: boolean;
deletedAt?: Date;

// Metadata
createdAt: Date;
updatedAt: Date;
createdBy?: string;

// Relations (populated)
tags?: CustomerTag[];
notes?: CustomerNote[];
preferences?: CustomerPreference[];
recentVisits?: CustomerVisit[];
}

export interface CustomerTag {
id: string;
tenantId: string;
name: string;
color: string;
description?: string;
isSystem: boolean;
createdAt: Date;
createdBy?: string;
}

export interface CustomerVisit {
id: string;
tenantId: string;
customerId: string;
branchId: string;
visitDate: string;
appointmentId?: string;
invoiceId?: string;
servicesAvailed: string[];
stylistId?: string;
totalAmount: number;
pointsEarned: number;
pointsRedeemed: number;
rating?: number;
feedback?: string;
createdAt: Date;
}

export interface LoyaltyPointsTransaction {
id: string;
tenantId: string;
customerId: string;
branchId?: string;
transactionType: LoyaltyTransactionType;
points: number;
balanceAfter: number;
referenceType?: string;
referenceId?: string;
description?: string;
expiresAt?: string;
createdAt: Date;
createdBy?: string;
}

export interface WalletTransaction {
id: string;
tenantId: string;
customerId: string;
branchId?: string;
transactionType: WalletTransactionType;
amount: number;
balanceAfter: number;
referenceType?: string;
referenceId?: string;
description?: string;
paymentMethod?: string;
createdAt: Date;
createdBy?: string;
}

export interface Referral {
id: string;
tenantId: string;
referrerId: string;
referredId: string;
referralCode: string;
status: ReferralStatus;
referrerRewardType?: string;
referrerRewardValue?: number;
referrerRewardedAt?: Date;
referredRewardType?: string;
referredRewardValue?: number;
referredRewardedAt?: Date;
referredFirstVisitDate?: string;
referredFirstInvoiceId?: string;
createdAt: Date;
}

export interface CustomerNote {
id: string;
tenantId: string;
customerId: string;
noteType: NoteType;
content: string;
isPinned: boolean;
createdAt: Date;
createdBy?: string;
}

export interface CustomerPreference {
id: string;
tenantId: string;
customerId: string;
preferenceType: string;
preferenceValue: string;
createdAt: Date;
updatedAt: Date;
updatedBy?: string;
}

export interface CustomerSegment {
id: string;
tenantId: string;
name: string;
description?: string;
rules: SegmentRules;
isActive: boolean;
customerCount: number;
lastComputedAt?: Date;
createdAt: Date;
createdBy?: string;
}

export interface SegmentRules {
conditions: SegmentCondition[];
logic: 'AND' | 'OR';
}

export interface SegmentCondition {
field: string;
operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
value: any;
}

```

---

## API Endpoints

### Customer CRUD

```

POST /api/v1/customers Create customer
GET /api/v1/customers List customers (with filters)
GET /api/v1/customers/:id Get customer details
PATCH /api/v1/customers/:id Update customer
DELETE /api/v1/customers/:id Soft delete customer
GET /api/v1/customers/search Search by phone/name/email
GET /api/v1/customers/lookup/:phone Quick lookup by phone

```

### Customer Profile

```

GET /api/v1/customers/:id/visits Get visit history
GET /api/v1/customers/:id/timeline Get engagement timeline
POST /api/v1/customers/:id/notes Add note
GET /api/v1/customers/:id/notes Get notes
PATCH /api/v1/customers/:id/preferences Update preferences
GET /api/v1/customers/:id/preferences Get preferences

```

### Tags

```

GET /api/v1/customer-tags List all tags
POST /api/v1/customer-tags Create tag
PATCH /api/v1/customer-tags/:id Update tag
DELETE /api/v1/customer-tags/:id Delete tag
POST /api/v1/customers/:id/tags Assign tags to customer
DELETE /api/v1/customers/:id/tags/:tagId Remove tag from customer

```

### Loyalty Points

```

GET /api/v1/customers/:id/loyalty Get loyalty summary
GET /api/v1/customers/:id/loyalty/history Get points history
POST /api/v1/customers/:id/loyalty/earn Manual points credit
POST /api/v1/customers/:id/loyalty/redeem Redeem points

```

### Wallet

```

GET /api/v1/customers/:id/wallet Get wallet balance
GET /api/v1/customers/:id/wallet/history Get wallet history
POST /api/v1/customers/:id/wallet/credit Add wallet credit
POST /api/v1/customers/:id/wallet/debit Debit from wallet

```

### Referrals

```

GET /api/v1/customers/:id/referral-code Get/generate referral code
GET /api/v1/customers/:id/referrals Get referral history
POST /api/v1/referrals/validate Validate referral code
POST /api/v1/referrals/apply Apply referral to new customer

```

### Segments

```

GET /api/v1/customer-segments List segments
POST /api/v1/customer-segments Create segment
PATCH /api/v1/customer-segments/:id Update segment
DELETE /api/v1/customer-segments/:id Delete segment
POST /api/v1/customer-segments/:id/compute Recompute segment members
GET /api/v1/customer-segments/:id/members Get segment members

```

---

## Request/Response Schemas
```

### Create Customer

```typescript
// POST /api/v1/customers
interface CreateCustomerRequest {
  phone: string;
  email?: string;
  firstName: string;
  lastName?: string;
  gender?: Gender;
  dateOfBirth?: string; // YYYY-MM-DD
  anniversaryDate?: string;

  preferredBranchId?: string;
  preferredStylistId?: string;
  communicationLanguage?: string;

  marketingConsent?: boolean;
  whatsappConsent?: boolean;
  smsConsent?: boolean;
  emailConsent?: boolean;

  referralCode?: string; // If referred by someone

  tags?: string[]; // Tag IDs
  notes?: string; // Initial note
}

interface CreateCustomerResponse {
  success: boolean;
  data: {
    customer: Customer;
    referralApplied: boolean;
    referralReward?: {
      type: string;
      value: number;
    };
  };
}
```

### Search Customers

```typescript
// GET /api/v1/customers/search
interface SearchCustomersRequest {
  query: string; // Phone, name, or email
  limit?: number;
  includeInactive?: boolean;
}

interface SearchCustomersResponse {
  success: boolean;
  data: {
    customers: CustomerSummary[];
    total: number;
  };
}

interface CustomerSummary {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  loyaltyTier: LoyaltyTier;
  totalVisits: number;
  lastVisitDate?: string;
  tags: { id: string; name: string; color: string }[];
  status: CustomerStatus;
}
```

### Customer Details

```typescript
// GET /api/v1/customers/:id
interface GetCustomerResponse {
  success: boolean;
  data: {
    customer: Customer;
    stats: {
      totalVisits: number;
      lifetimeValue: number;
      averageBillValue: number;
      lastVisitDaysAgo: number;
      loyaltyPointsBalance: number;
      walletBalance: number;
      activeMemberships: number;
      activePackages: number;
    };
    recentVisits: CustomerVisit[];
    upcomingAppointments: AppointmentSummary[];
  };
}
```

### Loyalty Operations

```typescript
// POST /api/v1/customers/:id/loyalty/earn
interface EarnPointsRequest {
  points: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
}

// POST /api/v1/customers/:id/loyalty/redeem
interface RedeemPointsRequest {
  points: number;
  redemptionType: "discount" | "service";
  invoiceId?: string;
}

interface LoyaltySummaryResponse {
  success: boolean;
  data: {
    currentBalance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    tier: LoyaltyTier;
    tierProgress: {
      currentTier: LoyaltyTier;
      nextTier?: LoyaltyTier;
      pointsToNextTier?: number;
      progressPercent: number;
    };
    expiringPoints: {
      amount: number;
      expiryDate: string;
    }[];
    recentTransactions: LoyaltyPointsTransaction[];
  };
}
```

### Wallet Operations

```typescript
// POST /api/v1/customers/:id/wallet/credit
interface WalletCreditRequest {
  amount: number;
  paymentMethod: string;
  description?: string;
}

// POST /api/v1/customers/:id/wallet/debit
interface WalletDebitRequest {
  amount: number;
  invoiceId?: string;
  description?: string;
}

interface WalletSummaryResponse {
  success: boolean;
  data: {
    balance: number;
    totalCredits: number;
    totalDebits: number;
    recentTransactions: WalletTransaction[];
  };
}
```

### Segment Definition

```typescript
// POST /api/v1/customer-segments
interface CreateSegmentRequest {
  name: string;
  description?: string;
  rules: {
    logic: "AND" | "OR";
    conditions: {
      field: string;
      operator: string;
      value: any;
    }[];
  };
}

// Available segment fields
const SEGMENT_FIELDS = [
  "total_visits",
  "lifetime_value",
  "last_visit_days_ago",
  "loyalty_tier",
  "loyalty_points_balance",
  "wallet_balance",
  "no_show_count",
  "average_bill_value",
  "has_membership",
  "has_package",
  "gender",
  "age",
  "preferred_branch_id",
  "tags",
];
```

---

## Business Logic

### 1. Customer Lookup & Creation

```typescript
class CustomerService {
  /**
   * Find or create customer by phone
   * Used during appointment booking and billing
   */
  async findOrCreate(params: {
    phone: string;
    firstName?: string;
    lastName?: string;
    branchId?: string;
  }): Promise<{ customer: Customer; isNew: boolean }> {
    // Normalize phone number
    const normalizedPhone = this.normalizePhone(params.phone);

    // Try to find existing customer
    let customer = await this.db.customers.findFirst({
      where: { phone: normalizedPhone },
    });

    if (customer) {
      return { customer, isNew: false };
    }

    // Create new customer
    customer = await this.db.customers.create({
      tenantId: this.tenantId,
      phone: normalizedPhone,
      firstName: params.firstName || "Guest",
      lastName: params.lastName,
      preferredBranchId: params.branchId,
      referralCode: this.generateReferralCode(),
    });

    // Assign "New" system tag
    await this.assignSystemTag(customer.id, "New");

    return { customer, isNew: true };
  }

  /**
   * Merge duplicate customers (same person, different records)
   */
  async mergeCustomers(
    primaryId: string,
    duplicateId: string,
    userId: string,
  ): Promise<Customer> {
    const [primary, duplicate] = await Promise.all([
      this.getCustomer(primaryId),
      this.getCustomer(duplicateId),
    ]);

    await this.db.transaction(async (tx) => {
      // Transfer visits
      await tx.customerVisits.updateMany({
        where: { customerId: duplicateId },
        data: { customerId: primaryId },
      });

      // Transfer appointments
      await tx.appointments.updateMany({
        where: { customerId: duplicateId },
        data: { customerId: primaryId },
      });

      // Transfer invoices
      await tx.invoices.updateMany({
        where: { customerId: duplicateId },
        data: { customerId: primaryId },
      });

      // Merge loyalty points
      await this.mergeLoyaltyPoints(tx, primaryId, duplicate);

      // Merge wallet balance
      await this.mergeWalletBalance(tx, primaryId, duplicate);

      // Transfer referrals
      await tx.referrals.updateMany({
        where: { referrerId: duplicateId },
        data: { referrerId: primaryId },
      });

      // Recalculate analytics
      await this.recalculateCustomerStats(tx, primaryId);

      // Soft delete duplicate
      await tx.customers.update(duplicateId, {
        isDeleted: true,
        deletedAt: new Date(),
        status: CustomerStatus.INACTIVE,
      });

      // Audit log
      await this.createAuditLog({
        action: "CUSTOMER_MERGED",
        primaryId,
        duplicateId,
        mergedBy: userId,
      });
    });

    return this.getCustomer(primaryId);
  }

  /**
   * Generate unique referral code
   */
  private generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
```

### 2. Loyalty Points Engine

```typescript
class LoyaltyEngine {
  // Tier thresholds (configurable per tenant)
  private readonly TIER_THRESHOLDS = {
    [LoyaltyTier.BRONZE]: 0,
    [LoyaltyTier.SILVER]: 1000,
    [LoyaltyTier.GOLD]: 5000,
    [LoyaltyTier.PLATINUM]: 15000,
  };

  // Points earning rate (configurable)
  private readonly POINTS_PER_RUPEE = 1; // 1 point per ₹1 spent

  /**
   * Award points for a purchase
   */
  async awardPurchasePoints(
    customerId: string,
    invoiceId: string,
    amount: number,
    branchId: string,
  ): Promise<LoyaltyPointsTransaction> {
    const customer = await this.getCustomer(customerId);
    const settings = await this.getLoyaltySettings();

    // Calculate points (may have tier multiplier)
    const basePoints = Math.floor(amount * settings.pointsPerRupee);
    const tierMultiplier = this.getTierMultiplier(customer.loyaltyTier);
    const points = Math.floor(basePoints * tierMultiplier);

    // Calculate expiry date (typically 1 year)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Create transaction
    const transaction = await this.db.loyaltyPointsTransactions.create({
      tenantId: this.tenantId,
      customerId,
      branchId,
      transactionType: LoyaltyTransactionType.EARN_PURCHASE,
      points,
      balanceAfter: customer.loyaltyPointsBalance + points,
      referenceType: "invoice",
      referenceId: invoiceId,
      description: `Points earned on invoice`,
      expiresAt: expiresAt.toISOString().split("T")[0],
    });

    // Update customer balance
    await this.db.customers.update(customerId, {
      loyaltyPointsBalance: customer.loyaltyPointsBalance + points,
      lifetimePointsEarned: customer.lifetimePointsEarned + points,
    });

    // Check for tier upgrade
    await this.checkTierUpgrade(customerId);

    return transaction;
  }

  /**
   * Redeem points for discount
   */
  async redeemPoints(
    customerId: string,
    points: number,
    invoiceId: string,
    branchId: string,
  ): Promise<{ transaction: LoyaltyPointsTransaction; discountValue: number }> {
    const customer = await this.getCustomer(customerId);
    const settings = await this.getLoyaltySettings();

    // Validate sufficient balance
    if (customer.loyaltyPointsBalance < points) {
      throw new BadRequestError(
        "INSUFFICIENT_POINTS",
        "Not enough loyalty points",
      );
    }

    // Calculate discount value
    const discountValue = points * settings.pointRedemptionValue; // e.g., 1 point = ₹0.25

    // Create transaction
    const transaction = await this.db.loyaltyPointsTransactions.create({
      tenantId: this.tenantId,
      customerId,
      branchId,
      transactionType: LoyaltyTransactionType.REDEEM_DISCOUNT,
      points: -points,
      balanceAfter: customer.loyaltyPointsBalance - points,
      referenceType: "invoice",
      referenceId: invoiceId,
      description: `Points redeemed for ₹${discountValue} discount`,
    });

    // Update customer balance
    await this.db.customers.update(customerId, {
      loyaltyPointsBalance: customer.loyaltyPointsBalance - points,
    });

    return { transaction, discountValue };
  }

  /**
   * Check and upgrade tier based on lifetime points
   */
  private async checkTierUpgrade(customerId: string): Promise<void> {
    const customer = await this.getCustomer(customerId);
    const newTier = this.calculateTier(customer.lifetimePointsEarned);

    if (newTier !== customer.loyaltyTier) {
      await this.db.customers.update(customerId, {
        loyaltyTier: newTier,
      });

      // Send tier upgrade notification
      if (this.isHigherTier(newTier, customer.loyaltyTier)) {
        await this.notificationService.sendTierUpgrade(customer, newTier);
      }
    }
  }

  /**
   * Process expired points (cron job)
   */
  async processExpiredPoints(): Promise<void> {
    const today = new Date().toISOString().split("T")[0];

    // Find customers with expiring points
    const expiringTransactions =
      await this.db.loyaltyPointsTransactions.findMany({
        where: {
          transactionType: { startsWith: "earn_" },
          expiresAt: { lte: today },
          points: { gt: 0 },
        },
        groupBy: ["customerId"],
        _sum: { points: true },
      });

    for (const { customerId, _sum } of expiringTransactions) {
      const expiringPoints = _sum.points;
      const customer = await this.getCustomer(customerId);

      // Create expiry transaction
      await this.db.loyaltyPointsTransactions.create({
        tenantId: this.tenantId,
        customerId,
        transactionType: LoyaltyTransactionType.EXPIRE,
        points: -expiringPoints,
        balanceAfter: customer.loyaltyPointsBalance - expiringPoints,
        description: `Points expired`,
      });

      // Update balance
      await this.db.customers.update(customerId, {
        loyaltyPointsBalance: Math.max(
          0,
          customer.loyaltyPointsBalance - expiringPoints,
        ),
      });

      // Notify customer
      await this.notificationService.sendPointsExpired(
        customer,
        expiringPoints,
      );
    }
  }

  private getTierMultiplier(tier: LoyaltyTier): number {
    const multipliers = {
      [LoyaltyTier.BRONZE]: 1.0,
      [LoyaltyTier.SILVER]: 1.25,
      [LoyaltyTier.GOLD]: 1.5,
      [LoyaltyTier.PLATINUM]: 2.0,
    };
    return multipliers[tier];
  }
}
```

### 3. Referral System

```typescript
class ReferralService {
  /**
   * Apply referral code to new customer
   */
  async applyReferral(
    newCustomerId: string,
    referralCode: string,
  ): Promise<Referral> {
    // Find referrer by code
    const referrer = await this.db.customers.findFirst({
      where: { referralCode },
    });

    if (!referrer) {
      throw new NotFoundError(
        "INVALID_REFERRAL_CODE",
        "Referral code not found",
      );
    }

    // Check if customer already referred
    const existingReferral = await this.db.referrals.findFirst({
      where: { referredId: newCustomerId },
    });

    if (existingReferral) {
      throw new ConflictError(
        "ALREADY_REFERRED",
        "Customer already has a referral",
      );
    }

    // Prevent self-referral
    if (referrer.id === newCustomerId) {
      throw new BadRequestError("SELF_REFERRAL", "Cannot refer yourself");
    }

    // Get referral settings
    const settings = await this.getReferralSettings();

    // Create referral record
    const referral = await this.db.referrals.create({
      tenantId: this.tenantId,
      referrerId: referrer.id,
      referredId: newCustomerId,
      referralCode,
      status: ReferralStatus.PENDING,
      referrerRewardType: settings.referrerRewardType,
      referrerRewardValue: settings.referrerRewardValue,
      referredRewardType: settings.referredRewardType,
      referredRewardValue: settings.referredRewardValue,
    });

    // Update referrer's customer record
    await this.db.customers.update(newCustomerId, {
      referredById: referrer.id,
    });

    // Award immediate reward to referred customer (if configured)
    if (settings.referredRewardImmediate) {
      await this.awardReferredReward(referral);
    }

    return referral;
  }

  /**
   * Complete referral after first purchase
   */
  async completeReferral(customerId: string, invoiceId: string): Promise<void> {
    const referral = await this.db.referrals.findFirst({
      where: { referredId: customerId, status: ReferralStatus.PENDING },
    });

    if (!referral) return; // No pending referral

    await this.db.transaction(async (tx) => {
      // Update referral status
      await tx.referrals.update(referral.id, {
        status: ReferralStatus.COMPLETED,
        referredFirstVisitDate: new Date().toISOString().split("T")[0],
        referredFirstInvoiceId: invoiceId,
      });

      // Award referrer reward
      await this.awardReferrerReward(tx, referral);

      // Update referrer's referral count
      await tx.customers.update(referral.referrerId, {
        referralCount: { increment: 1 },
      });
    });
  }

  /**
   * Award reward to referrer
   */
  private async awardReferrerReward(
    tx: Transaction,
    referral: Referral,
  ): Promise<void> {
    const referrer = await tx.customers.findById(referral.referrerId);

    switch (referral.referrerRewardType) {
      case "points":
        await this.loyaltyEngine.awardManualPoints(
          referral.referrerId,
          referral.referrerRewardValue,
          "Referral reward",
          "referral",
          referral.id,
        );
        break;

      case "wallet_credit":
        await this.walletService.credit(
          referral.referrerId,
          referral.referrerRewardValue,
          "Referral reward",
          "referral",
          referral.id,
        );
        break;
    }

    // Update referral record
    await tx.referrals.update(referral.id, {
      status: ReferralStatus.REWARDED,
      referrerRewardedAt: new Date(),
    });

    // Notify referrer
    await this.notificationService.sendReferralReward(referrer, referral);
  }
}
```

### 4. Customer Segmentation Engine

```typescript
class SegmentationEngine {
  /**
   * Compute segment members based on rules
   */
  async computeSegment(segmentId: string): Promise<number> {
    const segment = await this.db.customerSegments.findById(segmentId);

    // Build query from rules
    const whereClause = this.buildWhereClause(segment.rules);

    // Find matching customers
    const matchingCustomers = await this.db.customers.findMany({
      where: {
        ...whereClause,
        status: CustomerStatus.ACTIVE,
        isDeleted: false,
      },
      select: { id: true },
    });

    // Clear existing members
    await this.db.customerSegmentMembers.deleteMany({
      where: { segmentId },
    });

    // Add new members
    if (matchingCustomers.length > 0) {
      await this.db.customerSegmentMembers.createMany({
        data: matchingCustomers.map((c) => ({
          tenantId: this.tenantId,
          segmentId,
          customerId: c.id,
        })),
      });
    }

    // Update segment stats
    await this.db.customerSegments.update(segmentId, {
      customerCount: matchingCustomers.length,
      lastComputedAt: new Date(),
    });

    return matchingCustomers.length;
  }

  /**
   * Build SQL where clause from segment rules
   */
  private buildWhereClause(rules: SegmentRules): any {
    const conditions = rules.conditions.map((c) => this.buildCondition(c));

    if (rules.logic === "AND") {
      return { AND: conditions };
    } else {
      return { OR: conditions };
    }
  }

  private buildCondition(condition: SegmentCondition): any {
    const { field, operator, value } = condition;

    // Handle special computed fields
    if (field === "last_visit_days_ago") {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - value);
      return this.buildOperatorCondition(
        "lastVisitDate",
        this.invertOperator(operator),
        cutoffDate,
      );
    }

    if (field === "age") {
      const birthYear = new Date().getFullYear() - value;
      return this.buildOperatorCondition(
        "dateOfBirth",
        this.invertOperator(operator),
        `${birthYear}-01-01`,
      );
    }

    if (field === "has_membership") {
      // Requires join with memberships table
      return { activeMemberships: value ? { gt: 0 } : { equals: 0 } };
    }

    if (field === "tags") {
      return {
        tags: {
          some: { tagId: { in: value } },
        },
      };
    }

    // Standard field mapping
    const fieldMap: Record<string, string> = {
      total_visits: "totalVisits",
      lifetime_value: "lifetimeValue",
      loyalty_tier: "loyaltyTier",
      loyalty_points_balance: "loyaltyPointsBalance",
      wallet_balance: "walletBalance",
      no_show_count: "noShowCount",
      average_bill_value: "averageBillValue",
      gender: "gender",
      preferred_branch_id: "preferredBranchId",
    };

    const dbField = fieldMap[field] || field;
    return this.buildOperatorCondition(dbField, operator, value);
  }

  private buildOperatorCondition(
    field: string,
    operator: string,
    value: any,
  ): any {
    const operatorMap: Record<string, string> = {
      eq: "equals",
      neq: "not",
      gt: "gt",
      gte: "gte",
      lt: "lt",
      lte: "lte",
      contains: "contains",
      in: "in",
    };

    if (operator === "between") {
      return { [field]: { gte: value[0], lte: value[1] } };
    }

    return { [field]: { [operatorMap[operator]]: value } };
  }

  /**
   * Get predefined system segments
   */
  async getSystemSegments(): Promise<CustomerSegment[]> {
    return [
      {
        name: "New Customers",
        rules: {
          logic: "AND",
          conditions: [{ field: "total_visits", operator: "eq", value: 1 }],
        },
      },
      {
        name: "Regular Customers",
        rules: {
          logic: "AND",
          conditions: [{ field: "total_visits", operator: "gte", value: 5 }],
        },
      },
      {
        name: "VIP Customers",
        rules: {
          logic: "AND",
          conditions: [
            { field: "lifetime_value", operator: "gte", value: 50000 },
          ],
        },
      },
      {
        name: "Inactive (30+ days)",
        rules: {
          logic: "AND",
          conditions: [
            { field: "last_visit_days_ago", operator: "gte", value: 30 },
          ],
        },
      },
      {
        name: "At Risk (60+ days)",
        rules: {
          logic: "AND",
          conditions: [
            { field: "last_visit_days_ago", operator: "gte", value: 60 },
          ],
        },
      },
      {
        name: "Churned (90+ days)",
        rules: {
          logic: "AND",
          conditions: [
            { field: "last_visit_days_ago", operator: "gte", value: 90 },
          ],
        },
      },
    ];
  }
}
```

### 5. Customer Analytics

```typescript
class CustomerAnalyticsService {
  /**
   * Update customer stats after a visit
   */
  async updateCustomerStats(
    customerId: string,
    invoiceAmount: number,
    branchId: string,
  ): Promise<void> {
    const customer = await this.getCustomer(customerId);
    const today = new Date().toISOString().split("T")[0];

    const newTotalVisits = customer.totalVisits + 1;
    const newLifetimeValue = customer.lifetimeValue + invoiceAmount;
    const newAverageBillValue = newLifetimeValue / newTotalVisits;

    await this.db.customers.update(customerId, {
      totalVisits: newTotalVisits,
      lifetimeValue: newLifetimeValue,
      averageBillValue: newAverageBillValue,
      lastVisitDate: today,
      firstVisitDate: customer.firstVisitDate || today,
    });

    // Update tags based on new stats
    await this.updateAutoTags(customerId, {
      totalVisits: newTotalVisits,
      lifetimeValue: newLifetimeValue,
    });
  }

  /**
   * Auto-assign tags based on customer behavior
   */
  private async updateAutoTags(
    customerId: string,
    stats: { totalVisits: number; lifetimeValue: number },
  ): Promise<void> {
    // Remove "New" tag after first visit
    if (stats.totalVisits > 1) {
      await this.removeSystemTag(customerId, "New");
    }

    // Add "Regular" tag after 5 visits
    if (stats.totalVisits >= 5) {
      await this.assignSystemTag(customerId, "Regular");
    }

    // Add "VIP" tag for high lifetime value
    if (stats.lifetimeValue >= 50000) {
      await this.assignSystemTag(customerId, "VIP");
    }
  }

  /**
   * Calculate churn risk score
   */
  async calculateChurnRisk(customerId: string): Promise<{
    score: number; // 0-100
    factors: string[];
  }> {
    const customer = await this.getCustomer(customerId);
    const factors: string[] = [];
    let score = 0;

    // Days since last visit
    const daysSinceVisit = this.daysSince(customer.lastVisitDate);
    if (daysSinceVisit > 90) {
      score += 40;
      factors.push("No visit in 90+ days");
    } else if (daysSinceVisit > 60) {
      score += 25;
      factors.push("No visit in 60+ days");
    } else if (daysSinceVisit > 30) {
      score += 10;
      factors.push("No visit in 30+ days");
    }

    // Visit frequency declining
    const recentVisitFrequency = await this.getVisitFrequency(customerId, 90);
    const historicalFrequency = await this.getVisitFrequency(customerId, 365);
    if (recentVisitFrequency < historicalFrequency * 0.5) {
      score += 20;
      factors.push("Visit frequency declining");
    }

    // No-show history
    if (customer.noShowCount >= 2) {
      score += 15;
      factors.push("Multiple no-shows");
    }

    // Low engagement (no loyalty redemption)
    if (customer.loyaltyPointsBalance > 1000 && customer.totalVisits > 5) {
      score += 10;
      factors.push("Unused loyalty points");
    }

    return { score: Math.min(100, score), factors };
  }
}
```

---

## Validation Schemas

```typescript
import { z } from "zod";

// =====================================================
// CREATE CUSTOMER
// =====================================================
export const createCustomerSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
  email: z.string().email().optional(),
  firstName: z.string().min(2).max(100),
  lastName: z.string().max(100).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  anniversaryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  preferredBranchId: z.string().uuid().optional(),
  preferredStylistId: z.string().uuid().optional(),
  communicationLanguage: z.enum(["en", "hi"]).default("en"),

  marketingConsent: z.boolean().default(true),
  whatsappConsent: z.boolean().default(true),
  smsConsent: z.boolean().default(true),
  emailConsent: z.boolean().default(true),

  referralCode: z.string().length(8).optional(),
  tags: z.array(z.string().uuid()).optional(),
  notes: z.string().max(1000).optional(),
});

// =====================================================
// UPDATE CUSTOMER
// =====================================================
export const updateCustomerSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().max(100).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  anniversaryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  profilePhotoUrl: z.string().url().optional(),

  preferredBranchId: z.string().uuid().optional(),
  preferredStylistId: z.string().uuid().optional(),
  communicationLanguage: z.enum(["en", "hi"]).optional(),

  marketingConsent: z.boolean().optional(),
  whatsappConsent: z.boolean().optional(),
  smsConsent: z.boolean().optional(),
  emailConsent: z.boolean().optional(),
  dndFlag: z.boolean().optional(),
});

// =====================================================
// SEARCH CUSTOMERS
// =====================================================
export const searchCustomersSchema = z.object({
  query: z.string().min(2).max(100),
  limit: z.number().int().min(1).max(50).default(10),
  includeInactive: z.boolean().default(false),
});

// =====================================================
// LOYALTY OPERATIONS
// =====================================================
export const earnPointsSchema = z.object({
  points: z.number().int().min(1).max(100000),
  reason: z.string().min(3).max(255),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
});

export const redeemPointsSchema = z.object({
  points: z.number().int().min(1),
  redemptionType: z.enum(["discount", "service"]),
  invoiceId: z.string().uuid().optional(),
});

// =====================================================
// WALLET OPERATIONS
// =====================================================
export const walletCreditSchema = z.object({
  amount: z.number().min(1).max(1000000),
  paymentMethod: z.enum(["cash", "card", "upi", "bank_transfer"]),
  description: z.string().max(255).optional(),
});

export const walletDebitSchema = z.object({
  amount: z.number().min(1),
  invoiceId: z.string().uuid().optional(),
  description: z.string().max(255).optional(),
});

// =====================================================
// CUSTOMER SEGMENT
// =====================================================
export const createSegmentSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
  rules: z.object({
    logic: z.enum(["AND", "OR"]),
    conditions: z
      .array(
        z.object({
          field: z.string(),
          operator: z.enum([
            "eq",
            "neq",
            "gt",
            "gte",
            "lt",
            "lte",
            "contains",
            "in",
            "between",
          ]),
          value: z.any(),
        }),
      )
      .min(1),
  }),
});

// =====================================================
// CUSTOMER NOTE
// =====================================================
export const createNoteSchema = z.object({
  noteType: z.enum([
    "general",
    "preference",
    "allergy",
    "complaint",
    "follow_up",
  ]),
  content: z.string().min(1).max(2000),
  isPinned: z.boolean().default(false),
});

// =====================================================
// CUSTOMER TAG
// =====================================================
export const createTagSchema = z.object({
  name: z.string().min(2).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#6B7280"),
  description: z.string().max(255).optional(),
});
```

---

## Integration Points

### Inbound Dependencies (This module uses)

| Module            | Integration  | Purpose                     |
| ----------------- | ------------ | --------------------------- |
| Tenant Management | Branch list  | Preferred branch selection  |
| Staff Management  | Stylist list | Preferred stylist selection |

### Outbound Dependencies (Other modules use this)

| Module         | Integration                    | Purpose                           |
| -------------- | ------------------------------ | --------------------------------- |
| Appointments   | Customer lookup                | Book appointments                 |
| Billing        | Customer data, wallet, loyalty | Apply discounts, process payments |
| Marketing      | Customer segments, consent     | Target campaigns                  |
| Reports        | Customer analytics             | CRM reports                       |
| Online Booking | Customer profile               | Pre-fill booking forms            |

### Event Emissions

```typescript
// Events emitted by this module
const CUSTOMER_EVENTS = {
  CUSTOMER_CREATED: "customer.created",
  CUSTOMER_UPDATED: "customer.updated",
  CUSTOMER_MERGED: "customer.merged",
  CUSTOMER_DELETED: "customer.deleted",

  LOYALTY_POINTS_EARNED: "loyalty.points_earned",
  LOYALTY_POINTS_REDEEMED: "loyalty.points_redeemed",
  LOYALTY_POINTS_EXPIRED: "loyalty.points_expired",
  LOYALTY_TIER_CHANGED: "loyalty.tier_changed",

  WALLET_CREDITED: "wallet.credited",
  WALLET_DEBITED: "wallet.debited",

  REFERRAL_APPLIED: "referral.applied",
  REFERRAL_COMPLETED: "referral.completed",
  REFERRAL_REWARDED: "referral.rewarded",

  SEGMENT_COMPUTED: "segment.computed",
};

// Event payload examples
interface CustomerCreatedEvent {
  customerId: string;
  tenantId: string;
  phone: string;
  firstName: string;
  referredBy?: string;
  createdBy: string;
}

interface LoyaltyPointsEarnedEvent {
  customerId: string;
  tenantId: string;
  points: number;
  newBalance: number;
  transactionType: LoyaltyTransactionType;
  referenceId?: string;
}
```

---

## Error Handling

```typescript
// Customer-specific error codes
export const CUSTOMER_ERRORS = {
  // Lookup errors
  CUSTOMER_NOT_FOUND: {
    code: "CUS_001",
    message: "Customer not found",
    httpStatus: 404,
  },
  PHONE_ALREADY_EXISTS: {
    code: "CUS_002",
    message: "Customer with this phone number already exists",
    httpStatus: 409,
  },

  // Loyalty errors
  INSUFFICIENT_POINTS: {
    code: "CUS_010",
    message: "Insufficient loyalty points",
    httpStatus: 400,
  },
  POINTS_EXPIRED: {
    code: "CUS_011",
    message: "Points have expired",
    httpStatus: 400,
  },

  // Wallet errors
  INSUFFICIENT_WALLET_BALANCE: {
    code: "CUS_020",
    message: "Insufficient wallet balance",
    httpStatus: 400,
  },
  INVALID_WALLET_AMOUNT: {
    code: "CUS_021",
    message: "Invalid wallet amount",
    httpStatus: 400,
  },

  // Referral errors
  INVALID_REFERRAL_CODE: {
    code: "CUS_030",
    message: "Invalid referral code",
    httpStatus: 404,
  },
  ALREADY_REFERRED: {
    code: "CUS_031",
    message: "Customer already has a referral",
    httpStatus: 409,
  },
  SELF_REFERRAL: {
    code: "CUS_032",
    message: "Cannot refer yourself",
    httpStatus: 400,
  },

  // Segment errors
  SEGMENT_NOT_FOUND: {
    code: "CUS_040",
    message: "Segment not found",
    httpStatus: 404,
  },
  INVALID_SEGMENT_RULES: {
    code: "CUS_041",
    message: "Invalid segment rules",
    httpStatus: 400,
  },

  // Tag errors
  TAG_NOT_FOUND: {
    code: "CUS_050",
    message: "Tag not found",
    httpStatus: 404,
  },
  SYSTEM_TAG_IMMUTABLE: {
    code: "CUS_051",
    message: "System tags cannot be modified",
    httpStatus: 400,
  },

  // Merge errors
  CANNOT_MERGE_SAME_CUSTOMER: {
    code: "CUS_060",
    message: "Cannot merge customer with itself",
    httpStatus: 400,
  },
};
```

---

## Testing Considerations

### Unit Tests

```typescript
describe("CustomerService", () => {
  describe("findOrCreate", () => {
    it("should return existing customer for known phone");
    it("should create new customer for unknown phone");
    it("should normalize phone number format");
    it("should generate unique referral code");
    it('should assign "New" tag to new customers');
  });

  describe("mergeCustomers", () => {
    it("should transfer all visits to primary");
    it("should merge loyalty points");
    it("should merge wallet balance");
    it("should soft delete duplicate");
    it("should create audit log");
  });
});

describe("LoyaltyEngine", () => {
  describe("awardPurchasePoints", () => {
    it("should calculate points based on amount");
    it("should apply tier multiplier");
    it("should set expiry date");
    it("should update customer balance");
    it("should check for tier upgrade");
  });

  describe("redeemPoints", () => {
    it("should reject if insufficient balance");
    it("should calculate discount value");
    it("should deduct from balance");
  });

  describe("processExpiredPoints", () => {
    it("should expire points past expiry date");
    it("should notify customer");
    it("should update balance");
  });
});

describe("ReferralService", () => {
  describe("applyReferral", () => {
    it("should link referrer to new customer");
    it("should reject invalid code");
    it("should reject self-referral");
    it("should reject already referred customer");
  });

  describe("completeReferral", () => {
    it("should award referrer reward on first purchase");
    it("should update referral status");
    it("should increment referral count");
  });
});

describe("SegmentationEngine", () => {
  describe("computeSegment", () => {
    it("should find customers matching AND conditions");
    it("should find customers matching OR conditions");
    it("should handle computed fields like last_visit_days_ago");
    it("should update segment member count");
  });
});
```

### Integration Tests

```typescript
describe("Customer Flow Integration", () => {
  it(
    "should complete full customer lifecycle: create → visit → earn points → redeem",
  );
  it(
    "should complete referral flow: apply code → first purchase → reward both",
  );
  it("should update segments when customer stats change");
  it("should handle concurrent wallet operations");
});
```

---

## Performance Considerations

1. **Phone Lookup**: Index on (tenant_id, phone) for O(1) lookup during booking
2. **Segment Computation**: Run as background job, cache results, recompute periodically
3. **Loyalty Expiry**: Batch process in off-peak hours via cron job
4. **Customer Search**: Use full-text search index on name, phone, email
5. **Visit History**: Paginate with cursor-based pagination for large histories

---

## Security Considerations

1. **Phone Number Privacy**: Mask phone in list views (show last 4 digits)
2. **Consent Management**: Respect DND flag, log all consent changes
3. **Wallet Operations**: Require manager approval for manual credits above threshold
4. **Data Export**: Include only consented customers in marketing exports
5. **Merge Operations**: Require Super_Owner or Branch_Manager role
6. **Audit Trail**: Log all sensitive operations (merge, delete, manual adjustments)
