---
# Reports & Analytics module patterns - dashboards, revenue reports, staff performance, and business insights
inclusion: fileMatch
fileMatchPattern: '**/report/**/*.ts, **/analytics/**/*.ts, **/dashboard/**/*.ts'
---

# Reports & Analytics Module

## Overview

This module handles reporting configuration, data snapshots, dashboards, revenue/sales reports, appointment analytics, staff performance, customer analytics, inventory reports, membership/package reports, expense reports, P&L, GST reports, comparisons, alerts, export/sharing, scheduled reports, and access control. It aggregates data from all other modules to provide actionable business insights.

**Related Requirements:** 10.1 - 10.20

---

## Database Schema

```sql
-- =====================================================
-- REPORT CONFIGURATION (Tenant-level settings)
-- =====================================================
CREATE TABLE report_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,

  -- Calendar settings
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 4, -- April

  -- Data freshness
  dashboard_refresh_seconds INTEGER DEFAULT 60,
  heavy_report_refresh_hours INTEGER DEFAULT 24,

  -- Branch inclusion
  include_inactive_branches BOOLEAN DEFAULT false,

  -- Currency & rounding
  currency_code VARCHAR(3) DEFAULT 'INR',
  decimal_places INTEGER DEFAULT 2,
  round_to_nearest INTEGER DEFAULT 1, -- 1 = nearest rupee

  -- Snapshot settings
  snapshot_retention_years INTEGER DEFAULT 7,

  -- Alert settings
  alerts_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DATA SNAPSHOTS (Daily aggregated metrics)
-- =====================================================
CREATE TABLE data_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID REFERENCES branches(id), -- NULL for consolidated

  -- Snapshot identification
  snapshot_date DATE NOT NULL,
  snapshot_type VARCHAR(30) NOT NULL,
  -- daily_revenue, daily_expense, daily_inventory, daily_appointments,
  -- monthly_summary, yearly_summary

  -- Version tracking
  version INTEGER DEFAULT 1,
  is_rebuilt BOOLEAN DEFAULT false,
  rebuilt_at TIMESTAMP,
  rebuilt_by UUID REFERENCES users(id),
  rebuilt_reason TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  -- active, superseded

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, branch_id, snapshot_date, snapshot_type, version)
);

CREATE INDEX idx_snapshots_date ON data_snapshots(tenant_id, snapshot_date, snapshot_type);
CREATE INDEX idx_snapshots_branch ON data_snapshots(branch_id, snapshot_date);

-- =====================================================
-- SNAPSHOT METRICS (Key-value pairs for snapshot data)
-- =====================================================
CREATE TABLE snapshot_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  snapshot_id UUID NOT NULL REFERENCES data_snapshots(id) ON DELETE CASCADE,

  metric_key VARCHAR(100) NOT NULL,
  metric_value DECIMAL(18, 4) NOT NULL,
  metric_metadata JSONB, -- Additional context

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(snapshot_id, metric_key)
);

CREATE INDEX idx_snapshot_metrics ON snapshot_metrics(snapshot_id);
CREATE INDEX idx_snapshot_metrics_key ON snapshot_metrics(metric_key);

-- =====================================================
-- ALERT CONFIGURATION
-- =====================================================
CREATE TABLE alert_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Alert type
  alert_type VARCHAR(50) NOT NULL,
  -- revenue_drop, wastage_high, discount_high, performance_drop,
  -- inventory_variance, noshow_high, budget_exceeded

  -- Configuration
  is_enabled BOOLEAN DEFAULT true,
  threshold_value DECIMAL(10, 2) NOT NULL,
  threshold_type VARCHAR(20) NOT NULL, -- percentage, absolute
  comparison_period VARCHAR(20), -- previous_day, previous_week, previous_month

  -- Notification settings
  notify_whatsapp BOOLEAN DEFAULT true,
  notify_in_app BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,

  -- Recipients
  recipient_roles VARCHAR(100)[], -- ['Super_Owner', 'Branch_Manager']
  recipient_user_ids UUID[],

  -- Branch scope
  branch_ids UUID[], -- NULL = all branches

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, alert_type)
);

CREATE INDEX idx_alert_configs ON alert_configs(tenant_id, is_enabled);

-- =====================================================
-- ALERT HISTORY
-- =====================================================
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID REFERENCES branches(id),
  alert_config_id UUID NOT NULL REFERENCES alert_configs(id),

  -- Alert details
  alert_type VARCHAR(50) NOT NULL,
  alert_title VARCHAR(255) NOT NULL,
  alert_message TEXT NOT NULL,

  -- Metrics
  current_value DECIMAL(18, 4) NOT NULL,
  threshold_value DECIMAL(10, 2) NOT NULL,
  comparison_value DECIMAL(18, 4),
  variance_percent DECIMAL(10, 2),

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  -- active, acknowledged, resolved, dismissed

  acknowledged_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),

  -- Notification tracking
  whatsapp_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_history ON alert_history(tenant_id, status, created_at);
CREATE INDEX idx_alert_history_branch ON alert_history(branch_id, created_at);

-- =====================================================
-- SCHEDULED REPORTS
-- =====================================================
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Report details
  name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  -- revenue, appointments, staff_performance, customer_analytics,
  -- inventory, membership_package, expense, pl, gst

  -- Filters (stored as JSON)
  filters JSONB NOT NULL DEFAULT '{}',

  -- Schedule
  schedule_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  schedule_day INTEGER, -- Day of week (0-6) or day of month (1-31)
  schedule_time TIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',

  -- Delivery
  delivery_method VARCHAR(20) NOT NULL, -- email, whatsapp
  recipients JSONB NOT NULL, -- [{type: 'email', value: 'x@y.com'}]

  -- Export format
  export_format VARCHAR(10) DEFAULT 'pdf', -- pdf, excel, csv

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Tracking
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20), -- success, failed
  last_run_error TEXT,
  next_run_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_scheduled_reports ON scheduled_reports(tenant_id, is_active);
CREATE INDEX idx_scheduled_reports_next ON scheduled_reports(next_run_at, is_active);

-- =====================================================
-- REPORT EXPORTS (Audit trail)
-- =====================================================
CREATE TABLE report_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Report details
  report_type VARCHAR(50) NOT NULL,
  report_title VARCHAR(255) NOT NULL,

  -- Filters applied
  filters JSONB NOT NULL DEFAULT '{}',
  date_range_start DATE,
  date_range_end DATE,

  -- Export details
  export_format VARCHAR(10) NOT NULL, -- pdf, excel, csv
  file_url VARCHAR(500),
  file_size INTEGER,

  -- Sharing
  shared_via VARCHAR(20), -- download, email, whatsapp
  shared_to VARCHAR(255), -- email or phone

  -- Metadata
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES users(id),

  -- Data snapshot reference
  data_snapshot_date DATE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_exports ON report_exports(tenant_id, generated_at);
CREATE INDEX idx_report_exports_user ON report_exports(generated_by, generated_at);

-- =====================================================
-- SAVED FILTERS (User presets)
-- =====================================================
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Filter details
  name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  filters JSONB NOT NULL,

  -- Sharing
  is_shared BOOLEAN DEFAULT false, -- Shared with team

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_filters ON saved_filters(user_id, report_type);

-- =====================================================
-- DASHBOARD WIDGETS (Custom dashboard configuration)
-- =====================================================
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Widget details
  widget_type VARCHAR(50) NOT NULL,
  -- revenue_today, revenue_mtd, profit_estimate, cash_position,
  -- appointments_today, top_branch, alerts, staff_leaderboard

  -- Role targeting
  target_role VARCHAR(30) NOT NULL,

  -- Position
  display_order INTEGER DEFAULT 0,
  grid_position JSONB, -- {row: 1, col: 1, width: 2, height: 1}

  -- Configuration
  config JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_widgets ON dashboard_widgets(tenant_id, target_role, is_active);
```

