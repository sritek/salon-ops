# Module 1: Tenant Management - Design Document

## Overview

This module handles the foundation of the multi-tenant SaaS platform including business registration, authentication, branch management, user management, role-based access control, and subscription management.

**Related Requirements:** 1.1 - 1.11

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Tenant      │       │     Branch      │       │      User       │
│   (Business)    │──────<│                 │>──────│    (Staff)      │
│                 │  1:N  │                 │  N:M  │                 │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Subscription   │       │ Branch_Holiday  │       │  User_Branch    │
│                 │       │                 │       │  (Assignment)   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                            │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │   Audit_Log     │
                                                   │                 │
                                                   └─────────────────┘
```

### Database Schema

```sql
-- =====================================================
-- TENANT (BUSINESS)
-- =====================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  legal_name VARCHAR(255),
  business_type VARCHAR(50) DEFAULT 'salon',

  -- Contact
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  -- Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  invoice_header TEXT,
  invoice_footer TEXT,
```

-- Settings (JSONB for flexibility)
settings JSONB DEFAULT '{
"timezone": "Asia/Kolkata",
"currency": "INR",
"dateFormat": "DD/MM/YYYY",
"timeFormat": "12h",
"fiscalYearStart": 4,
"defaultGstRate": 18,
"pricesIncludeGst": false
}',

-- Subscription
subscription_plan VARCHAR(50) DEFAULT 'trial',
subscription_status VARCHAR(20) DEFAULT 'active',
subscription_started_at TIMESTAMP,
subscription_ends_at TIMESTAMP,
trial_ends_at TIMESTAMP,
max_branches INTEGER DEFAULT 1,
max_users INTEGER DEFAULT 5,

-- Metadata
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMP,

-- Constraints
CONSTRAINT valid_subscription_status CHECK (
subscription_status IN ('active', 'trial', 'past_due', 'cancelled', 'suspended')
)
);

CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_email ON tenants(email) WHERE deleted_at IS NULL;

-- =====================================================
-- BRANCH
-- =====================================================
CREATE TABLE branches (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

-- Basic Info
name VARCHAR(255) NOT NULL,
slug VARCHAR(100) NOT NULL,

-- Address
address_line1 VARCHAR(255),
address_line2 VARCHAR(255),
city VARCHAR(100),
state VARCHAR(100),
pincode VARCHAR(10),
country VARCHAR(50) DEFAULT 'India',
latitude DECIMAL(10, 8),
longitude DECIMAL(11, 8),

-- Contact
phone VARCHAR(20),
email VARCHAR(255),
whatsapp VARCHAR(20),

-- GST
gstin VARCHAR(20),
gst_legal_name VARCHAR(255),

-- Branding (override tenant)
logo_url VARCHAR(500),

-- Configuration
timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
currency VARCHAR(3) DEFAULT 'INR',

-- Working Hours (JSONB)
working_hours JSONB DEFAULT '{
"monday": {"isOpen": true, "open": "09:00", "close": "21:00"},
"tuesday": {"isOpen": true, "open": "09:00", "close": "21:00"},
"wednesday": {"isOpen": true, "open": "09:00", "close": "21:00"},
"thursday": {"isOpen": true, "open": "09:00", "close": "21:00"},
"friday": {"isOpen": true, "open": "09:00", "close": "21:00"},
"saturday": {"isOpen": true, "open": "09:00", "close": "21:00"},
"sunday": {"isOpen": false, "open": null, "close": null}
}',

-- Settings (JSONB)
settings JSONB DEFAULT '{
"appointmentSlotMinutes": 15,
"bufferMinutes": 0,
"advanceBookingDays": 30,
"minAdvanceBookingHours": 2,
"cancellationWindowHours": 2,
"gracePeriodMinutes": 15,
"pricesIncludeGst": false,
"roundingRule": "nearest_1",
"onlineBookingEnabled": true
}',

-- Status
is_active BOOLEAN DEFAULT true,
is_primary BOOLEAN DEFAULT false,

-- Metadata
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMP,

-- Constraints
UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_branches_active ON branches(tenant_id, is_active) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON branches
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- BRANCH HOLIDAYS
-- =====================================================
CREATE TABLE branch_holidays (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

date DATE NOT NULL,
name VARCHAR(100),
is_full_day BOOLEAN DEFAULT true,
open_time TIME,
close_time TIME,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),

UNIQUE(branch_id, date)
);

CREATE INDEX idx_branch_holidays ON branch_holidays(branch_id, date);

-- Enable RLS
ALTER TABLE branch_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON branch_holidays
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- USER (STAFF)
-- =====================================================
CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

-- Authentication
email VARCHAR(255),
phone VARCHAR(20) NOT NULL,
password_hash VARCHAR(255) NOT NULL,

-- Profile
name VARCHAR(255) NOT NULL,
gender VARCHAR(10),
avatar_url VARCHAR(500),

-- Role
role VARCHAR(50) NOT NULL,

-- Staff-specific (for stylists)
skill_level VARCHAR(20), -- junior, senior, expert
specializations TEXT[],
bio TEXT,

-- Employment
employee_id VARCHAR(50),
joining_date DATE,
employment_type VARCHAR(20) DEFAULT 'full_time',

-- Status
is_active BOOLEAN DEFAULT true,
is_online_visible BOOLEAN DEFAULT true,

-- Session
last_login_at TIMESTAMP,
last_login_ip VARCHAR(45),
refresh_token_hash VARCHAR(255),

-- Settings
settings JSONB DEFAULT '{}',

-- Metadata
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMP,

-- Constraints
UNIQUE(tenant_id, phone),
UNIQUE(tenant_id, email) WHERE email IS NOT NULL,
CONSTRAINT valid_role CHECK (
role IN ('super_owner', 'regional_manager', 'branch_manager', 'receptionist', 'stylist', 'accountant')
),
CONSTRAINT valid_skill_level CHECK (
skill_level IS NULL OR skill_level IN ('junior', 'senior', 'expert')
)
);

CREATE INDEX idx_users_tenant ON users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(tenant_id, phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(tenant_id, role) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- USER-BRANCH ASSIGNMENT
-- =====================================================
CREATE TABLE user_branches (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

is_primary BOOLEAN DEFAULT false,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(user_id, branch_id)
);

CREATE INDEX idx_user_branches_user ON user_branches(user_id);
CREATE INDEX idx_user_branches_branch ON user_branches(branch_id);

-- Enable RLS
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON user_branches
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- SUBSCRIPTION HISTORY
-- =====================================================
CREATE TABLE subscription_history (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

plan VARCHAR(50) NOT NULL,
billing_cycle VARCHAR(20) NOT NULL, -- monthly, annual
amount DECIMAL(10, 2) NOT NULL,
currency VARCHAR(3) DEFAULT 'INR',

started_at TIMESTAMP NOT NULL,
ended_at TIMESTAMP,

payment_id VARCHAR(100),
payment_status VARCHAR(20),
invoice_url VARCHAR(500),

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_history_tenant ON subscription_history(tenant_id, created_at DESC);

-- =====================================================
-- AUDIT LOG
-- =====================================================
CREATE TABLE audit_logs (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL,
branch_id UUID,
user_id UUID,

action VARCHAR(100) NOT NULL,
entity_type VARCHAR(50) NOT NULL,
entity_id UUID,

old_values JSONB,
new_values JSONB,

ip_address VARCHAR(45),
user_agent TEXT,

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Partitioned by month for performance
CREATE INDEX idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- =====================================================
-- TENANT THEME SETTINGS
-- =====================================================
CREATE TABLE tenant_theme_settings (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

preset VARCHAR(50) NOT NULL DEFAULT 'indigo-night',
appearance VARCHAR(20) NOT NULL DEFAULT 'system',

-- Custom colors (only used when preset = 'custom')
custom_primary VARCHAR(7),
custom_primary_light VARCHAR(7),
custom_primary_dark VARCHAR(7),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_by UUID REFERENCES users(id),

CONSTRAINT valid_preset CHECK (
preset IN ('indigo-night', 'rose-gold', 'ocean-breeze', 'forest-calm',
'sunset-glow', 'midnight-purple', 'classic-professional', 'custom')
),
CONSTRAINT valid_appearance CHECK (
appearance IN ('light', 'dark', 'system')
)
);

-- =====================================================
-- BRANCH THEME SETTINGS (overrides tenant)
-- =====================================================
CREATE TABLE branch_theme_settings (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
branch_id UUID NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,

preset VARCHAR(50) NOT NULL,
appearance VARCHAR(20) NOT NULL DEFAULT 'system',

custom_primary VARCHAR(7),
custom_primary_light VARCHAR(7),
custom_primary_dark VARCHAR(7),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_by UUID REFERENCES users(id),

CONSTRAINT valid_preset CHECK (
preset IN ('indigo-night', 'rose-gold', 'ocean-breeze', 'forest-calm',
'sunset-glow', 'midnight-purple', 'classic-professional', 'custom')
),
CONSTRAINT valid_appearance CHECK (
appearance IN ('light', 'dark', 'system')
)
);

-- Enable RLS
ALTER TABLE branch_theme_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON branch_theme_settings
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- USER THEME PREFERENCES (overrides branch/tenant)
-- =====================================================
CREATE TABLE user_theme_preferences (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

preset VARCHAR(50) NOT NULL,
appearance VARCHAR(20) NOT NULL DEFAULT 'system',

custom_primary VARCHAR(7),
custom_primary_light VARCHAR(7),
custom_primary_dark VARCHAR(7),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

CONSTRAINT valid_preset CHECK (
preset IN ('indigo-night', 'rose-gold', 'ocean-breeze', 'forest-calm',
'sunset-glow', 'midnight-purple', 'classic-professional', 'custom')
),
CONSTRAINT valid_appearance CHECK (
appearance IN ('light', 'dark', 'system')
)
);

-- Enable RLS
ALTER TABLE user_theme_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON user_theme_preferences
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

---

## TypeScript Types

```typescript
// types/tenant.ts

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  legalName?: string;
  businessType: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  primaryColor: string;
  invoiceHeader?: string;
  invoiceFooter?: string;
  settings: TenantSettings;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartedAt?: Date;
  subscriptionEndsAt?: Date;
  trialEndsAt?: Date;
  maxBranches: number;
  maxUsers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  fiscalYearStart: number; // 1-12 (month)
  defaultGstRate: number;
  pricesIncludeGst: boolean;
}

