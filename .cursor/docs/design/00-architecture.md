# System Architecture Design

## Overview

This document defines the overall system architecture for the Salon Management SaaS Platform. It covers technology choices, multi-tenancy approach, database design principles, API patterns, authentication, and deployment architecture.

## Tech Stack

### Backend

- **Runtime**: Node.js (v22 LTS)
- **Framework**: Fastify (high-performance, low overhead)
- **Language**: TypeScript (type safety, better DX)
- **ORM**: Prisma (type-safe database access, migrations)
- **Validation**: Zod (schema validation)
- **Authentication**: JWT with refresh tokens
- **Background Jobs**: BullMQ with Redis
- **File Storage**: AWS S3
- **Email**: AWS SES
- **SMS/WhatsApp**: Provider-agnostic (Twilio/MSG91/Gupshup)

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui (Tailwind-native, accessible, customizable)
- **Data Fetching**: TanStack Query (React Query) with native fetch
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **State Management**: Zustand (global state)
- **Charts**: Recharts
- **Calendar**: react-big-calendar
- **Date Utils**: date-fns
- **i18n**: next-intl
- **Icons**: Lucide React
- **Toast/Notifications**: Sonner
- **Drag & Drop**: @dnd-kit

### Database

- **Primary**: PostgreSQL 15 (relational data, RLS for multi-tenancy)
- **Cache**: Redis (sessions, caching, job queues)
- **Search**: PostgreSQL Full-Text Search (for MVP, Elasticsearch later if needed)

### Infrastructure (AWS)

- **Compute**: ECS Fargate (containerized, auto-scaling)
- **Database**: RDS PostgreSQL (managed, Multi-AZ for production)
- **Cache**: ElastiCache Redis
- **Storage**: S3 (files, receipts, images)
- **CDN**: CloudFront (static assets, booking page)
- **Load Balancer**: ALB (Application Load Balancer)
- **DNS**: Route 53
- **Secrets**: AWS Secrets Manager
- **Monitoring**: CloudWatch + Sentry

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Admin Web   │  │  Staff App   │  │ Booking Page │  │  Mobile App  │    │
│  │  (Next.js)   │  │  (Next.js)   │  │  (Next.js)   │  │   (Future)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     │
                              ┌──────▼──────┐
                              │  CloudFront │
                              │    (CDN)    │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │     ALB     │
                              │ (Load Bal.) │
                              └──────┬──────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              API LAYER                                       │
├────────────────────────────────────┼────────────────────────────────────────┤
│                           ┌────────▼────────┐                               │
│                           │  Fastify API    │                               │
│                           │  (ECS Fargate)  │                               │
│                           └────────┬────────┘                               │
│                                    │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐ │
│  │                         MIDDLEWARE                                     │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │
│  │  │   Auth   │ │  Tenant  │ │   Rate   │ │  Audit   │ │  Error   │   │ │
│  │  │  Guard   │ │  Context │ │  Limiter │ │  Logger  │ │  Handler │   │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │ │
│  └─────────────────────────────────┼─────────────────────────────────────┘ │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
├────────────────────────────────────┼────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  Tenant  │ │Appointment│ │ Customer │ │ Billing  │ │  Staff   │         │
│  │ Service  │ │  Service  │ │ Service  │ │ Service  │ │ Service  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Inventory│ │Membership │ │ Expense  │ │ Reports  │ │Marketing │         │
│  │ Service  │ │  Service  │ │ Service  │ │ Service  │ │ Service  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                            DATA LAYER                                        │
├────────────────────────────────────┼────────────────────────────────────────┤
│         ┌──────────────────────────┼──────────────────────────┐             │
│         │                          │                          │             │
│  ┌──────▼──────┐           ┌───────▼───────┐          ┌───────▼───────┐    │
│  │  PostgreSQL │           │     Redis     │          │      S3       │    │
│  │   (RDS)     │           │ (ElastiCache) │          │   (Storage)   │    │
│  │             │           │               │          │               │    │
│  │ - Tenants   │           │ - Sessions    │          │ - Images      │    │
│  │ - Branches  │           │ - Cache       │          │ - Receipts    │    │
│  │ - Users     │           │ - Job Queues  │          │ - Documents   │    │
│  │ - All Data  │           │ - Rate Limits │          │ - Exports     │    │
│  └─────────────┘           └───────────────┘          └───────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                        BACKGROUND WORKERS                                    │
├────────────────────────────────────┼────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Notification │  │   Report     │  │  Scheduled   │  │   Cleanup    │    │
│  │   Worker     │  │   Worker     │  │    Jobs      │  │   Worker     │    │
│  │              │  │              │  │              │  │              │    │
│  │ - WhatsApp   │  │ - Generate   │  │ - Reminders  │  │ - Expired    │    │
│  │ - SMS        │  │ - Export     │  │ - Recurring  │  │ - Temp files │    │
│  │ - Email      │  │ - Snapshots  │  │ - Campaigns  │  │ - Old logs   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenancy Architecture