---

## TypeScript Types

```typescript
// =====================================================
// ENUMS
// =====================================================
export enum SnapshotType {
  DAILY_REVENUE = 'daily_revenue',
  DAILY_EXPENSE = 'daily_expense',
  DAILY_INVENTORY = 'daily_inventory',
  DAILY_APPOINTMENTS = 'daily_appointments',
  MONTHLY_SUMMARY = 'monthly_summary',
  YEARLY_SUMMARY = 'yearly_summary',
}

export enum AlertType {
  REVENUE_DROP = 'revenue_drop',
  WASTAGE_HIGH = 'wastage_high',
  DISCOUNT_HIGH = 'discount_high',
  PERFORMANCE_DROP = 'performance_drop',
  INVENTORY_VARIANCE = 'inventory_variance',
  NOSHOW_HIGH = 'noshow_high',
  BUDGET_EXCEEDED = 'budget_exceeded',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ThresholdType {
  PERCENTAGE = 'percentage',
  ABSOLUTE = 'absolute',
}

export enum ComparisonPeriod {
  PREVIOUS_DAY = 'previous_day',
  PREVIOUS_WEEK = 'previous_week',
  PREVIOUS_MONTH = 'previous_month',
  PREVIOUS_YEAR = 'previous_year',
}

export enum ReportType {
  REVENUE = 'revenue',
  APPOINTMENTS = 'appointments',
  STAFF_PERFORMANCE = 'staff_performance',
  CUSTOMER_ANALYTICS = 'customer_analytics',
  INVENTORY = 'inventory',
  MEMBERSHIP_PACKAGE = 'membership_package',
  EXPENSE = 'expense',
  PL = 'pl',
  GST = 'gst',
  CASH_FLOW = 'cash_flow',
}

export enum ScheduleType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum DeliveryMethod {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export enum WidgetType {
  REVENUE_TODAY = 'revenue_today',
  REVENUE_MTD = 'revenue_mtd',
  PROFIT_ESTIMATE = 'profit_estimate',
  CASH_POSITION = 'cash_position',
  APPOINTMENTS_TODAY = 'appointments_today',
  TOP_BRANCH = 'top_branch',
  ALERTS = 'alerts',
  STAFF_LEADERBOARD = 'staff_leaderboard',
  PENDING_BILLS = 'pending_bills',
  WALK_IN_QUEUE = 'walk_in_queue',
  MY_APPOINTMENTS = 'my_appointments',
  MY_EARNINGS = 'my_earnings',
  PENDING_APPROVALS = 'pending_approvals',
}

// =====================================================
// CORE TYPES
// =====================================================
export interface ReportConfig {
  id: string;
  tenantId: string;
  fiscalYearStartMonth: number;
  dashboardRefreshSeconds: number;
  heavyReportRefreshHours: number;
  includeInactiveBranches: boolean;
  currencyCode: string;
  decimalPlaces: number;
  roundToNearest: number;
  snapshotRetentionYears: number;
  alertsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSnapshot {
  id: string;
  tenantId: string;
  branchId?: string;
  snapshotDate: string;
  snapshotType: SnapshotType;
  version: number;
  isRebuilt: boolean;
  rebuiltAt?: Date;
  rebuiltBy?: string;
  rebuiltReason?: string;
  status: string;
  createdAt: Date;
  metrics?: SnapshotMetric[];
}

export interface SnapshotMetric {
  id: string;
  tenantId: string;
  snapshotId: string;
  metricKey: string;
  metricValue: number;
  metricMetadata?: Record<string, any>;
  createdAt: Date;
}

export interface AlertConfig {
  id: string;
  tenantId: string;
  alertType: AlertType;
  isEnabled: boolean;
  thresholdValue: number;
  thresholdType: ThresholdType;
  comparisonPeriod?: ComparisonPeriod;
  notifyWhatsapp: boolean;
  notifyInApp: boolean;
  notifyEmail: boolean;
  recipientRoles: string[];
  recipientUserIds: string[];
  branchIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface AlertHistory {
  id: string;
  tenantId: string;
  branchId?: string;
  alertConfigId: string;
  alertType: AlertType;
  alertTitle: string;
  alertMessage: string;
  currentValue: number;
  thresholdValue: number;
  comparisonValue?: number;
  variancePercent?: number;
  status: AlertStatus;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  whatsappSent: boolean;
  emailSent: boolean;
  createdAt: Date;
}

export interface ScheduledReport {
  id: string;
  tenantId: string;
  name: string;
  reportType: ReportType;
  filters: Record<string, any>;
  scheduleType: ScheduleType;
  scheduleDay?: number;
  scheduleTime: string;
  timezone: string;
  deliveryMethod: DeliveryMethod;
  recipients: { type: string; value: string }[];
  exportFormat: ExportFormat;
  isActive: boolean;
  lastRunAt?: Date;
  lastRunStatus?: string;
  lastRunError?: string;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface ReportExport {
  id: string;
  tenantId: string;
  reportType: ReportType;
  reportTitle: string;
  filters: Record<string, any>;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  exportFormat: ExportFormat;
  fileUrl?: string;
  fileSize?: number;
  sharedVia?: string;
  sharedTo?: string;
  generatedAt: Date;
  generatedBy?: string;
  dataSnapshotDate?: string;
  createdAt: Date;
}

export interface SavedFilter {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  reportType: ReportType;
  filters: Record<string, any>;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  tenantId: string;
  widgetType: WidgetType;
  targetRole: string;
  displayOrder: number;
  gridPosition?: { row: number; col: number; width: number; height: number };
  config: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// REPORT DATA TYPES
// =====================================================
export interface RevenueReport {
  period: DateRange;
  branchId?: string;

  summary: {
    totalRevenue: number;
    serviceRevenue: number;
    productRevenue: number;
    membershipRevenue: number;
    packageRevenue: number;
    averageBillValue: number;
    totalBills: number;
    totalDiscounts: number;
    discountPercent: number;
  };

  byBranch?: {
    branchId: string;
    branchName: string;
    revenue: number;
    billCount: number;
    avgBillValue: number;
  }[];

  byService?: {
    serviceId: string;
    serviceName: string;
    revenue: number;
    quantity: number;
  }[];

  byPaymentMethod?: {
    method: string;
    amount: number;
    count: number;
    percent: number;
  }[];

  dailyTrend?: {
    date: string;
    revenue: number;
    billCount: number;
  }[];

  comparison?: {
    previousPeriodRevenue: number;
    changeAmount: number;
    changePercent: number;
  };

  dataFreshness: Date;
}

export interface AppointmentReport {
  period: DateRange;
  branchId?: string;

  summary: {
    totalAppointments: number;
    completedCount: number;
    cancelledCount: number;
    noShowCount: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
  };

  bySource?: {
    source: string;
    count: number;
    percent: number;
  }[];

  byStatus?: {
    status: string;
    count: number;
    percent: number;
  }[];

  peakHours?: {
    hour: number;
    dayOfWeek: number;
    appointmentCount: number;
    utilizationPercent: number;
  }[];

  staffUtilization?: {
    staffId: string;
    staffName: string;
    bookedHours: number;
    availableHours: number;
    utilizationPercent: number;
  }[];

  avgWaitTime?: number;
  dataFreshness: Date;
}

export interface StaffPerformanceReport {
  period: DateRange;
  branchId?: string;

  staff: {
    staffId: string;
    staffName: string;
    role: string;
    branchName: string;
    revenue: number;
    servicesCount: number;
    avgServiceTime: number;
    expectedServiceTime: number;
    efficiency: number;
    commissionEarned: number;
    presentDays: number;
    lateDays: number;
    leaveDays: number;
    attendancePercent: number;
    avgRating?: number;
    ratingCount: number;
    rebookingRate: number;
    targetAmount?: number;
    targetAchievement?: number;
    rank: number;
  }[];

  leaderboard: {
    byRevenue: { staffId: string; staffName: string; value: number }[];
    byServices: { staffId: string; staffName: string; value: number }[];
    byRating: { staffId: string; staffName: string; value: number }[];
  };

  dataFreshness: Date;
}

export interface CustomerAnalyticsReport {
  period: DateRange;
  branchId?: string;

  summary: {
    totalCustomers: number;
    newCustomers: number;
    repeatCustomers: number;
    newVsRepeatRatio: number;
    avgLifetimeValue: number;
    avgVisitFrequency: number;
    avgDaysBetweenVisits: number;
  };

  byAcquisitionSource?: {
    source: string;
    count: number;
    percent: number;
  }[];

  visitFrequencyDistribution?: {
    visits: string;
    customerCount: number;
    percent: number;
  }[];

  inactiveCustomers?: {
    customerId: string;
    customerName: string;
    lastVisitDate: string;
    daysSinceVisit: number;
    totalSpend: number;
  }[];

  churnRisk?: {
    customerId: string;
    customerName: string;
    riskScore: number;
    lastVisitDate: string;
    avgVisitGap: number;
    currentGap: number;
  }[];

  membershipPenetration: {
    totalCustomers: number;
    membersCount: number;
    penetrationPercent: number;
  };

  loyaltyLiability: {
    totalPointsOutstanding: number;
    estimatedValue: number;
  };

  topCustomers?: {
    customerId: string;
    customerName: string;
    totalSpend: number;
    visitCount: number;
  }[];

  dataFreshness: Date;
}

export interface InventoryReport {
  period: DateRange;
  branchId?: string;

  summary: {
    totalStockValue: number;
    totalConsumption: number;
    wastageValue: number;
    wastagePercent: number;
    turnoverRatio: number;
  };

  stockLevels?: {
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    reorderLevel: number;
    stockValue: number;
    status: 'ok' | 'low' | 'out';
  }[];

  consumptionByService?: {
    serviceId: string;
    serviceName: string;
    consumptionValue: number;
    consumptionCount: number;
  }[];

  consumptionByProduct?: {
    productId: string;
    productName: string;
    consumedQuantity: number;
    consumedValue: number;
  }[];

  deadStock?: {
    productId: string;
    productName: string;
    lastUsedDate: string;
    daysSinceUse: number;
    stockValue: number;
  }[];

  nearExpiry?: {
    productId: string;
    productName: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    value: number;
  }[];

  vendorSummary?: {
    vendorId: string;
    vendorName: string;
    purchaseValue: number;
    itemCount: number;
  }[];

  stockVariance?: {
    productId: string;
    productName: string;
    expectedStock: number;
    actualStock: number;
    variance: number;
    varianceValue: number;
  }[];

  dataFreshness: Date;
}

export interface MembershipPackageReport {
  period: DateRange;
  branchId?: string;

  memberships: {
    activeCount: number;
    activeValue: number;
    soldCount: number;
    soldValue: number;
    expiredCount: number;
    renewalRate: number;
    avgDiscountAvailed: number;
  };

  packages: {
    activeCount: number;
    activeValue: number;
    soldCount: number;
    soldValue: number;
    liability: number;
    expiryLoss: number;
  };

  byPlan?: {
    planId: string;
    planName: string;
    type: 'membership' | 'package';
    activeCount: number;
    soldCount: number;
    revenue: number;
  }[];

  byBranch?: {
    branchId: string;
    branchName: string;
    membershipsSold: number;
    packagesSold: number;
    totalRevenue: number;
  }[];

  redemptionPatterns?: {
    serviceId: string;
    serviceName: string;
    redemptionCount: number;
    redemptionValue: number;
  }[];

  crossBranchUsage?: {
    purchaseBranchId: string;
    purchaseBranchName: string;
    usageBranchId: string;
    usageBranchName: string;
    usageCount: number;
    usageValue: number;
  }[];

  dataFreshness: Date;
}

export interface GSTReport {
  period: DateRange;
  branchId?: string;

  summary: {
    outputTax: number;
    inputTax: number;
    netLiability: number;
    cgstCollected: number;
    sgstCollected: number;
    igstCollected: number;
    cgstPaid: number;
    sgstPaid: number;
    igstPaid: number;
  };

  byBranch?: {
    branchId: string;
    branchName: string;
    gstin?: string;
    outputTax: number;
    inputTax: number;
    netLiability: number;
  }[];

  bySacHsn?: {
    code: string;
    description: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  }[];

  creditNotes?: {
    creditNoteNumber: string;
    originalInvoiceNumber: string;
    date: string;
    taxableValue: number;
    taxAmount: number;
  }[];

  gstrSummary?: {
    b2b: { invoiceCount: number; taxableValue: number; tax: number }[];
    b2c: { taxableValue: number; tax: number };
  };

  dataFreshness: Date;
}

export interface ExecutiveDashboard {
  period: DateRange;

  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  };

  estimatedProfit: {
    thisMonth: number;
    marginPercent: number;
  };

  cashPosition: {
    totalCash: number;
    byBranch: { branchId: string; branchName: string; cash: number }[];
  };

  outstandingDues: {
    vendorPayables: number;
    packageLiability: number;
    total: number;
  };

  topBranch: {
    branchId: string;
    branchName: string;
    revenue: number;
  };

  alerts: AlertHistory[];
  dataFreshness: Date;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}
```