export type SubscriptionPlan =
  | "trial"
  | "starter"
  | "professional"
  | "enterprise";
export type SubscriptionStatus =
  | "active"
  | "trial"
  | "past_due"
  | "cancelled"
  | "suspended";

// types/branch.ts

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  address: Address;
  phone?: string;
  email?: string;
  whatsapp?: string;
  gstin?: string;
  gstLegalName?: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  workingHours: WorkingHours;
  settings: BranchSettings;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  open?: string; // "09:00"
  close?: string; // "21:00"
}

export interface BranchSettings {
  appointmentSlotMinutes: number;
  bufferMinutes: number;
  advanceBookingDays: number;
  minAdvanceBookingHours: number;
  cancellationWindowHours: number;
  gracePeriodMinutes: number;
  pricesIncludeGst: boolean;
  roundingRule: "nearest_1" | "nearest_5" | "nearest_10";
  onlineBookingEnabled: boolean;
}

// types/user.ts

export interface User {
  id: string;
  tenantId: string;
  email?: string;
  phone: string;
  name: string;
  gender?: "male" | "female" | "other";
  avatarUrl?: string;
  role: UserRole;
  skillLevel?: "junior" | "senior" | "expert";
  specializations?: string[];
  bio?: string;
  employeeId?: string;
  joiningDate?: Date;
  employmentType: "full_time" | "part_time" | "contractual";
  isActive: boolean;
  isOnlineVisible: boolean;
  lastLoginAt?: Date;
  branches: UserBranch[];
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole =
  | "super_owner"
  | "regional_manager"
  | "branch_manager"
  | "receptionist"
  | "stylist"
  | "accountant";

export interface UserBranch {
  branchId: string;
  branchName: string;
  isPrimary: boolean;
}

// types/theme.ts

export type ThemePreset =
  | "indigo-night"
  | "rose-gold"
  | "ocean-breeze"
  | "forest-calm"
  | "sunset-glow"
  | "midnight-purple"
  | "classic-professional"
  | "custom";

export type AppearanceMode = "light" | "dark" | "system";

export interface ThemeConfig {
  preset: ThemePreset;
  appearance: AppearanceMode;
  customColors?: {
    primary: string;
    primaryLight?: string;
    primaryDark?: string;
  };
}

export interface TenantThemeSettings {
  id: string;
  tenantId: string;
  config: ThemeConfig;
  updatedAt: Date;
  updatedBy?: string;
}

export interface BranchThemeSettings {
  id: string;
  tenantId: string;
  branchId: string;
  config: ThemeConfig;
  updatedAt: Date;
  updatedBy?: string;
}

export interface UserThemePreference {
  id: string;
  tenantId: string;
  userId: string;
  config: ThemeConfig;
  updatedAt: Date;
}

export interface ResolvedTheme {
  config: ThemeConfig;
  source: "user" | "branch" | "tenant" | "default";
}
```

---

## API Endpoints

### Authentication

```yaml
POST /api/v1/auth/register:
  description: Register new business
  body:
    businessName: string (required)
    ownerName: string (required)
    email: string (required)
    phone: string (required)
    password: string (required, min 8 chars)
  response:
    tenant: Tenant
    user: User
    accessToken: string
    refreshToken: string

POST /api/v1/auth/login:
  description: Login user
  body:
    identifier: string (email or phone)
    password: string
  response:
    user: User
    tenant: Tenant
    branches: Branch[]
    accessToken: string
    refreshToken: string

POST /api/v1/auth/refresh:
  description: Refresh access token
  body:
    refreshToken: string
  response:
    accessToken: string
    refreshToken: string

POST /api/v1/auth/logout:
  description: Logout user
  headers:
    Authorization: Bearer <token>
  response:
    success: true

POST /api/v1/auth/forgot-password:
  description: Request password reset
  body:
    email: string
  response:
    message: "Reset link sent if email exists"

POST /api/v1/auth/reset-password:
  description: Reset password with token
  body:
    token: string
    password: string
  response:
    success: true
```

### Tenant Management

```yaml
GET /api/v1/tenant:
  description: Get current tenant details
  auth: required
  response:
    tenant: Tenant
    usage:
      branches: { current: number, max: number }
      users: { current: number, max: number }

PATCH /api/v1/tenant:
  description: Update tenant details
  auth: required (super_owner only)
  body:
    name?: string
    legalName?: string
    email?: string
    phone?: string
    logoUrl?: string
    primaryColor?: string
    invoiceHeader?: string
    invoiceFooter?: string
    settings?: Partial<TenantSettings>
  response:
    tenant: Tenant

GET /api/v1/tenant/subscription:
  description: Get subscription details
  auth: required (super_owner only)
  response:
    plan: SubscriptionPlan
    status: SubscriptionStatus
    currentPeriodEnd: Date
    usage: { branches, users }
    history: SubscriptionHistory[]
```

### Theme Settings

```yaml
GET /api/v1/theme:
  description: Get resolved theme for current user
  auth: required
  response:
    config: ThemeConfig
    source: "user" | "branch" | "tenant" | "default"

GET /api/v1/tenant/theme:
  description: Get tenant-level theme settings
  auth: required (super_owner, regional_manager)
  response:
    settings: TenantThemeSettings | null

PATCH /api/v1/tenant/theme:
  description: Update tenant-level theme
  auth: required (super_owner only)
  body:
    preset: ThemePreset (required)
    appearance?: AppearanceMode
    customColors?: { primary: string, primaryLight?: string, primaryDark?: string }
  response:
    settings: TenantThemeSettings

GET /api/v1/branches/:id/theme:
  description: Get branch-level theme settings
  auth: required (branch_manager+)
  response:
    settings: BranchThemeSettings | null

PATCH /api/v1/branches/:id/theme:
  description: Update branch-level theme
  auth: required (branch_manager+)
  body:
    preset: ThemePreset (required)
    appearance?: AppearanceMode
    customColors?: { primary: string, primaryLight?: string, primaryDark?: string }
  response:
    settings: BranchThemeSettings

DELETE /api/v1/branches/:id/theme:
  description: Remove branch theme override (use tenant default)
  auth: required (branch_manager+)
  response:
    success: true

GET /api/v1/users/me/theme:
  description: Get current user's theme preference
  auth: required
  response:
    preference: UserThemePreference | null

PATCH /api/v1/users/me/theme:
  description: Update current user's theme preference
  auth: required
  body:
    preset: ThemePreset (required)
    appearance?: AppearanceMode
    customColors?: { primary: string, primaryLight?: string, primaryDark?: string }
  response:
    preference: UserThemePreference

DELETE /api/v1/users/me/theme:
  description: Remove user theme preference (use branch/tenant default)
  auth: required
  response:
    success: true
```

### Branch Management

```yaml
GET /api/v1/branches:
  description: List all branches
  auth: required
  query:
    includeInactive?: boolean
  response:
    branches: Branch[]

POST /api/v1/branches:
  description: Create new branch
  auth: required (super_owner, regional_manager)
  body:
    name: string (required)
    address?: Address
    phone?: string
    email?: string
    gstin?: string
    workingHours?: WorkingHours
    settings?: Partial<BranchSettings>
  response:
    branch: Branch

GET /api/v1/branches/:id:
  description: Get branch details
  auth: required
  response:
    branch: Branch
    stats:
      staffCount: number
      todayAppointments: number

PATCH /api/v1/branches/:id:
  description: Update branch
  auth: required (super_owner, regional_manager, branch_manager)
  body:
    name?: string
    address?: Address
    phone?: string
    email?: string
    gstin?: string
    workingHours?: WorkingHours
    settings?: Partial<BranchSettings>
    isActive?: boolean
  response:
    branch: Branch

DELETE /api/v1/branches/:id:
  description: Soft delete branch
  auth: required (super_owner only)
  response:
    success: true

GET /api/v1/branches/:id/holidays:
  description: Get branch holidays
  auth: required
  query:
    year?: number
  response:
    holidays: BranchHoliday[]

POST /api/v1/branches/:id/holidays:
  description: Add branch holiday
  auth: required (branch_manager+)
  body:
    date: string (YYYY-MM-DD)
    name?: string
    isFullDay?: boolean
    openTime?: string
    closeTime?: string
  response:
    holiday: BranchHoliday

DELETE /api/v1/branches/:id/holidays/:holidayId:
  description: Remove branch holiday
  auth: required (branch_manager+)
  response:
    success: true
```

### User Management

```yaml
GET /api/v1/users:
  description: List users
  auth: required
  query:
    branchId?: string
    role?: UserRole
    includeInactive?: boolean
    page?: number
    limit?: number
  response:
    users: User[]
    meta: { page, limit, total, totalPages }

POST /api/v1/users:
  description: Create new user
  auth: required (super_owner, regional_manager)
  body:
    name: string (required)
    phone: string (required)
    email?: string
    password: string (required)
    role: UserRole (required)
    gender?: string
    branchIds: string[] (required, at least one)
    primaryBranchId?: string
    skillLevel?: string (for stylists)
    specializations?: string[]
  response:
    user: User

GET /api/v1/users/:id:
  description: Get user details
  auth: required
  response:
    user: User

PATCH /api/v1/users/:id:
  description: Update user
  auth: required (super_owner, regional_manager, or self)
  body:
    name?: string
    email?: string
    phone?: string
    gender?: string
    avatarUrl?: string
    role?: UserRole (super_owner only)
    branchIds?: string[]
    primaryBranchId?: string
    skillLevel?: string
    specializations?: string[]
    isActive?: boolean
    isOnlineVisible?: boolean
  response:
    user: User

DELETE /api/v1/users/:id:
  description: Soft delete user
  auth: required (super_owner, regional_manager)
  response:
    success: true

POST /api/v1/users/:id/reset-password:
  description: Reset user password (admin)
  auth: required (super_owner, regional_manager)
  body:
    newPassword: string
  response:
    success: true

PATCH /api/v1/users/me/password:
  description: Change own password
  auth: required
  body:
    currentPassword: string
    newPassword: string
  response:
    success: true
```

### Audit Logs

```yaml
GET /api/v1/audit-logs:
  description: Get audit logs
  auth: required (super_owner, accountant)
  query:
    branchId?: string
    userId?: string
    entityType?: string
    entityId?: string
    action?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  response:
    logs: AuditLog[]
    meta: { page, limit, total, totalPages }
```

---

## Business Logic

### Registration Flow

```typescript
async function registerBusiness(data: RegisterInput): Promise<RegisterResult> {
  // 1. Validate input
  const validated = registerSchema.parse(data);

  // 2. Check if email already exists
  const existingTenant = await db.tenant.findFirst({
    where: { email: validated.email },
  });
  if (existingTenant) {
    throw new ConflictError("Email already registered");
  }

  // 3. Generate slug from business name
  const slug = await generateUniqueSlug(validated.businessName);

  // 4. Hash password
  const passwordHash = await bcrypt.hash(validated.password, 12);

  // 5. Create tenant and owner in transaction
  const result = await db.$transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: validated.businessName,
        slug,
        email: validated.email,
        phone: validated.phone,
        subscriptionPlan: "trial",
        subscriptionStatus: "trial",
        trialEndsAt: addDays(new Date(), 30),
        maxBranches: 1,
        maxUsers: 5,
      },
    });

    // Create owner user
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: validated.ownerName,
        email: validated.email,
        phone: validated.phone,
        passwordHash,
        role: "super_owner",
        isActive: true,
      },
    });

    return { tenant, user };
  });

  // 6. Generate tokens
  const tokens = generateTokens(result.user, result.tenant);

  // 7. Send welcome email
  await sendWelcomeEmail(result.tenant, result.user);

  return {
    tenant: result.tenant,
    user: result.user,
    ...tokens,
  };
}
```

### Authentication Flow

```typescript
async function login(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  // 1. Find user by email or phone
  const user = await db.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
      isActive: true,
      deletedAt: null,
    },
    include: {
      tenant: true,
      userBranches: {
        include: { branch: true },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // 2. Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // 3. Check tenant status
  if (user.tenant.subscriptionStatus === "suspended") {
    throw new ForbiddenError("Account suspended");
  }

  // 4. Generate tokens
  const tokens = generateTokens(user, user.tenant);

  // 5. Update last login
  await db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10),
    },
  });

  // 6. Create audit log
  await createAuditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: "user.login",
    entityType: "user",
    entityId: user.id,
  });

  return {
    user: sanitizeUser(user),
    tenant: user.tenant,
    branches: user.userBranches.map((ub) => ub.branch),
    ...tokens,
  };
}
```

### Role-Based Access Control

```typescript
// Permission definitions
const PERMISSIONS = {
  // Tenant
  "tenant:read": [
    "super_owner",
    "regional_manager",
    "branch_manager",
    "accountant",
  ],
  "tenant:write": ["super_owner"],

  // Branches
  "branches:read": [
    "super_owner",
    "regional_manager",
    "branch_manager",
    "receptionist",
    "stylist",
    "accountant",
  ],
  "branches:write": ["super_owner", "regional_manager"],
  "branches:delete": ["super_owner"],

  // Users
  "users:read": ["super_owner", "regional_manager", "branch_manager"],
  "users:write": ["super_owner", "regional_manager"],
  "users:delete": ["super_owner", "regional_manager"],

  // Audit logs
  "audit:read": ["super_owner", "accountant"],
};