### Approach: Shared Database with Row-Level Security (RLS)

All tenants share a single PostgreSQL database. Data isolation is enforced at multiple levels:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANCY LAYERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: API Middleware                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  - Extract tenant_id from JWT token                      │   │
│  │  - Validate user belongs to tenant                       │   │
│  │  - Set tenant context for request                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Layer 2: ORM/Repository Layer                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  - Base repository adds tenant_id to all queries         │   │
│  │  - Prisma middleware injects tenant filter               │   │
│  │  - Prevents accidental cross-tenant queries              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Layer 3: Database RLS (Final Safety Net)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  - PostgreSQL Row-Level Security policies                │   │
│  │  - Even raw SQL queries are filtered                     │   │
│  │  - Cannot bypass even with direct DB access              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Session Context

```sql
-- Set tenant context at start of each request
SET app.current_tenant_id = 'uuid-of-tenant';
SET app.current_branch_id = 'uuid-of-branch';  -- optional, for branch-scoped queries
SET app.current_user_id = 'uuid-of-user';

-- RLS Policy Example
CREATE POLICY tenant_isolation ON appointments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Tenant Context in Fastify

```typescript
// Fastify hook to set tenant context
fastify.addHook("preHandler", async (request, reply) => {
  if (request.user) {
    const { tenantId, branchId, userId } = request.user;

    // Set PostgreSQL session variables
    await request.db.$executeRaw`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true),
             set_config('app.current_branch_id', ${branchId || ""}, true),
             set_config('app.current_user_id', ${userId}, true)
    `;
  }
});
```

---

## Database Design Principles

### 1. Primary Key Strategy

- Use UUIDs for all primary keys (globally unique, no tenant collision)
- Format: `uuid_generate_v4()`

### 2. Tenant Scoping

Every tenant-scoped table includes:

```sql
tenant_id UUID NOT NULL REFERENCES tenants(id),
-- Index for performance
CREATE INDEX idx_tablename_tenant ON tablename(tenant_id);
```

### 3. Branch Scoping

Branch-specific tables include:

```sql
tenant_id UUID NOT NULL REFERENCES tenants(id),
branch_id UUID NOT NULL REFERENCES branches(id),
-- Composite index
CREATE INDEX idx_tablename_tenant_branch ON tablename(tenant_id, branch_id);
```

### 4. Soft Deletes

All major entities use soft delete:

```sql
deleted_at TIMESTAMP NULL,
-- Query only active records by default
WHERE deleted_at IS NULL
```

### 5. Audit Columns

All tables include:

```sql
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),
updated_by UUID REFERENCES users(id)
```

### 6. Optimistic Locking

For concurrent edit protection:

```sql
version INTEGER NOT NULL DEFAULT 1
-- Increment on update, fail if version mismatch
```

---

## Core Database Schema

### Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐                    │
│  │  Tenant  │────────<│  Branch  │────────<│   User   │                    │
│  │(Business)│  1:N    │          │  N:M    │  (Staff) │                    │
│  └──────────┘         └──────────┘         └──────────┘                    │
│       │                    │                    │                           │
│       │                    │                    │                           │
│       ▼                    ▼                    ▼                           │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐                    │
│  │ Service  │         │ Customer │         │Appointment│                    │
│  │ Catalog  │         │          │         │          │                    │
│  └──────────┘         └──────────┘         └──────────┘                    │
│       │                    │                    │                           │
│       │                    │                    │                           │
│       ▼                    ▼                    ▼                           │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐                    │
│  │  Price   │         │ Loyalty  │         │   Bill   │                    │
│  │ Variant  │         │  Points  │         │          │                    │
│  └──────────┘         └──────────┘         └──────────┘                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Tables

```sql
-- Tenant (Business)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- for booking URL
  legal_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  logo_url VARCHAR(500),
  settings JSONB DEFAULT '{}',
  subscription_plan VARCHAR(50) DEFAULT 'trial',
  subscription_status VARCHAR(20) DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Branch
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,  -- unique within tenant
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  gstin VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  currency VARCHAR(3) DEFAULT 'INR',
  working_hours JSONB,  -- {"monday": {"open": "09:00", "close": "21:00"}, ...}
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, slug)
);