---

## API Endpoints

### Report Configuration

```
GET    /api/v1/reports/config               Get report config
PATCH  /api/v1/reports/config               Update report config
```

### Dashboards

```
GET    /api/v1/dashboard                    Get role-based dashboard
GET    /api/v1/dashboard/executive          Get executive dashboard
GET    /api/v1/dashboard/widgets            Get dashboard widgets
PATCH  /api/v1/dashboard/widgets/:id        Update widget config
```

### Reports

```
GET    /api/v1/reports/revenue              Get revenue report
GET    /api/v1/reports/appointments         Get appointment report
GET    /api/v1/reports/staff-performance    Get staff performance report
GET    /api/v1/reports/customer-analytics   Get customer analytics report
GET    /api/v1/reports/inventory            Get inventory report
GET    /api/v1/reports/membership-package   Get membership/package report
GET    /api/v1/reports/expense              Get expense report
GET    /api/v1/reports/pl                   Get P&L report
GET    /api/v1/reports/gst                  Get GST report
GET    /api/v1/reports/cash-flow            Get cash flow report
```

### Comparisons

```
GET    /api/v1/reports/compare/period       Compare periods
GET    /api/v1/reports/compare/branch       Compare branches
GET    /api/v1/reports/compare/staff        Compare staff
GET    /api/v1/reports/compare/service      Compare services
```