// Permission check middleware
function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = request.user;
    const allowedRoles = PERMISSIONS[permission];

    if (!allowedRoles || !allowedRoles.includes(role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
  };
}

// Branch access check
async function checkBranchAccess(
  userId: string,
  branchId: string,
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { userBranches: true },
  });

  // Super owner has access to all branches
  if (user.role === "super_owner") return true;

  // Regional manager has access to assigned branches
  // Branch manager, receptionist, stylist have access to their branches
  return user.userBranches.some((ub) => ub.branchId === branchId);
}
```

### Subscription Enforcement

```typescript
async function checkSubscriptionLimits(
  tenantId: string,
  action: "branch" | "user",
): Promise<void> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: {
        select: {
          branches: { where: { deletedAt: null } },
          users: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (action === "branch" && tenant._count.branches >= tenant.maxBranches) {
    throw new PaymentRequiredError(
      "Branch limit reached. Please upgrade your plan.",
    );
  }

  if (action === "user" && tenant._count.users >= tenant.maxUsers) {
    throw new PaymentRequiredError(
      "User limit reached. Please upgrade your plan.",
    );
  }
}

// Check trial expiry
async function checkTrialStatus(tenant: Tenant): Promise<void> {
  if (
    tenant.subscriptionStatus === "trial" &&
    tenant.trialEndsAt < new Date()
  ) {
    throw new PaymentRequiredError(
      "Trial period has ended. Please subscribe to continue.",
    );
  }
}
```

---

## Validation Schemas

```typescript
import { z } from "zod";

// Registration
export const registerSchema = z.object({
  businessName: z.string().min(2).max(255),
  ownerName: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
  password: z.string().min(8).max(100),
});

// Login
export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

// Branch
export const createBranchSchema = z.object({
  name: z.string().min(2).max(255),
  address: z
    .object({
      line1: z.string().max(255).optional(),
      line2: z.string().max(255).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      pincode: z
        .string()
        .regex(/^\d{6}$/)
        .optional(),
      country: z.string().default("India"),
    })
    .optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  email: z.string().email().optional(),
  gstin: z
    .string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)
    .optional(),
  workingHours: z
    .record(
      z.object({
        isOpen: z.boolean(),
        open: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        close: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
      }),
    )
    .optional(),
  settings: z
    .object({
      appointmentSlotMinutes: z.number().min(5).max(60).optional(),
      bufferMinutes: z.number().min(0).max(30).optional(),
      advanceBookingDays: z.number().min(1).max(90).optional(),
    })
    .optional(),
});