-- User (Staff)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,  -- super_owner, regional_manager, branch_manager, receptionist, stylist, accountant
  gender VARCHAR(10),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, phone)
);

-- User-Branch Assignment (Many-to-Many)
CREATE TABLE user_branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

-- Customer
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  gender VARCHAR(10),
  date_of_birth DATE,
  anniversary_date DATE,
  address TEXT,
  notes TEXT,
  preferences JSONB DEFAULT '{}',
  allergies TEXT[],
  tags TEXT[],
  loyalty_points INTEGER DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  booking_status VARCHAR(20) DEFAULT 'normal',  -- normal, prepaid_only, blocked
  first_visit_branch_id UUID REFERENCES branches(id),
  marketing_consent BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, phone)
);
```

---

## API Design Patterns

### RESTful API Structure

```
Base URL: https://api.salonapp.com/v1

Authentication:
  POST   /auth/login
  POST   /auth/refresh
  POST   /auth/logout
  POST   /auth/forgot-password
  POST   /auth/reset-password

Tenants:
  GET    /tenant                    # Get current tenant
  PATCH  /tenant                    # Update tenant settings
  GET    /tenant/subscription       # Get subscription details

Branches:
  GET    /branches                  # List branches
  POST   /branches                  # Create branch
  GET    /branches/:id              # Get branch
  PATCH  /branches/:id              # Update branch
  DELETE /branches/:id              # Soft delete branch

Users:
  GET    /users                     # List users
  POST   /users                     # Create user
  GET    /users/:id                 # Get user
  PATCH  /users/:id                 # Update user
  DELETE /users/:id                 # Soft delete user

Customers:
  GET    /customers                 # List customers
  POST   /customers                 # Create customer
  GET    /customers/:id             # Get customer
  PATCH  /customers/:id             # Update customer
  GET    /customers/:id/history     # Get customer history
  GET    /customers/search?phone=   # Search by phone

Appointments:
  GET    /appointments              # List appointments
  POST   /appointments              # Create appointment
  GET    /appointments/:id          # Get appointment
  PATCH  /appointments/:id          # Update appointment
  POST   /appointments/:id/checkin  # Check in customer
  POST   /appointments/:id/complete # Complete appointment
  POST   /appointments/:id/cancel   # Cancel appointment
  GET    /appointments/availability # Get available slots

Services:
  GET    /services                  # List services
  POST   /services                  # Create service
  GET    /services/:id              # Get service
  PATCH  /services/:id              # Update service
  GET    /services/categories       # List categories

Bills:
  GET    /bills                     # List bills
  POST   /bills                     # Create bill
  GET    /bills/:id                 # Get bill
  PATCH  /bills/:id                 # Update bill
  POST   /bills/:id/pay             # Process payment
  POST   /bills/:id/void            # Void bill
  POST   /bills/:id/refund          # Process refund
```

### Request/Response Format

```typescript
// Standard Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Standard Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Pagination

```
GET /customers?page=1&limit=20&sort=name&order=asc
```

### Filtering

```
GET /appointments?branch_id=xxx&status=booked&date=2024-01-15
GET /customers?tags=vip&created_after=2024-01-01
```

---

## Authentication & Authorization

### JWT Token Structure

```typescript
// Access Token (short-lived: 15 minutes)
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "branchIds": ["branch-1", "branch-2"],
  "role": "branch_manager",
  "permissions": ["appointments:read", "appointments:write", ...],
  "iat": 1234567890,
  "exp": 1234568790
}

// Refresh Token (long-lived: 7 days)
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "type": "refresh",
  "iat": 1234567890,
  "exp": 1235172690
}
```

### Role-Permission Matrix