### Drill-Down

```
GET    /api/v1/reports/drill-down/:metric   Get detailed breakdown for metric
GET    /api/v1/reports/source/:metric       Get source transactions for metric
```

### Alerts

```
GET    /api/v1/alerts/config                List alert configurations
PATCH  /api/v1/alerts/config/:type          Update alert config
GET    /api/v1/alerts                       List active alerts
POST   /api/v1/alerts/:id/acknowledge       Acknowledge alert
POST   /api/v1/alerts/:id/resolve           Resolve alert
POST   /api/v1/alerts/:id/dismiss           Dismiss alert
```

### Scheduled Reports

```
GET    /api/v1/scheduled-reports            List scheduled reports
POST   /api/v1/scheduled-reports            Create scheduled report
GET    /api/v1/scheduled-reports/:id        Get scheduled report details
PATCH  /api/v1/scheduled-reports/:id        Update scheduled report
DELETE /api/v1/scheduled-reports/:id        Delete scheduled report
POST   /api/v1/scheduled-reports/:id/run    Run scheduled report now
```

### Export & Sharing

```
POST   /api/v1/reports/export               Export report
GET    /api/v1/reports/exports              List export history
POST   /api/v1/reports/share                Share report via email/WhatsApp
```

### Saved Filters

```
GET    /api/v1/reports/filters              List saved filters
POST   /api/v1/reports/filters              Save filter preset
DELETE /api/v1/reports/filters/:id          Delete saved filter
```

### Snapshots (Admin)

```
GET    /api/v1/snapshots                    List snapshots
POST   /api/v1/snapshots/rebuild            Rebuild snapshot (admin)
```

---

## Business Logic

### 1. Snapshot Service