// User
export const createUserSchema = z.object({
  name: z.string().min(2).max(255),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email().optional(),
  password: z.string().min(8).max(100),
  role: z.enum([
    "regional_manager",
    "branch_manager",
    "receptionist",
    "stylist",
    "accountant",
  ]),
  gender: z.enum(["male", "female", "other"]).optional(),
  branchIds: z.array(z.string().uuid()).min(1),
  primaryBranchId: z.string().uuid().optional(),
  skillLevel: z.enum(["junior", "senior", "expert"]).optional(),
  specializations: z.array(z.string()).optional(),
});
```

---

## Integration Points

### With Other Modules

| Module                  | Integration                             |
| ----------------------- | --------------------------------------- |
| Module 2 (Appointments) | Branch working hours, user availability |
| Module 3 (Customers)    | Tenant-scoped customer data             |
| Module 4 (Services)     | Branch-specific pricing                 |
| Module 5 (Billing)      | Branch GST details, invoice branding    |
| Module 6 (Staff)        | User employment details                 |
| All Modules             | Tenant isolation, audit logging         |

---

## Error Handling

```typescript
// Custom errors for this module
class TenantNotFoundError extends NotFoundError {
  constructor() {
    super("Tenant not found");
  }
}

class BranchNotFoundError extends NotFoundError {
  constructor() {
    super("Branch not found");
  }
}

class UserNotFoundError extends NotFoundError {
  constructor() {
    super("User not found");
  }
}

class BranchLimitExceededError extends PaymentRequiredError {
  constructor(max: number) {
    super(`Branch limit (${max}) exceeded. Please upgrade your plan.`);
  }
}

class UserLimitExceededError extends PaymentRequiredError {
  constructor(max: number) {
    super(`User limit (${max}) exceeded. Please upgrade your plan.`);
  }
}
```

---

## Testing Considerations

### Unit Tests

- Registration validation
- Password hashing/verification
- Token generation/validation
- Permission checks
- Subscription limit checks

### Integration Tests

- Full registration flow
- Login/logout flow
- Branch CRUD operations
- User CRUD operations
- Role-based access enforcement

### E2E Tests

- Complete onboarding journey
- Multi-branch setup
- Staff assignment workflow