```typescript
const ROLE_PERMISSIONS = {
  super_owner: ["*"], // All permissions

  regional_manager: [
    "branches:read",
    "branches:write",
    "users:read",
    "users:write",
    "appointments:*",
    "customers:*",
    "services:read",
    "bills:*",
    "reports:read",
    "inventory:*",
    "expenses:*",
    "marketing:*",
  ],

  branch_manager: [
    "branches:read",
    "users:read",
    "appointments:*",
    "customers:*",
    "services:read",
    "bills:*",
    "reports:read:branch",
    "inventory:*",
    "expenses:write",
    "marketing:write:branch",
  ],

  receptionist: [
    "appointments:*",
    "customers:read",
    "customers:write",
    "bills:read",
    "bills:write",
    "services:read",
  ],

  stylist: [
    "appointments:read:own",
    "customers:read:limited",
    "services:read",
    "bills:read:own",
  ],

  accountant: ["bills:read", "reports:read", "expenses:read", "inventory:read"],
};
```

---

## Project Structure

```
salon-management/
├── apps/
│   ├── api/                          # Fastify Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.schema.ts
│   │   │   │   │   └── auth.routes.ts
│   │   │   │   ├── tenants/
│   │   │   │   ├── branches/
│   │   │   │   ├── users/
│   │   │   │   ├── customers/
│   │   │   │   ├── appointments/
│   │   │   │   ├── services/
│   │   │   │   ├── bills/
│   │   │   │   ├── staff/
│   │   │   │   ├── inventory/
│   │   │   │   ├── memberships/
│   │   │   │   ├── expenses/
│   │   │   │   ├── reports/
│   │   │   │   ├── marketing/
│   │   │   │   └── booking/          # Online booking
│   │   │   ├── common/
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── auth.middleware.ts
│   │   │   │   │   ├── tenant.middleware.ts
│   │   │   │   │   ├── rate-limit.middleware.ts
│   │   │   │   │   └── audit.middleware.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── permission.guard.ts
│   │   │   │   │   └── branch.guard.ts
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── interceptors/
│   │   │   │   └── utils/
│   │   │   ├── database/
│   │   │   │   ├── prisma/
│   │   │   │   │   ├── schema.prisma
│   │   │   │   │   └── migrations/
│   │   │   │   └── redis/
│   │   │   ├── jobs/
│   │   │   │   ├── notification.job.ts
│   │   │   │   ├── report.job.ts
│   │   │   │   └── scheduler.job.ts
│   │   │   ├── config/
│   │   │   │   ├── app.config.ts
│   │   │   │   ├── database.config.ts
│   │   │   │   └── aws.config.ts
│   │   │   └── app.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                          # Next.js Admin Dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── forgot-password/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── appointments/
│   │   │   │   │   ├── customers/
│   │   │   │   │   ├── services/
│   │   │   │   │   ├── billing/
│   │   │   │   │   ├── staff/
│   │   │   │   │   ├── inventory/
│   │   │   │   │   ├── reports/
│   │   │   │   │   ├── marketing/
│   │   │   │   │   └── settings/
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── stores/
│   │   │   └── types/
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── booking/                      # Next.js Public Booking Page
│       ├── src/
│       │   ├── app/
│       │   │   ├── [tenant]/
│       │   │   │   ├── page.tsx      # Booking landing
│       │   │   │   ├── services/
│       │   │   │   ├── slots/
│       │   │   │   ├── confirm/
│       │   │   │   └── success/
│       │   │   └── layout.tsx
│       │   └── components/
│       ├── package.json
│       └── next.config.js
│
├── packages/
│   ├── shared/                       # Shared types, utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── constants/
│   │   └── package.json
│   └── ui/                           # Shared UI components
│       ├── src/
│       └── package.json
│
├── infrastructure/
│   ├── terraform/                    # AWS Infrastructure
│   └── docker/
│
├── package.json
├── turbo.json                        # Turborepo config
└── README.md
```

---