```typescript
class SnapshotService {
  /**
   * Create daily snapshots (called by scheduler)
   */
  async createDailySnapshots(date: string): Promise<void> {
    const tenants = await this.tenantRepo.findAllActive();

    for (const tenant of tenants) {
      await this.createTenantSnapshots(tenant.id, date);
    }
  }

  /**
   * Create snapshots for a tenant
   */
  private async createTenantSnapshots(
    tenantId: string,
    date: string
  ): Promise<void> {
    const branches = await this.branchRepo.findByTenant(tenantId);

    // Create branch-level snapshots
    for (const branch of branches) {
      await this.createRevenueSnapshot(tenantId, branch.id, date);
      await this.createExpenseSnapshot(tenantId, branch.id, date);
      await this.createInventorySnapshot(tenantId, branch.id, date);
      await this.createAppointmentSnapshot(tenantId, branch.id, date);
    }

    // Create consolidated snapshot
    await this.createRevenueSnapshot(tenantId, null, date);
    await this.createExpenseSnapshot(tenantId, null, date);
  }

  /**
   * Create revenue snapshot
   */
  private async createRevenueSnapshot(
    tenantId: string,
    branchId: string | null,
    date: string
  ): Promise<DataSnapshot> {
    // Get revenue data from billing
    const revenueData = await this.billingService.getDailyRevenue(branchId, date);

    // Create snapshot
    const snapshot = await this.snapshotRepo.create({
      tenantId,
      branchId,
      snapshotDate: date,
      snapshotType: SnapshotType.DAILY_REVENUE,
      version: 1,
    });

    // Store metrics
    const metrics = [
      { key: 'total_revenue', value: revenueData.totalRevenue },
      { key: 'service_revenue', value: revenueData.serviceRevenue },
      { key: 'product_revenue', value: revenueData.productRevenue },
      { key: 'membership_revenue', value: revenueData.membershipRevenue },
      { key: 'package_revenue', value: revenueData.packageRevenue },
      { key: 'total_bills', value: revenueData.billCount },
      { key: 'avg_bill_value', value: revenueData.avgBillValue },
      { key: 'total_discounts', value: revenueData.totalDiscounts },
      { key: 'cash_collected', value: revenueData.cashCollected },
      { key: 'card_collected', value: revenueData.cardCollected },
      { key: 'upi_collected', value: revenueData.upiCollected },
    ];

    await this.snapshotMetricRepo.createMany(
      metrics.map(m => ({
        tenantId,
        snapshotId: snapshot.id,
        metricKey: m.key,
        metricValue: m.value,
      }))
    );

    return snapshot;
  }

  /**
   * Rebuild snapshot from source data
   */
  async rebuildSnapshot(
    snapshotId: string,
    reason: string,
    userId: string
  ): Promise<DataSnapshot> {
    const snapshot = await this.snapshotRepo.findById(snapshotId);

    // Mark old snapshot as superseded
    await this.snapshotRepo.update(snapshotId, { status: 'superseded' });

    // Create new snapshot with incremented version
    const newSnapshot = await this.snapshotRepo.create({
      ...snapshot,
      id: undefined,
      version: snapshot.version + 1,
      isRebuilt: true,
      rebuiltAt: new Date(),
      rebuiltBy: userId,
      rebuiltReason: reason,
      status: 'active',
    });

    // Recalculate metrics from source
    await this.recalculateMetrics(newSnapshot);

    return newSnapshot;
  }
}
```

### 2. Report Service

```typescript
class ReportService {
  /**
   * Get revenue report
   */
  async getRevenueReport(
    request: RevenueReportRequest,
    userId: string
  ): Promise<RevenueReport> {
    const { startDate, endDate, branchId, groupBy, includeComparison } = request;

    // Check access
    await this.checkReportAccess(userId, ReportType.REVENUE, branchId);

    // Determine data source
    const useSnapshots = this.shouldUseSnapshots(startDate, endDate);

    let data: RevenueReport;

    if (useSnapshots) {
      data = await this.getRevenueFromSnapshots(startDate, endDate, branchId);
    } else {
      data = await this.getRevenueFromLiveData(startDate, endDate, branchId);
    }

    // Add grouping
    if (groupBy) {
      data.dailyTrend = await this.groupRevenueData(data, groupBy);
    }

    // Add comparison
    if (includeComparison) {
      const comparisonPeriod = this.getComparisonPeriod(
        startDate,
        endDate,
        request.comparisonPeriod
      );
      const comparisonData = useSnapshots
        ? await this.getRevenueFromSnapshots(
            comparisonPeriod.startDate,
            comparisonPeriod.endDate,
            branchId
          )
        : await this.getRevenueFromLiveData(
            comparisonPeriod.startDate,
            comparisonPeriod.endDate,
            branchId
          );

      data.comparison = {
        previousPeriodRevenue: comparisonData.summary.totalRevenue,
        changeAmount: data.summary.totalRevenue - comparisonData.summary.totalRevenue,
        changePercent: this.calculateChangePercent(
          data.summary.totalRevenue,
          comparisonData.summary.totalRevenue
        ),
      };
    }

    // Log report access
    await this.logReportAccess(userId, ReportType.REVENUE, { startDate, endDate, branchId });

    return data;
  }

  /**
   * Determine if snapshots should be used
   */
  private shouldUseSnapshots(startDate: string, endDate: string): boolean {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return endDate < twoDaysAgo.toISOString().split('T')[0];
  }
}
```

### 3. Dashboard Service

```typescript
class DashboardService {
  /**
   * Get role-based dashboard
   */
  async getDashboard(userId: string): Promise<any> {
    const user = await this.userRepo.findById(userId);
    const role = user.role;

    switch (role) {
      case 'Super_Owner':
        return this.getOwnerDashboard(user);
      case 'Regional_Manager':
        return this.getRegionalManagerDashboard(user);
      case 'Branch_Manager':
        return this.getBranchManagerDashboard(user);
      case 'Receptionist':
        return this.getReceptionistDashboard(user);
      case 'Stylist':
        return this.getStylistDashboard(user);
      case 'Accountant':
        return this.getAccountantDashboard(user);
      default:
        throw new ReportError('INVALID_ROLE', 'Unknown role for dashboard');
    }
  }

  /**
   * Owner dashboard - business-wide KPIs
   */
  private async getOwnerDashboard(user: User): Promise<ExecutiveDashboard> {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = this.getWeekStart(today);
    const monthStart = this.getMonthStart(today);

    // Get revenue metrics
    const todayRevenue = await this.billingService.getRevenue(null, today, today);
    const weekRevenue = await this.billingService.getRevenue(null, weekStart, today);
    const monthRevenue = await this.billingService.getRevenue(null, monthStart, today);

    // Get previous month for comparison
    const prevMonthStart = this.getPreviousMonthStart(today);
    const prevMonthEnd = this.getPreviousMonthEnd(today);
    const prevMonthRevenue = await this.billingService.getRevenue(null, prevMonthStart, prevMonthEnd);

    // Calculate trend
    const changePercent = this.calculateChangePercent(monthRevenue.total, prevMonthRevenue.total);
    const trend = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';

    // Get profit estimate
    const expenses = await this.expenseService.getTotal(null, monthStart, today);
    const estimatedProfit = monthRevenue.total - expenses;

    // Get cash position
    const cashPosition = await this.getCashPosition();

    // Get outstanding dues
    const vendorPayables = await this.expenseService.getPendingPayables();
    const packageLiability = await this.packageService.getTotalLiability();

    // Get top branch
    const branchRevenues = await this.billingService.getRevenueByBranch(monthStart, today);
    const topBranch = branchRevenues.sort((a, b) => b.revenue - a.revenue)[0];

    // Get active alerts
    const alerts = await this.alertService.getActiveAlerts(user.tenantId);

    return {
      period: { startDate: monthStart, endDate: today },
      revenue: {
        today: todayRevenue.total,
        thisWeek: weekRevenue.total,
        thisMonth: monthRevenue.total,
        trend,
        changePercent,
      },
      estimatedProfit: {
        thisMonth: estimatedProfit,
        marginPercent: (estimatedProfit / monthRevenue.total) * 100,
      },
      cashPosition,
      outstandingDues: {
        vendorPayables,
        packageLiability,
        total: vendorPayables + packageLiability,
      },
      topBranch,
      alerts,
      dataFreshness: new Date(),
    };
  }

  /**
   * Stylist dashboard - personal metrics
   */
  private async getStylistDashboard(user: User): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = this.getMonthStart(today);

    const todayAppointments = await this.appointmentService.getByStaff(user.id, today, today);
    const monthEarnings = await this.billingService.getStaffEarnings(user.id, monthStart, today);
    const target = await this.staffService.getTarget(user.id, monthStart);
    const ratings = await this.feedbackService.getStaffRatings(user.id, monthStart, today);

    return {
      appointments: {
        today: todayAppointments,
        upcomingCount: todayAppointments.filter(a => a.status === 'scheduled').length,
      },
      earnings: {
        thisMonth: monthEarnings.total,
        commission: monthEarnings.commission,
        incentives: monthEarnings.incentives,
      },
      target: target ? {
        amount: target.targetAmount,
        achieved: monthEarnings.revenue,
        percent: (monthEarnings.revenue / target.targetAmount) * 100,
      } : null,
      ratings: {
        average: ratings.average,
        count: ratings.count,
      },
      dataFreshness: new Date(),
    };
  }
}
```

### 4. Alert Service

```typescript
class AlertService {
  /**
   * Check and generate alerts (called by scheduler)
   */
  async checkAlerts(): Promise<void> {
    const configs = await this.alertConfigRepo.findEnabled();

    for (const config of configs) {
      try {
        await this.checkAlertCondition(config);
      } catch (error) {
        this.logger.error('Alert check failed', { alertType: config.alertType, error });
      }
    }
  }

  /**
   * Check single alert condition
   */
  private async checkAlertCondition(config: AlertConfig): Promise<void> {
    const branches = config.branchIds || await this.getAllBranchIds(config.tenantId);

    for (const branchId of branches) {
      const { currentValue, comparisonValue } = await this.getAlertMetrics(
        config.alertType,
        branchId,
        config.comparisonPeriod
      );

      const shouldAlert = this.evaluateThreshold(
        currentValue,
        comparisonValue,
        config.thresholdValue,
        config.thresholdType,
        config.alertType
      );

      if (shouldAlert) {
        await this.createAlert(config, branchId, currentValue, comparisonValue);
      }
    }
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(
    currentValue: number,
    comparisonValue: number | undefined,
    threshold: number,
    thresholdType: ThresholdType,
    alertType: AlertType
  ): boolean {
    if (thresholdType === ThresholdType.ABSOLUTE) {
      return currentValue >= threshold;
    }

    if (!comparisonValue || comparisonValue === 0) {
      return false;
    }

    const changePercent = ((currentValue - comparisonValue) / comparisonValue) * 100;

    if (alertType === AlertType.REVENUE_DROP) {
      return changePercent <= -threshold;
    }

    return changePercent >= threshold;
  }

  /**
   * Create alert and send notifications
   */
  private async createAlert(
    config: AlertConfig,
    branchId: string,
    currentValue: number,
    comparisonValue?: number
  ): Promise<void> {
    const variancePercent = comparisonValue
      ? ((currentValue - comparisonValue) / comparisonValue) * 100
      : undefined;

    const alert = await this.alertHistoryRepo.create({
      tenantId: config.tenantId,
      branchId,
      alertConfigId: config.id,
      alertType: config.alertType,
      alertTitle: this.getAlertTitle(config.alertType, branchId),
      alertMessage: this.getAlertMessage(config.alertType, currentValue, comparisonValue),
      currentValue,
      thresholdValue: config.thresholdValue,
      comparisonValue,
      variancePercent,
      status: AlertStatus.ACTIVE,
    });

    if (config.notifyWhatsapp) {
      await this.sendWhatsAppAlert(alert, config);
    }
    if (config.notifyEmail) {
      await this.sendEmailAlert(alert, config);
    }
    if (config.notifyInApp) {
      await this.sendInAppAlert(alert, config);
    }
  }
}
```

### 5. Export Service

```typescript
class ExportService {
  /**
   * Export report to file
   */
  async exportReport(
    request: ExportReportRequest,
    userId: string
  ): Promise<ExportReportResponse> {
    const reportData = await this.reportService.getReport(
      request.reportType,
      request.filters,
      request.startDate,
      request.endDate,
      userId
    );

    let fileBuffer: Buffer;
    let fileName: string;
    let contentType: string;

    switch (request.format) {
      case ExportFormat.PDF:
        fileBuffer = await this.generatePDF(reportData, request);
        fileName = `${request.reportType}_${request.startDate}_${request.endDate}.pdf`;
        contentType = 'application/pdf';
        break;

      case ExportFormat.EXCEL:
        fileBuffer = await this.generateExcel(reportData, request);
        fileName = `${request.reportType}_${request.startDate}_${request.endDate}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case ExportFormat.CSV:
        fileBuffer = await this.generateCSV(reportData, request);
        fileName = `${request.reportType}_${request.startDate}_${request.endDate}.csv`;
        contentType = 'text/csv';
        break;
    }

    const fileUrl = await this.s3Service.upload(fileBuffer, fileName, contentType);

    const exportRecord = await this.reportExportRepo.create({
      tenantId: reportData.tenantId,
      reportType: request.reportType,
      reportTitle: this.getReportTitle(request.reportType),
      filters: request.filters,
      dateRangeStart: request.startDate,
      dateRangeEnd: request.endDate,
      exportFormat: request.format,
      fileUrl,
      fileSize: fileBuffer.length,
      sharedVia: 'download',
      generatedBy: userId,
      dataSnapshotDate: new Date().toISOString().split('T')[0],
    });

    return {
      success: true,
      data: {
        exportId: exportRecord.id,
        fileUrl,
        fileName,
        fileSize: fileBuffer.length,
        expiresAt: this.getExpiryTime(),
      },
    };
  }
}
```

---

## Validation Schemas

```typescript
import { z } from 'zod';

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before or equal to end date' }
);