## Deployment Architecture (AWS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Route 53 (DNS)                               │   │
│  │  api.salonapp.com  │  app.salonapp.com  │  book.salonapp.com        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CloudFront (CDN)                                │   │
│  │  - Static assets caching                                             │   │
│  │  - SSL termination                                                   │   │
│  │  - DDoS protection                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                       │
│                    │               │               │                        │
│                    ▼               ▼               ▼                        │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │   ALB (API)      │ │  S3 (Web App)    │ │  S3 (Booking)    │           │
│  │                  │ │  Static Hosting  │ │  Static Hosting  │           │
│  └────────┬─────────┘ └──────────────────┘ └──────────────────┘           │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    VPC (Virtual Private Cloud)                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Public Subnets                            │   │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│  │  │  │   NAT GW    │  │   NAT GW    │  │   Bastion   │         │   │   │
│  │  │  │   (AZ-a)    │  │   (AZ-b)    │  │   (Debug)   │         │   │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Private Subnets                           │   │   │
│  │  │  ┌─────────────────────────────────────────────────────┐   │   │   │
│  │  │  │              ECS Fargate Cluster                     │   │   │   │
│  │  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐       │   │   │   │
│  │  │  │  │  API      │  │  API      │  │  Worker   │       │   │   │   │
│  │  │  │  │  Task 1   │  │  Task 2   │  │  Task     │       │   │   │   │
│  │  │  │  └───────────┘  └───────────┘  └───────────┘       │   │   │   │
│  │  │  └─────────────────────────────────────────────────────┘   │   │   │
│  │  │                                                             │   │   │
│  │  │  ┌───────────────────────┐  ┌───────────────────────┐     │   │   │
│  │  │  │   RDS PostgreSQL      │  │   ElastiCache Redis   │     │   │   │
│  │  │  │   (Multi-AZ)          │  │   (Cluster Mode)      │     │   │   │
│  │  │  │   - Primary (AZ-a)    │  │                       │     │   │   │
│  │  │  │   - Standby (AZ-b)    │  │                       │     │   │   │
│  │  │  └───────────────────────┘  └───────────────────────┘     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Supporting Services                             │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │   │
│  │  │    S3     │  │    SES    │  │  Secrets  │  │CloudWatch │       │   │
│  │  │ (Storage) │  │  (Email)  │  │  Manager  │  │(Monitoring)│       │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Environment Strategy

| Environment | Purpose   | Database         | Scale           |
| ----------- | --------- | ---------------- | --------------- |
| Development | Local dev | Local PostgreSQL | Single instance |
| Staging     | Testing   | RDS (Single-AZ)  | Minimal         |
| Production  | Live      | RDS (Multi-AZ)   | Auto-scaling    |

---

## Error Handling Strategy

### Error Codes

```typescript
enum ErrorCode {
  // Authentication (1xxx)
  INVALID_CREDENTIALS = 1001,
  TOKEN_EXPIRED = 1002,
  UNAUTHORIZED = 1003,

  // Validation (2xxx)
  VALIDATION_ERROR = 2001,
  INVALID_INPUT = 2002,

  // Business Logic (3xxx)
  SLOT_NOT_AVAILABLE = 3001,
  INSUFFICIENT_BALANCE = 3002,
  BOOKING_LIMIT_EXCEEDED = 3003,
  CUSTOMER_BLOCKED = 3004,

  // Resource (4xxx)
  NOT_FOUND = 4001,
  ALREADY_EXISTS = 4002,
  CONFLICT = 4003,

  // System (5xxx)
  INTERNAL_ERROR = 5001,
  DATABASE_ERROR = 5002,
  EXTERNAL_SERVICE_ERROR = 5003,
}
```

---

## Audit Logging

### Audit Log Structure

```sql
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

-- Index for querying
CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

### Audited Actions

- Price changes
- Bill edits/voids/refunds
- Discount applications
- Commission changes
- Role changes
- Customer blocks/unblocks
- Period close/reopen
- Sensitive data access

---

## Security Measures

1. **Data Encryption**
   - TLS 1.3 for data in transit
   - AES-256 for sensitive data at rest
   - bcrypt for password hashing

2. **API Security**
   - Rate limiting per IP and per user
   - Request validation with Zod
   - SQL injection prevention via Prisma
   - XSS prevention in responses

3. **Infrastructure Security**
   - VPC with private subnets
   - Security groups with minimal access
   - Secrets in AWS Secrets Manager
   - Regular security audits

4. **Compliance**
   - 7-year data retention for financial records
   - Audit logging for all sensitive actions
   - GDPR-ready data export/delete

---

## Design System

### Typography

- **Font Family**: Inter (Google Fonts)
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

```css
--font-sans: "Inter", system-ui, sans-serif;
```

### Color Palette

The platform uses a primary color with semantic colors for status and feedback.

| Token           | Default (Indigo) | Usage                        |
| --------------- | ---------------- | ---------------------------- |
| `--primary`     | #6366f1          | Buttons, links, focus states |
| `--primary-50`  | #eef2ff          | Light backgrounds            |
| `--primary-100` | #e0e7ff          | Hover states                 |
| `--primary-600` | #4f46e5          | Hover on primary             |
| `--primary-700` | #4338ca          | Active states                |

| Semantic Color | Value   | Usage                    |
| -------------- | ------- | ------------------------ |
| `--success`    | #22c55e | Completed, confirmed     |
| `--warning`    | #f59e0b | Pending, attention       |
| `--error`      | #ef4444 | Errors, cancelled        |
| `--info`       | #3b82f6 | Information, in-progress |

### Spacing Scale

Based on 4px grid system:

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
```