// Report request
export const reportRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchId: z.string().uuid().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
  includeComparison: z.boolean().optional(),
  comparisonPeriod: z.nativeEnum(ComparisonPeriod).optional(),
});

// Alert config
export const alertConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  thresholdValue: z.number().positive().optional(),
  thresholdType: z.nativeEnum(ThresholdType).optional(),
  comparisonPeriod: z.nativeEnum(ComparisonPeriod).optional(),
  notifyWhatsapp: z.boolean().optional(),
  notifyInApp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  recipientRoles: z.array(z.string()).optional(),
  recipientUserIds: z.array(z.string().uuid()).optional(),
  branchIds: z.array(z.string().uuid()).optional(),
});

// Scheduled report
export const createScheduledReportSchema = z.object({
  name: z.string().min(1).max(100),
  reportType: z.nativeEnum(ReportType),
  filters: z.record(z.any()).default({}),
  scheduleType: z.nativeEnum(ScheduleType),
  scheduleDay: z.number().int().min(0).max(31).optional(),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/),
  deliveryMethod: z.nativeEnum(DeliveryMethod),
  recipients: z.array(z.object({
    type: z.enum(['email', 'whatsapp']),
    value: z.string(),
  })).min(1),
  exportFormat: z.nativeEnum(ExportFormat).default(ExportFormat.PDF),
});

// Export request
export const exportReportSchema = z.object({
  reportType: z.nativeEnum(ReportType),
  filters: z.record(z.any()).default({}),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.nativeEnum(ExportFormat),
});

// Saved filter
export const savedFilterSchema = z.object({
  name: z.string().min(1).max(100),
  reportType: z.nativeEnum(ReportType),
  filters: z.record(z.any()),
  isShared: z.boolean().default(false),
});
```

---

## Integration Points

### Inbound Dependencies

| Module             | Integration           | Purpose                        |
| ------------------ | --------------------- | ------------------------------ |
| Billing            | Revenue data          | Revenue reports, P&L           |
| Appointments       | Appointment stats     | Appointment reports            |
| Customers          | Customer analytics    | Customer reports               |
| Inventory          | Stock/consumption     | Inventory reports              |
| Staff              | Performance data      | Staff performance reports      |
| Memberships        | Membership/package    | Membership reports             |
| Expenses           | Expense data          | Expense reports, P&L           |

### Event Emissions

```typescript
// Report Events
'report.generated'        -> { reportType: ReportType, userId: string, filters: object }
'report.exported'         -> { exportId: string, reportType: ReportType, format: ExportFormat, userId: string }
'report.shared'           -> { exportId: string, sharedVia: string, sharedTo: string, userId: string }

// Scheduled Report Events
'scheduled_report.created'  -> { scheduledReport: ScheduledReport, userId: string }
'scheduled_report.executed' -> { scheduledReport: ScheduledReport, success: boolean }
'scheduled_report.failed'   -> { scheduledReport: ScheduledReport, error: string }

// Alert Events
'alert.triggered'         -> { alert: AlertHistory }
'alert.acknowledged'      -> { alertId: string, userId: string }
'alert.resolved'          -> { alertId: string, userId: string }

// Snapshot Events
'snapshot.created'        -> { snapshot: DataSnapshot }
'snapshot.rebuilt'        -> { snapshot: DataSnapshot, userId: string, reason: string }
```

---

## Error Handling

```typescript
export enum ReportErrorCode {
  // Access errors
  ACCESS_DENIED = 'REPORT_001',
  INVALID_ROLE = 'REPORT_002',
  BRANCH_ACCESS_DENIED = 'REPORT_003',

  // Data errors
  NO_DATA_AVAILABLE = 'REPORT_010',
  SNAPSHOT_NOT_FOUND = 'REPORT_011',
  INVALID_DATE_RANGE = 'REPORT_012',

  // Export errors
  EXPORT_FAILED = 'REPORT_020',
  INVALID_FORMAT = 'REPORT_021',
  FILE_TOO_LARGE = 'REPORT_022',

  // Scheduled report errors
  SCHEDULE_INVALID = 'REPORT_030',
  DELIVERY_FAILED = 'REPORT_031',

  // Alert errors
  ALERT_CONFIG_INVALID = 'REPORT_040',
  ALERT_NOT_FOUND = 'REPORT_041',
}

export class ReportError extends Error {
  constructor(
    public code: ReportErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ReportError';
  }
}
```

---

## Testing Considerations

### Unit Tests

```typescript
describe('SnapshotService', () => {
  describe('createDailySnapshots', () => {
    it('should create revenue snapshot for each branch');
    it('should create consolidated snapshot');
    it('should store correct metrics');
    it('should handle missing data gracefully');
  });

  describe('rebuildSnapshot', () => {
    it('should mark old snapshot as superseded');
    it('should create new version');
    it('should recalculate metrics from source');
  });
});

describe('ReportService', () => {
  describe('getRevenueReport', () => {
    it('should use snapshots for historical data');
    it('should use live data for recent dates');
    it('should calculate comparison correctly');
    it('should respect branch access');
  });
});

describe('DashboardService', () => {
  describe('getDashboard', () => {
    it('should return owner dashboard for Super_Owner');
    it('should return stylist dashboard for Stylist');
    it('should hide sensitive data from unauthorized roles');
  });
});

describe('AlertService', () => {
  describe('checkAlerts', () => {
    it('should trigger alert when threshold exceeded');
    it('should not trigger alert when within threshold');
    it('should send notifications to configured channels');
  });
});