### Border Radius

```css
--radius-sm: 0.25rem; /* 4px - buttons, inputs */
--radius-md: 0.375rem; /* 6px - cards */
--radius-lg: 0.5rem; /* 8px - modals */
--radius-full: 9999px; /* pills, avatars */
```

---

## Theming Architecture

### Preset Themes

The platform provides 7 preset themes:

| Theme Name           | Primary Color | Description           |
| -------------------- | ------------- | --------------------- |
| Indigo Night         | #6366f1       | Default, professional |
| Rose Gold            | #f43f5e       | Warm, elegant         |
| Ocean Breeze         | #06b6d4       | Fresh, calming        |
| Forest Calm          | #22c55e       | Natural, organic      |
| Sunset Glow          | #f97316       | Energetic, vibrant    |
| Midnight Purple      | #8b5cf6       | Modern, creative      |
| Classic Professional | #64748b       | Neutral, corporate    |

### Theme Configuration

```typescript
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
    primary: string; // hex color
    primaryLight?: string;
    primaryDark?: string;
  };
}

export interface ThemeSettings {
  tenantId: string;
  branchId?: string; // null = tenant-level
  userId?: string; // null = not user-specific
  config: ThemeConfig;
  updatedAt: Date;
  updatedBy: string;
}
```

### CSS Variables Implementation

```css
/* Base theme variables (light mode) */
:root {
  /* Primary colors - set by theme */
  --primary: 99 102 241; /* RGB values for opacity support */
  --primary-foreground: 255 255 255;

  /* Background & foreground */
  --background: 255 255 255;
  --foreground: 15 23 42;

  /* Card */
  --card: 255 255 255;
  --card-foreground: 15 23 42;

  /* Muted */
  --muted: 241 245 249;
  --muted-foreground: 100 116 139;

  /* Border & input */
  --border: 226 232 240;
  --input: 226 232 240;
  --ring: 99 102 241;
}

/* Dark mode */
.dark {
  --background: 15 23 42;
  --foreground: 248 250 252;
  --card: 30 41 59;
  --card-foreground: 248 250 252;
  --muted: 51 65 85;
  --muted-foreground: 148 163 184;
  --border: 51 65 85;
  --input: 51 65 85;
}

/* Theme application */
[data-theme="rose-gold"] {
  --primary: 244 63 94;
}

[data-theme="ocean-breeze"] {
  --primary: 6 182 212;
}

/* ... other themes */
```

### Theme Precedence

When applying themes, the system follows this order:

1. **User Preference** (highest priority) - Individual user's saved preference
2. **Branch Setting** - Branch-specific theme set by Branch_Manager
3. **Tenant Setting** - Business-wide theme set by Super_Owner
4. **Default** - Indigo Night theme

```typescript
// Theme resolution logic
async function resolveTheme(
  userId: string,
  branchId: string,
): Promise<ThemeConfig> {
  // 1. Check user preference
  const userPref = await db.userThemePreference.findUnique({
    where: { userId },
  });
  if (userPref) return userPref.config;

  // 2. Check branch setting
  const branchTheme = await db.branchThemeSetting.findUnique({
    where: { branchId },
  });
  if (branchTheme) return branchTheme.config;

  // 3. Check tenant setting
  const tenantTheme = await db.tenantThemeSetting.findUnique({
    where: { tenantId: user.tenantId },
  });
  if (tenantTheme) return tenantTheme.config;

  // 4. Return default
  return {
    preset: "indigo-night",
    appearance: "system",
  };
}
```

### Theme vs Booking Page

| Aspect        | Dashboard Theme           | Booking Page Theme            |
| ------------- | ------------------------- | ----------------------------- |
| Purpose       | Staff interface           | Customer-facing               |
| Configuration | Settings → Appearance     | Settings → Online Booking     |
| Stored in     | `tenant_theme_settings`   | `online_booking_config.theme` |
| Customizable  | Preset + custom colors    | Primary color, logo, banner   |
| Scope         | Tenant/Branch/User levels | Per-branch only               |

### Frontend Theming Implementation

The theming system uses CSS Variables + next-themes, which is the standard approach for Next.js + shadcn/ui + Tailwind applications.

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    THEMING FLOW                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. globals.css                                                 │
│     └── CSS Variables: --primary, --background, etc.            │
│                                                                  │
│  2. next-themes (ThemeProvider)                                 │
│     └── Handles light/dark/system appearance mode               │
│     └── Adds class="dark" to <html> element                     │
│                                                                  │
│  3. tailwind.config.ts                                          │
│     └── Maps CSS variables to Tailwind utility classes          │
│     └── bg-primary, text-primary-foreground, etc.               │
│                                                                  │
│  4. Custom Theme Hook (useTheme)                                │
│     └── Fetches user's theme from API on login                  │
│     └── Sets data-theme="rose-gold" on <html>                   │
│     └── CSS selectors apply the correct colors                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Required Packages

```json
{
  "dependencies": {
    "next-themes": "^0.3.0"
  }
}
```

#### File Structure

```
apps/web/src/
├── app/
│   └── layout.tsx              # ThemeProvider wrapper
├── components/
│   └── theme/
│       ├── theme-provider.tsx  # next-themes + custom logic
│       ├── theme-switcher.tsx  # UI for switching themes
│       └── theme-presets.ts    # Preset definitions
├── hooks/
│   └── use-theme-config.ts     # Fetch & apply user theme
└── styles/
    └── globals.css             # CSS variables
```

#### 1. CSS Variables (globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Default theme: Indigo Night */
    --primary: 99 102 241;
    --primary-foreground: 255 255 255;

    /* Backgrounds */
    --background: 255 255 255;
    --foreground: 15 23 42;

    /* Cards */
    --card: 255 255 255;
    --card-foreground: 15 23 42;

    /* Muted */
    --muted: 241 245 249;
    --muted-foreground: 100 116 139;

    /* Borders */
    --border: 226 232 240;
    --input: 226 232 240;
    --ring: 99 102 241;

    /* Semantic colors */
    --success: 34 197 94;
    --warning: 245 158 11;
    --error: 239 68 68;
    --info: 59 130 246;

    /* Radius */
    --radius: 0.5rem;
  }

  .dark {
    --background: 15 23 42;
    --foreground: 248 250 252;
    --card: 30 41 59;
    --card-foreground: 248 250 252;
    --muted: 51 65 85;
    --muted-foreground: 148 163 184;
    --border: 51 65 85;
    --input: 51 65 85;
  }

  /* Theme Presets - Override primary color */
  [data-theme="indigo-night"] {
    --primary: 99 102 241;
  }

  [data-theme="rose-gold"] {
    --primary: 244 63 94;
  }

  [data-theme="ocean-breeze"] {
    --primary: 6 182 212;
  }

  [data-theme="forest-calm"] {
    --primary: 34 197 94;
  }

  [data-theme="sunset-glow"] {
    --primary: 249 115 22;
  }

  [data-theme="midnight-purple"] {
    --primary: 139 92 246;
  }

  [data-theme="classic-professional"] {
    --primary: 100 116 139;
  }
}
```

#### 2. Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        error: "rgb(var(--error) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

#### 3. Theme Provider

```typescript
// components/theme/theme-provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";
import { useThemeConfig } from "@/hooks/use-theme-config";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { themeConfig, isLoading } = useThemeConfig();

  // Apply color theme preset
  useEffect(() => {
    if (themeConfig?.preset) {
      document.documentElement.setAttribute("data-theme", themeConfig.preset);

      // Apply custom colors if preset is "custom"
      if (themeConfig.preset === "custom" && themeConfig.customColors) {
        const { primary } = themeConfig.customColors;
        const rgb = hexToRgb(primary);
        if (rgb) {
          document.documentElement.style.setProperty(
            "--primary",
            `${rgb.r} ${rgb.g} ${rgb.b}`
          );
        }
      }
    }
  }, [themeConfig]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={themeConfig?.appearance || "system"}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

// Helper: Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
```

#### 4. Theme Config Hook

```typescript
// hooks/use-theme-config.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { ThemeConfig } from "@/types/theme";

export function useThemeConfig() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["theme"],
    queryFn: async (): Promise<{ config: ThemeConfig; source: string }> => {
      const res = await fetch("/api/v1/theme");
      if (!res.ok) throw new Error("Failed to fetch theme");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
  });

  return {
    themeConfig: data?.config,
    themeSource: data?.source,
    isLoading,
    error,
  };
}
```

#### 5. Root Layout

```typescript
// app/layout.tsx
import { ThemeProvider } from "@/components/theme/theme-provider";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 6. Usage in Components