describe('ExportService', () => {
  describe('exportReport', () => {
    it('should generate PDF correctly');
    it('should generate Excel correctly');
    it('should generate CSV correctly');
    it('should log export');
  });
});
```

---

## Performance Considerations

### Caching Strategy

```typescript
// Cache dashboard data (short TTL for real-time feel)
const DASHBOARD_CACHE_TTL = 60; // 1 minute

// Cache report config (rarely changes)
const REPORT_CONFIG_CACHE_TTL = 3600; // 1 hour

// Cache snapshot data (immutable, long TTL)
const SNAPSHOT_CACHE_TTL = 86400; // 24 hours

// Cache alert configs
const ALERT_CONFIG_CACHE_TTL = 300; // 5 minutes
```

### Query Optimization

```sql
-- Snapshot queries
CREATE INDEX idx_snapshots_lookup ON data_snapshots(tenant_id, branch_id, snapshot_date, snapshot_type)
  WHERE status = 'active';

-- Alert queries
CREATE INDEX idx_alerts_active ON alert_history(tenant_id, status, created_at)
  WHERE status = 'active';

-- Scheduled report queries
CREATE INDEX idx_scheduled_due ON scheduled_reports(next_run_at, is_active)
  WHERE is_active = true;
```

---

## Security Considerations

### Access Control

```typescript
const REPORT_ACCESS = {
  [ReportType.REVENUE]: ['Super_Owner', 'Regional_Manager', 'Branch_Manager', 'Accountant'],
  [ReportType.APPOINTMENTS]: ['Super_Owner', 'Regional_Manager', 'Branch_Manager', 'Receptionist'],
  [ReportType.STAFF_PERFORMANCE]: ['Super_Owner', 'Regional_Manager', 'Branch_Manager'],
  [ReportType.CUSTOMER_ANALYTICS]: ['Super_Owner', 'Regional_Manager', 'Branch_Manager'],
  [ReportType.INVENTORY]: ['Super_Owner', 'Regional_Manager', 'Branch_Manager'],
  [ReportType.MEMBERSHIP_PACKAGE]: ['Super_Owner', 'Regional_Manager', 'Branch_Manager', 'Accountant'],
  [ReportType.EXPENSE]: ['Super_Owner', 'Regional_Manager', 'Branch_Manager', 'Accountant'],
  [ReportType.PL]: ['Super_Owner', 'Accountant'], // Restricted
  [ReportType.GST]: ['Super_Owner', 'Accountant'],
  [ReportType.CASH_FLOW]: ['Super_Owner', 'Regional_Manager', 'Branch_Manager', 'Accountant'],
};

// Sensitive metrics hidden from non-owners
const SENSITIVE_METRICS = ['profit', 'margin', 'staff_salary', 'commission_details'];
```

---

## Scheduled Jobs

```typescript
// Snapshot jobs
'0 2 * * *'   -> createDailySnapshots()        // Create daily snapshots at 2 AM
'0 3 1 * *'   -> createMonthlySnapshots()      // Create monthly snapshots on 1st

// Alert jobs
'*/15 * * * *' -> checkAlerts()                // Check alerts every 15 minutes

// Scheduled report jobs
'* * * * *'   -> processDueReports()           // Check for due reports every minute

// Cleanup jobs
'0 4 * * 0'   -> cleanupOldExports()           // Clean up old exports weekly
'0 5 1 * *'   -> archiveOldSnapshots()         // Archive snapshots older than retention

// Materialized view refresh
'0 1 * * *'   -> refreshMaterializedViews()    // Refresh MVs at 1 AM
```

---

## Default Alert Configurations

```typescript
const DEFAULT_ALERT_CONFIGS = [
  {
    alertType: AlertType.REVENUE_DROP,
    thresholdValue: 20,
    thresholdType: ThresholdType.PERCENTAGE,
    comparisonPeriod: ComparisonPeriod.PREVIOUS_WEEK,
    isEnabled: true,
  },
  {
    alertType: AlertType.WASTAGE_HIGH,
    thresholdValue: 5,
    thresholdType: ThresholdType.PERCENTAGE,
    isEnabled: true,
  },
  {
    alertType: AlertType.DISCOUNT_HIGH,
    thresholdValue: 15,
    thresholdType: ThresholdType.PERCENTAGE,
    isEnabled: true,
  },
  {
    alertType: AlertType.NOSHOW_HIGH,
    thresholdValue: 10,
    thresholdType: ThresholdType.PERCENTAGE,
    isEnabled: true,
  },
  {
    alertType: AlertType.INVENTORY_VARIANCE,
    thresholdValue: 5,
    thresholdType: ThresholdType.PERCENTAGE,
    isEnabled: true,
  },
];
```

---

## Default Dashboard Widgets

```typescript
const DEFAULT_DASHBOARD_WIDGETS = {
  Super_Owner: [
    { type: WidgetType.REVENUE_MTD, order: 1 },
    { type: WidgetType.PROFIT_ESTIMATE, order: 2 },
    { type: WidgetType.CASH_POSITION, order: 3 },
    { type: WidgetType.TOP_BRANCH, order: 4 },
    { type: WidgetType.ALERTS, order: 5 },
  ],
  Branch_Manager: [
    { type: WidgetType.REVENUE_TODAY, order: 1 },
    { type: WidgetType.APPOINTMENTS_TODAY, order: 2 },
    { type: WidgetType.CASH_POSITION, order: 3 },
    { type: WidgetType.STAFF_LEADERBOARD, order: 4 },
    { type: WidgetType.ALERTS, order: 5 },
  ],
  Receptionist: [
    { type: WidgetType.APPOINTMENTS_TODAY, order: 1 },
    { type: WidgetType.WALK_IN_QUEUE, order: 2 },
    { type: WidgetType.PENDING_BILLS, order: 3 },
  ],
  Stylist: [
    { type: WidgetType.MY_APPOINTMENTS, order: 1 },
    { type: WidgetType.MY_EARNINGS, order: 2 },
  ],
  Accountant: [
    { type: WidgetType.REVENUE_MTD, order: 1 },
    { type: WidgetType.PENDING_APPROVALS, order: 2 },
    { type: WidgetType.CASH_POSITION, order: 3 },
  ],
};
```