```tsx
// Any component - just use Tailwind classes
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Save Changes
</Button>

<Card className="bg-card border-border">
  <CardHeader className="text-card-foreground">
    Dashboard
  </CardHeader>
</Card>

<Badge className="bg-success/10 text-success">
  Active
</Badge>
```

#### Why This Approach?

| Approach                     | Pros                                                             | Cons                           |
| ---------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| **CSS Variables (✓ chosen)** | Zero JS runtime, instant switching, SSR-friendly, shadcn default | Variables defined upfront      |
| CSS-in-JS                    | Dynamic at runtime                                               | Bundle size, SSR complexity    |
| Tailwind classes only        | Simple                                                           | No runtime customization       |
| React Context                | Flexible                                                         | Re-renders tree, flash on load |

This is the same pattern used by Vercel, Linear, and most modern SaaS applications.

---

## Internationalization (i18n)

The platform supports English and Hindi out of the box, with architecture to add more languages.

### Scope

| What                              | How                               | Where                      |
| --------------------------------- | --------------------------------- | -------------------------- |
| Staff UI (menus, buttons, labels) | Static JSON files (next-intl)     | Frontend                   |
| Customer-facing UI (booking page) | Static JSON files (next-intl)     | Frontend                   |
| Message templates (WhatsApp/SMS)  | `content_en`, `content_hi` fields | Module 11 (Marketing)      |
| User language preference          | `preferred_language` column       | Users table (Module 1)     |
| Customer language preference      | `preferred_language` column       | Customers table (Module 3) |
| Date/time/number formatting       | Utility functions                 | Shared package             |

### What is NOT Translated

- Service names, category names (salon owner enters in their preferred language)
- Membership/package names
- Business-specific content

### Frontend Setup (next-intl)

```
apps/web/
├── messages/
│   ├── en.json          # English translations
│   └── hi.json          # Hindi translations
├── i18n.ts              # Configuration
└── middleware.ts        # Locale detection
```

### Locale Formatting Utilities

```typescript
// packages/shared/src/utils/locale.ts

export const SUPPORTED_LOCALES = ["en-IN", "hi-IN"] as const;
export const DEFAULT_LOCALE = "en-IN";

/**
 * Format number in Indian system (lakhs, crores)
 * 100000 → "1,00,000"
 */
export function formatIndianNumber(num: number): string {
  const numStr = Math.abs(num).toString();
  const [intPart, decPart] = numStr.split(".");

  let result = "";
  const len = intPart.length;

  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    while (remaining.length > 0) {
      result = remaining.slice(-2) + "," + result;
      remaining = remaining.slice(0, -2);
    }
  }

  return (num < 0 ? "-" : "") + result + (decPart ? "." + decPart : "");
}

/**
 * Format currency
 * 100000 → "₹1,00,000"
 */
export function formatCurrency(amount: number): string {
  return `₹${formatIndianNumber(amount)}`;
}

/**
 * Format date (DD/MM/YYYY)
 */
export function formatDate(date: Date, locale: string = "en-IN"): string {
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format time (12-hour with AM/PM)
 */
export function formatTime(date: Date, locale: string = "en-IN"): string {
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
```

### Message Template Selection

When sending notifications, the system selects the appropriate language:

```typescript
// In notification service
async function sendNotification(customerId: string, templateType: string) {
  const customer = await customerRepo.findById(customerId);
  const template = await templateRepo.findByType(templateType);

  // Select content based on customer preference
  const content =
    customer.preferredLanguage === "hi"
      ? template.contentHi
      : template.contentEn;

  await whatsappService.send(customer.phone, content);
}
```

### Adding New Languages

1. Add translation file: `messages/mr.json` (Marathi)
2. Update `SUPPORTED_LOCALES` constant
3. Add `content_mr` column to `message_templates` table
4. Update language switcher component

---

## Next Steps

This architecture document provides the foundation. Individual module design documents will detail:

1. Module-specific data models
2. API endpoints and schemas
3. Business logic flows
4. Integration points
5. Module-specific considerations

**Module Design Order:**

1. Module 1: Tenant Management (foundation)
2. Module 2: Appointments (core feature)
3. Module 4: Services & Pricing (needed for appointments)
4. Module 3: Customers (needed for appointments)
5. Module 5: Billing (revenue generation)
6. Remaining modules...
