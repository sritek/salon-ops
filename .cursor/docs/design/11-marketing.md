# Module 11: Marketing & Engagement - Design Document

## Overview

This module handles marketing configuration, consent management, audience segmentation, campaign management (WhatsApp, SMS, Email), automated lifecycle campaigns, offers/coupons, referral programs, loyalty communication, feedback automation, message templates, scheduling/throttling, and campaign analytics. It integrates with customer CRM, billing, and membership modules.

**Related Requirements:** 11.1 - 11.20

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│Marketing_Config │       │ Customer_Consent│       │    Segment      │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
                                                             │ 1:N
                                                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Campaign     │──────<│Campaign_Recipient│      │ Segment_Rules   │
│                 │  1:N  │                 │       │                 │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Message_Log     │       │    Coupon       │──────<│Coupon_Redemption│
│                 │       │                 │  1:N  │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Trigger_Config  │       │ Message_Template│       │    Referral     │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Database Schema

```sql
-- =====================================================
-- MARKETING CONFIGURATION (Tenant-level settings)
-- =====================================================
CREATE TABLE marketing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,

  -- Feature toggles
  marketing_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,

  -- WhatsApp settings
  whatsapp_provider VARCHAR(50), -- gupshup, twilio, wati, etc.
  whatsapp_api_key_encrypted TEXT,
  whatsapp_business_number VARCHAR(20),
  whatsapp_business_id VARCHAR(100),

  -- SMS settings
  sms_provider VARCHAR(50), -- msg91, twilio, etc.
  sms_api_key_encrypted TEXT,
  sms_sender_id VARCHAR(20),
  sms_fallback_enabled BOOLEAN DEFAULT true, -- Fallback when WhatsApp fails

  -- Email settings
  email_provider VARCHAR(50), -- sendgrid, ses, etc.
  email_api_key_encrypted TEXT,
  email_from_address VARCHAR(255),
  email_from_name VARCHAR(100),

  -- Send time windows
  send_window_start TIME DEFAULT '09:00',
  send_window_end TIME DEFAULT '21:00',

  -- Throttling
  daily_message_limit_per_customer INTEGER DEFAULT 2,
  weekly_message_limit_per_customer INTEGER DEFAULT 5,

  -- Budget
  monthly_budget_limit DECIMAL(10, 2),
  budget_alert_threshold_percent INTEGER DEFAULT 80,

  -- Approval settings
  campaign_approval_required BOOLEAN DEFAULT true,
  campaign_approval_threshold_recipients INTEGER DEFAULT 100,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- BRANCH MARKETING CONFIG
-- =====================================================
CREATE TABLE branch_marketing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID NOT NULL REFERENCES branches(id) UNIQUE,

  marketing_enabled BOOLEAN DEFAULT true,
  monthly_budget_limit DECIMAL(10, 2),
  current_month_spend DECIMAL(10, 2) DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

-- =====================================================
-- CUSTOMER CONSENT
-- =====================================================
CREATE TABLE customer_consent (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id),

-- Channel-specific consent
whatsapp_consent BOOLEAN DEFAULT true,
sms_consent BOOLEAN DEFAULT true,
email_consent BOOLEAN DEFAULT true,

-- DND flags
is_dnd BOOLEAN DEFAULT false, -- National DND registry

-- Overall marketing opt-out
marketing_opted_out BOOLEAN DEFAULT false,
opted_out_at TIMESTAMP,
opt_out_source VARCHAR(50), -- customer_request, unsubscribe_link, manual

-- Preferred channel
preferred_channel VARCHAR(20) DEFAULT 'whatsapp',

-- Language preference
preferred_language VARCHAR(10) DEFAULT 'en', -- en, hi

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(tenant_id, customer_id)
);

CREATE INDEX idx_customer_consent ON customer_consent(customer_id);

-- =====================================================
-- CONSENT HISTORY (Audit trail)
-- =====================================================
CREATE TABLE consent_history (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id),

field_changed VARCHAR(50) NOT NULL,
old_value VARCHAR(100),
new_value VARCHAR(100),
change_source VARCHAR(50) NOT NULL, -- customer, staff, system, unsubscribe
change_reason TEXT,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_consent_history ON consent_history(customer_id, created_at);

-- =====================================================
-- SEGMENTS
-- =====================================================
CREATE TABLE segments (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

name VARCHAR(100) NOT NULL,
description TEXT,

-- Type
segment_type VARCHAR(20) NOT NULL DEFAULT 'custom',
-- system (pre-built), custom

-- Dynamic vs Static
is_dynamic BOOLEAN DEFAULT true,

-- Rules (JSON for flexibility)
rules JSONB NOT NULL DEFAULT '{}',
-- Example: {"operator": "AND", "conditions": [{"field": "last_visit_days", "op": "gt", "value": 30}]}

-- Cached count
customer_count INTEGER DEFAULT 0,
last_refreshed_at TIMESTAMP,

-- Branch scope
branch_ids UUID[], -- NULL = all branches

is_active BOOLEAN DEFAULT true,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_segments ON segments(tenant_id, is_active);

-- =====================================================
-- SEGMENT CUSTOMERS (Cached membership for static/performance)
-- =====================================================
CREATE TABLE segment_customers (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
customer_id UUID NOT NULL REFERENCES customers(id),

added_at TIMESTAMP NOT NULL DEFAULT NOW(),

UNIQUE(segment_id, customer_id)
);

CREATE INDEX idx_segment_customers ON segment_customers(segment_id);
CREATE INDEX idx_segment_customers_customer ON segment_customers(customer_id);

-- =====================================================
-- MESSAGE TEMPLATES
-- =====================================================
CREATE TABLE message_templates (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

name VARCHAR(100) NOT NULL,
description TEXT,

-- Channel
channel VARCHAR(20) NOT NULL, -- whatsapp, sms, email

-- Template type
template_type VARCHAR(30) NOT NULL,
-- promotional, transactional, trigger

-- Content
content_en TEXT NOT NULL, -- English content
content_hi TEXT, -- Hindi content

-- For WhatsApp
whatsapp_template_name VARCHAR(100),
whatsapp_template_status VARCHAR(20), -- pending, approved, rejected
whatsapp_template_id VARCHAR(100),

-- For Email
email_subject_en VARCHAR(255),
email_subject_hi VARCHAR(255),
email_html_content TEXT,

-- Placeholders used
placeholders VARCHAR(100)[], -- ['customer_name', 'offer_details', 'expiry_date']

-- Category
category VARCHAR(50), -- birthday, offer, reminder, feedback, etc.

-- Version tracking
version INTEGER DEFAULT 1,

is_system BOOLEAN DEFAULT false, -- Pre-built templates
is_active BOOLEAN DEFAULT true,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_message_templates ON message_templates(tenant_id, channel, is_active);

-- =====================================================
-- CAMPAIGNS
-- =====================================================
CREATE TABLE campaigns (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

name VARCHAR(100) NOT NULL,
description TEXT,

-- Type
campaign_type VARCHAR(20) NOT NULL,
-- one_time, recurring, trigger

-- Channel
channel VARCHAR(20) NOT NULL, -- whatsapp, sms, email

-- Template
template_id UUID NOT NULL REFERENCES message_templates(id),

-- Audience
segment_id UUID REFERENCES segments(id),
target_all_customers BOOLEAN DEFAULT false,

-- Branch scope
branch_ids UUID[], -- NULL = all branches

-- Schedule
scheduled_at TIMESTAMP,

-- For recurring
recurrence_pattern VARCHAR(20), -- daily, weekly, monthly
recurrence_day INTEGER, -- Day of week (0-6) or day of month (1-31)
recurrence_time TIME,
next_run_at TIMESTAMP,

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'draft',
-- draft, pending_approval, approved, scheduled, sending, sent, paused, cancelled

-- Approval
requires_approval BOOLEAN DEFAULT false,
approved_by UUID REFERENCES users(id),
approved_at TIMESTAMP,
rejected_by UUID REFERENCES users(id),
rejected_at TIMESTAMP,
rejection_reason TEXT,

-- Metrics
total_recipients INTEGER DEFAULT 0,
sent_count INTEGER DEFAULT 0,
delivered_count INTEGER DEFAULT 0,
read_count INTEGER DEFAULT 0,
failed_count INTEGER DEFAULT 0,

-- Cost
estimated_cost DECIMAL(10, 2),
actual_cost DECIMAL(10, 2) DEFAULT 0,

-- Coupon link
coupon_id UUID REFERENCES coupons(id),

-- Execution
started_at TIMESTAMP,
completed_at TIMESTAMP,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_campaigns ON campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at, status);

-- =====================================================
-- CAMPAIGN RECIPIENTS
-- =====================================================
CREATE TABLE campaign_recipients (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
customer_id UUID NOT NULL REFERENCES customers(id),

-- Contact info at send time
phone VARCHAR(20),
email VARCHAR(255),

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'pending',
-- pending, sent, delivered, read, failed, skipped

-- Delivery tracking
sent_at TIMESTAMP,
delivered_at TIMESTAMP,
read_at TIMESTAMP,
failed_at TIMESTAMP,
failure_reason TEXT,

-- Provider reference
provider_message_id VARCHAR(100),

-- Cost
message_cost DECIMAL(6, 4),

-- Retry tracking
retry_count INTEGER DEFAULT 0,
last_retry_at TIMESTAMP,

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_recipients ON campaign_recipients(campaign_id, status);
CREATE INDEX idx_campaign_recipients_customer ON campaign_recipients(customer_id);

-- =====================================================
-- MESSAGE LOG (All messages sent)
-- =====================================================
CREATE TABLE message_log (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
branch_id UUID REFERENCES branches(id),
customer_id UUID NOT NULL REFERENCES customers(id),

-- Message details
channel VARCHAR(20) NOT NULL, -- whatsapp, sms, email
message_type VARCHAR(30) NOT NULL, -- campaign, trigger, transactional

-- Source
campaign_id UUID REFERENCES campaigns(id),
trigger_type VARCHAR(50),

-- Content
template_id UUID REFERENCES message_templates(id),
content_sent TEXT,

-- Contact
recipient_phone VARCHAR(20),
recipient_email VARCHAR(255),

-- Status
status VARCHAR(20) NOT NULL,
-- pending, sent, delivered, read, failed

-- Tracking
sent_at TIMESTAMP,
delivered_at TIMESTAMP,
read_at TIMESTAMP,
failed_at TIMESTAMP,
failure_reason TEXT,

-- Provider
provider VARCHAR(50),
provider_message_id VARCHAR(100),

-- Cost
message_cost DECIMAL(6, 4),

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_log_customer ON message_log(customer_id, created_at);
CREATE INDEX idx_message_log_campaign ON message_log(campaign_id);
CREATE INDEX idx_message_log_date ON message_log(tenant_id, created_at);

-- =====================================================
-- TRIGGER CONFIGURATIONS
-- =====================================================
CREATE TABLE trigger_configs (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

-- Trigger type
trigger_type VARCHAR(50) NOT NULL,
-- post_visit_thank_you, rebooking_reminder, package_expiry,
-- membership_expiry, miss_you, first_visit_followup,
-- birthday_wish, anniversary_wish, feedback_request,
-- loyalty_points_earned, loyalty_points_expiring

-- Configuration
is_enabled BOOLEAN DEFAULT true,

-- Timing
delay_minutes INTEGER DEFAULT 0, -- Delay after trigger event
days_before INTEGER, -- For expiry/birthday triggers
days_after INTEGER, -- For rebooking/miss-you triggers

-- Time window
send_time TIME, -- Specific time to send (NULL = immediate after delay)

-- Template
template_id UUID REFERENCES message_templates(id),

-- Channel preference
channel VARCHAR(20) DEFAULT 'whatsapp',
fallback_channel VARCHAR(20) DEFAULT 'sms',

-- Branch scope
branch_ids UUID[], -- NULL = all branches

-- Deduplication
cooldown_days INTEGER DEFAULT 7, -- Don't send same trigger within X days

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),

UNIQUE(tenant_id, trigger_type)
);

CREATE INDEX idx_trigger_configs ON trigger_configs(tenant_id, is_enabled);

-- =====================================================
-- TRIGGER HISTORY (Prevent duplicates)
-- =====================================================
CREATE TABLE trigger_history (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
customer_id UUID NOT NULL REFERENCES customers(id),
trigger_type VARCHAR(50) NOT NULL,

-- Reference
reference_id UUID, -- appointment_id, package_id, etc.

-- Status
status VARCHAR(20) NOT NULL, -- sent, skipped, failed
skip_reason VARCHAR(100),

message_log_id UUID REFERENCES message_log(id),

triggered_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trigger_history ON trigger_history(customer_id, trigger_type, triggered_at);

-- =====================================================
-- COUPONS
-- =====================================================
CREATE TABLE coupons (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

-- Code
code VARCHAR(50) NOT NULL,
name VARCHAR(100) NOT NULL,
description TEXT,

-- Discount type
discount_type VARCHAR(20) NOT NULL,
-- percentage, flat, free_service
discount_value DECIMAL(10, 2) NOT NULL,

-- For free service
free_service_id UUID REFERENCES services(id),

-- Validity
valid_from DATE NOT NULL,
valid_until DATE NOT NULL,

-- Usage limits
max_total_uses INTEGER, -- NULL = unlimited
max_uses_per_customer INTEGER DEFAULT 1,
current_uses INTEGER DEFAULT 0,

-- Minimum order
min_order_amount DECIMAL(10, 2),
max_discount_amount DECIMAL(10, 2), -- Cap for percentage discounts

-- Restrictions
branch_ids UUID[], -- NULL = all branches
service_ids UUID[], -- NULL = all services
category_ids UUID[], -- NULL = all categories
segment_id UUID REFERENCES segments(id), -- Customer segment restriction

-- Stacking
allow_stacking BOOLEAN DEFAULT false,

-- Status
is_active BOOLEAN DEFAULT true,

-- Campaign link
campaign_id UUID REFERENCES campaigns(id),

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),

UNIQUE(tenant_id, code)
);

CREATE INDEX idx_coupons ON coupons(tenant_id, is_active);
CREATE INDEX idx_coupons_code ON coupons(code);

-- =====================================================
-- COUPON REDEMPTIONS
-- =====================================================
CREATE TABLE coupon_redemptions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
coupon_id UUID NOT NULL REFERENCES coupons(id),
customer_id UUID NOT NULL REFERENCES customers(id),
invoice_id UUID NOT NULL REFERENCES invoices(id),
branch_id UUID NOT NULL REFERENCES branches(id),

-- Discount applied
discount_amount DECIMAL(10, 2) NOT NULL,

redeemed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coupon_redemptions ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_customer ON coupon_redemptions(customer_id);

-- =====================================================
-- REFERRAL PROGRAM CONFIG
-- =====================================================
CREATE TABLE referral_config (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,

is_enabled BOOLEAN DEFAULT true,

-- Referrer reward
referrer_reward_type VARCHAR(20) NOT NULL DEFAULT 'points',
-- points, discount, free_service
referrer_reward_value DECIMAL(10, 2) NOT NULL DEFAULT 100,
referrer_reward_service_id UUID REFERENCES services(id),

-- Referred customer reward
referred_reward_type VARCHAR(20) NOT NULL DEFAULT 'discount',
-- discount, free_service
referred_reward_value DECIMAL(10, 2) NOT NULL DEFAULT 10, -- 10% off
referred_reward_service_id UUID REFERENCES services(id),

-- Anti-fraud
max_referrals_per_month INTEGER DEFAULT 10,
min_order_for_reward DECIMAL(10, 2) DEFAULT 500,

-- Reward timing
reward_on VARCHAR(20) DEFAULT 'first_paid_visit',
-- signup, first_visit, first_paid_visit

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- REFERRALS
-- =====================================================
CREATE TABLE referrals (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),

-- Referrer
referrer_customer_id UUID NOT NULL REFERENCES customers(id),
referral_code VARCHAR(20) NOT NULL,

-- Referred
referred_customer_id UUID REFERENCES customers(id),
referred_phone VARCHAR(20),

-- Status
status VARCHAR(20) NOT NULL DEFAULT 'pending',
-- pending, converted, rewarded, expired, fraud

-- Conversion
converted_at TIMESTAMP,
first_invoice_id UUID REFERENCES invoices(id),
first_invoice_amount DECIMAL(10, 2),

-- Rewards
referrer_rewarded BOOLEAN DEFAULT false,
referrer_reward_at TIMESTAMP,
referrer_reward_type VARCHAR(20),
referrer_reward_value DECIMAL(10, 2),

referred_rewarded BOOLEAN DEFAULT false,
referred_reward_at TIMESTAMP,

-- Fraud check
fraud_flag BOOLEAN DEFAULT false,
fraud_reason TEXT,

created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_customer_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referred ON referrals(referred_customer_id);

-- =====================================================
-- STAFF FOLLOW-UP REMINDERS
-- =====================================================
CREATE TABLE staff_followup_reminders (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
staff_id UUID NOT NULL REFERENCES users(id),
customer_id UUID NOT NULL REFERENCES customers(id),

reminder_date DATE NOT NULL,
reminder_time TIME,

note TEXT,

status VARCHAR(20) DEFAULT 'pending',
-- pending, completed, dismissed

completed_at TIMESTAMP,

created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_followups ON staff_followup_reminders(staff_id, reminder_date, status);

````

---

## TypeScript Types

```typescript
// =====================================================
// ENUMS
// =====================================================
export enum MarketingChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
}

export enum CampaignType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
  TRIGGER = 'trigger',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}
````

export enum MessageStatus {
PENDING = 'pending',
SENT = 'sent',
DELIVERED = 'delivered',
READ = 'read',
FAILED = 'failed',
SKIPPED = 'skipped',
}

export enum MessageType {
CAMPAIGN = 'campaign',
TRIGGER = 'trigger',
TRANSACTIONAL = 'transactional',
}

export enum TemplateType {
PROMOTIONAL = 'promotional',
TRANSACTIONAL = 'transactional',
TRIGGER = 'trigger',
}

export enum WhatsAppTemplateStatus {
PENDING = 'pending',
APPROVED = 'approved',
REJECTED = 'rejected',
}

export enum TriggerType {
POST_VISIT_THANK_YOU = 'post_visit_thank_you',
REBOOKING_REMINDER = 'rebooking_reminder',
PACKAGE_EXPIRY = 'package_expiry',
MEMBERSHIP_EXPIRY = 'membership_expiry',
MISS_YOU = 'miss_you',
FIRST_VISIT_FOLLOWUP = 'first_visit_followup',
BIRTHDAY_WISH = 'birthday_wish',
ANNIVERSARY_WISH = 'anniversary_wish',
FEEDBACK_REQUEST = 'feedback_request',
LOYALTY_POINTS_EARNED = 'loyalty_points_earned',
LOYALTY_POINTS_EXPIRING = 'loyalty_points_expiring',
}

export enum DiscountType {
PERCENTAGE = 'percentage',
FLAT = 'flat',
FREE_SERVICE = 'free_service',
}

export enum ReferralStatus {
PENDING = 'pending',
CONVERTED = 'converted',
REWARDED = 'rewarded',
EXPIRED = 'expired',
FRAUD = 'fraud',
}

export enum RewardType {
POINTS = 'points',
DISCOUNT = 'discount',
FREE_SERVICE = 'free_service',
}

export enum SegmentType {
SYSTEM = 'system',
CUSTOM = 'custom',
}

// =====================================================
// CORE TYPES
// =====================================================
export interface MarketingConfig {
id: string;
tenantId: string;
marketingEnabled: boolean;
whatsappEnabled: boolean;
smsEnabled: boolean;
emailEnabled: boolean;
whatsappProvider?: string;
whatsappBusinessNumber?: string;
smsProvider?: string;
smsSenderId?: string;
smsFallbackEnabled: boolean;
emailProvider?: string;
emailFromAddress?: string;
emailFromName?: string;
sendWindowStart: string;
sendWindowEnd: string;
dailyMessageLimitPerCustomer: number;
weeklyMessageLimitPerCustomer: number;
monthlyBudgetLimit?: number;
budgetAlertThresholdPercent: number;
campaignApprovalRequired: boolean;
campaignApprovalThresholdRecipients: number;
createdAt: Date;
updatedAt: Date;
}

export interface CustomerConsent {
id: string;
tenantId: string;
customerId: string;
whatsappConsent: boolean;
smsConsent: boolean;
emailConsent: boolean;
isDnd: boolean;
marketingOptedOut: boolean;
optedOutAt?: Date;
optOutSource?: string;
preferredChannel: MarketingChannel;
preferredLanguage: string;
createdAt: Date;
updatedAt: Date;
}

export interface Segment {
id: string;
tenantId: string;
name: string;
description?: string;
segmentType: SegmentType;
isDynamic: boolean;
rules: SegmentRules;
customerCount: number;
lastRefreshedAt?: Date;
branchIds?: string[];
isActive: boolean;
createdAt: Date;
updatedAt: Date;
createdBy?: string;
}

export interface SegmentRules {
operator: 'AND' | 'OR';
conditions: SegmentCondition[];
}

export interface SegmentCondition {
field: string; // last_visit_days, visit_count, total_spend, etc.
op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
value: any;
}

export interface MessageTemplate {
id: string;
tenantId: string;
name: string;
description?: string;
channel: MarketingChannel;
templateType: TemplateType;
contentEn: string;
contentHi?: string;
whatsappTemplateName?: string;
whatsappTemplateStatus?: WhatsAppTemplateStatus;
whatsappTemplateId?: string;
emailSubjectEn?: string;
emailSubjectHi?: string;
emailHtmlContent?: string;
placeholders: string[];
category?: string;
version: number;
isSystem: boolean;
isActive: boolean;
createdAt: Date;
updatedAt: Date;
createdBy?: string;
}

export interface Campaign {
id: string;
tenantId: string;
name: string;
description?: string;
campaignType: CampaignType;
channel: MarketingChannel;
templateId: string;
segmentId?: string;
targetAllCustomers: boolean;
branchIds?: string[];
scheduledAt?: Date;
recurrencePattern?: string;
recurrenceDay?: number;
recurrenceTime?: string;
nextRunAt?: Date;
status: CampaignStatus;
requiresApproval: boolean;
approvedBy?: string;
approvedAt?: Date;
rejectedBy?: string;
rejectedAt?: Date;
rejectionReason?: string;
totalRecipients: number;
sentCount: number;
deliveredCount: number;
readCount: number;
failedCount: number;
estimatedCost?: number;
actualCost: number;
couponId?: string;
startedAt?: Date;
completedAt?: Date;
createdAt: Date;
updatedAt: Date;
createdBy?: string;

template?: MessageTemplate;
segment?: Segment;
coupon?: Coupon;
}

export interface CampaignRecipient {
id: string;
tenantId: string;
campaignId: string;
customerId: string;
phone?: string;
email?: string;
status: MessageStatus;
sentAt?: Date;
deliveredAt?: Date;
readAt?: Date;
failedAt?: Date;
failureReason?: string;
providerMessageId?: string;
messageCost?: number;
retryCount: number;
lastRetryAt?: Date;
createdAt: Date;
}

export interface MessageLog {
id: string;
tenantId: string;
branchId?: string;
customerId: string;
channel: MarketingChannel;
messageType: MessageType;
campaignId?: string;
triggerType?: TriggerType;
templateId?: string;
contentSent?: string;
recipientPhone?: string;
recipientEmail?: string;
status: MessageStatus;
sentAt?: Date;
deliveredAt?: Date;
readAt?: Date;
failedAt?: Date;
failureReason?: string;
provider?: string;
providerMessageId?: string;
messageCost?: number;
createdAt: Date;
}

export interface TriggerConfig {
id: string;
tenantId: string;
triggerType: TriggerType;
isEnabled: boolean;
delayMinutes: number;
daysBefore?: number;
daysAfter?: number;
sendTime?: string;
templateId?: string;
channel: MarketingChannel;
fallbackChannel?: MarketingChannel;
branchIds?: string[];
cooldownDays: number;
createdAt: Date;
updatedAt: Date;
createdBy?: string;

template?: MessageTemplate;
}

export interface Coupon {
id: string;
tenantId: string;
code: string;
name: string;
description?: string;
discountType: DiscountType;
discountValue: number;
freeServiceId?: string;
validFrom: string;
validUntil: string;
maxTotalUses?: number;
maxUsesPerCustomer: number;
currentUses: number;
minOrderAmount?: number;
maxDiscountAmount?: number;
branchIds?: string[];
serviceIds?: string[];
categoryIds?: string[];
segmentId?: string;
allowStacking: boolean;
isActive: boolean;
campaignId?: string;
createdAt: Date;
updatedAt: Date;
createdBy?: string;
}

export interface CouponRedemption {
id: string;
tenantId: string;
couponId: string;
customerId: string;
invoiceId: string;
branchId: string;
discountAmount: number;
redeemedAt: Date;
}

export interface ReferralConfig {
id: string;
tenantId: string;
isEnabled: boolean;
referrerRewardType: RewardType;
referrerRewardValue: number;
referrerRewardServiceId?: string;
referredRewardType: RewardType;
referredRewardValue: number;
referredRewardServiceId?: string;
maxReferralsPerMonth: number;
minOrderForReward: number;
rewardOn: string;
createdAt: Date;
updatedAt: Date;
}

export interface Referral {
id: string;
tenantId: string;
referrerCustomerId: string;
referralCode: string;
referredCustomerId?: string;
referredPhone?: string;
status: ReferralStatus;
convertedAt?: Date;
firstInvoiceId?: string;
firstInvoiceAmount?: number;
referrerRewarded: boolean;
referrerRewardAt?: Date;
referrerRewardType?: RewardType;
referrerRewardValue?: number;
referredRewarded: boolean;
referredRewardAt?: Date;
fraudFlag: boolean;
fraudReason?: string;
createdAt: Date;
updatedAt: Date;
}

// =====================================================
// ANALYTICS TYPES
// =====================================================
export interface CampaignAnalytics {
campaignId: string;
campaignName: string;
channel: MarketingChannel;

metrics: {
totalRecipients: number;
sentCount: number;
deliveredCount: number;
readCount: number;
failedCount: number;
deliveryRate: number;
readRate: number;
};

couponMetrics?: {
couponCode: string;
redemptionCount: number;
redemptionRate: number;
revenueGenerated: number;
};

cost: {
totalCost: number;
costPerMessage: number;
roi?: number;
};

period: {
startedAt: Date;
completedAt?: Date;
};
}

export interface CustomerEngagementTimeline {
customerId: string;
events: {
type: 'campaign' | 'trigger' | 'transactional' | 'feedback' | 'coupon';
date: Date;
channel?: MarketingChannel;
campaignName?: string;
triggerType?: TriggerType;
status: MessageStatus;
couponCode?: string;
couponRedeemed?: boolean;
feedbackRating?: number;
}[];
}

```

---

## API Endpoints

### Marketing Configuration

```

GET /api/v1/marketing/config Get marketing config
PATCH /api/v1/marketing/config Update marketing config
GET /api/v1/marketing/config/branch/:id Get branch marketing config
PATCH /api/v1/marketing/config/branch/:id Update branch marketing config

```

### Consent Management

```

GET /api/v1/customers/:id/consent Get customer consent
PATCH /api/v1/customers/:id/consent Update customer consent
POST /api/v1/marketing/opt-out Process opt-out request

```

### Segments

```

GET /api/v1/segments List segments
POST /api/v1/segments Create segment
GET /api/v1/segments/:id Get segment details
PATCH /api/v1/segments/:id Update segment
DELETE /api/v1/segments/:id Delete segment
GET /api/v1/segments/:id/customers Get segment customers
POST /api/v1/segments/:id/refresh Refresh segment membership
GET /api/v1/segments/preview Preview segment with rules

```

```

### Message Templates

```
GET    /api/v1/templates                     List templates
POST   /api/v1/templates                     Create template
GET    /api/v1/templates/:id                 Get template details
PATCH  /api/v1/templates/:id                 Update template
DELETE /api/v1/templates/:id                 Delete template
POST   /api/v1/templates/:id/preview         Preview template with data
POST   /api/v1/templates/whatsapp/submit     Submit WhatsApp template for approval
```

### Campaigns

```
GET    /api/v1/campaigns                     List campaigns
POST   /api/v1/campaigns                     Create campaign
GET    /api/v1/campaigns/:id                 Get campaign details
PATCH  /api/v1/campaigns/:id                 Update campaign
DELETE /api/v1/campaigns/:id                 Delete draft campaign
POST   /api/v1/campaigns/:id/submit          Submit for approval
POST   /api/v1/campaigns/:id/approve         Approve campaign
POST   /api/v1/campaigns/:id/reject          Reject campaign
POST   /api/v1/campaigns/:id/schedule        Schedule campaign
POST   /api/v1/campaigns/:id/send            Send campaign now
POST   /api/v1/campaigns/:id/pause           Pause campaign
POST   /api/v1/campaigns/:id/cancel          Cancel campaign
POST   /api/v1/campaigns/:id/test            Send test message
GET    /api/v1/campaigns/:id/recipients      Get campaign recipients
GET    /api/v1/campaigns/:id/analytics       Get campaign analytics
```

### Triggers

```
GET    /api/v1/triggers                      List trigger configs
PATCH  /api/v1/triggers/:type                Update trigger config
POST   /api/v1/triggers/:type/enable         Enable trigger
POST   /api/v1/triggers/:type/disable        Disable trigger
POST   /api/v1/triggers/:type/test           Test trigger
```

### Coupons

```
GET    /api/v1/coupons                       List coupons
POST   /api/v1/coupons                       Create coupon
GET    /api/v1/coupons/:id                   Get coupon details
PATCH  /api/v1/coupons/:id                   Update coupon
DELETE /api/v1/coupons/:id                   Deactivate coupon
POST   /api/v1/coupons/validate              Validate coupon code
GET    /api/v1/coupons/:id/redemptions       Get coupon redemptions
```

### Referrals

```
GET    /api/v1/referrals/config              Get referral config
PATCH  /api/v1/referrals/config              Update referral config
GET    /api/v1/referrals                     List referrals
GET    /api/v1/customers/:id/referral-code   Get customer's referral code
POST   /api/v1/referrals/apply               Apply referral code
GET    /api/v1/referrals/leaderboard         Get referral leaderboard
```

### Customer Engagement

```
GET    /api/v1/customers/:id/timeline        Get engagement timeline
GET    /api/v1/customers/:id/messages        Get messages sent to customer
```

### Staff Tools

```
GET    /api/v1/staff/followups               Get staff follow-up reminders
POST   /api/v1/staff/followups               Create follow-up reminder
PATCH  /api/v1/staff/followups/:id           Update follow-up
DELETE /api/v1/staff/followups/:id           Delete follow-up
GET    /api/v1/staff/inactive-customers      Get staff's inactive customers
```

### Analytics

```
GET    /api/v1/marketing/analytics           Get marketing analytics
GET    /api/v1/marketing/analytics/campaigns Get campaign performance
GET    /api/v1/marketing/analytics/channels  Get channel performance
GET    /api/v1/marketing/analytics/spend     Get spend summary
```

---

## Request/Response Schemas

### Create Segment

```typescript
// POST /api/v1/segments
interface CreateSegmentRequest {
  name: string;
  description?: string;
  rules: SegmentRules;
  branchIds?: string[];
}

interface CreateSegmentResponse {
  success: boolean;
  data: {
    segment: Segment;
    customerCount: number;
  };
}
```

### Create Campaign

```typescript
// POST /api/v1/campaigns
interface CreateCampaignRequest {
  name: string;
  description?: string;
  campaignType: CampaignType;
  channel: MarketingChannel;
  templateId: string;

  // Audience
  segmentId?: string;
  targetAllCustomers?: boolean;
  branchIds?: string[];

  // Schedule (for one_time)
  scheduledAt?: string; // ISO datetime

  // Recurrence (for recurring)
  recurrencePattern?: string;
  recurrenceDay?: number;
  recurrenceTime?: string;

  // Coupon
  couponId?: string;
}

interface CreateCampaignResponse {
  success: boolean;
  data: {
    campaign: Campaign;
    estimatedRecipients: number;
    estimatedCost: number;
    requiresApproval: boolean;
  };
}
```

### Send Campaign

```typescript
// POST /api/v1/campaigns/:id/send
interface SendCampaignRequest {
  // Optional: override scheduled time
  sendNow?: boolean;
}

interface SendCampaignResponse {
  success: boolean;
  data: {
    campaign: Campaign;
    recipientsQueued: number;
    estimatedCompletionTime: string;
  };
}
```

### Create Coupon

```typescript
// POST /api/v1/coupons
interface CreateCouponRequest {
  code?: string; // Auto-generate if not provided
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  freeServiceId?: string;
  validFrom: string;
  validUntil: string;
  maxTotalUses?: number;
  maxUsesPerCustomer?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  branchIds?: string[];
  serviceIds?: string[];
  categoryIds?: string[];
  segmentId?: string;
  allowStacking?: boolean;
}

interface CreateCouponResponse {
  success: boolean;
  data: {
    coupon: Coupon;
  };
}
```

### Validate Coupon

```typescript
// POST /api/v1/coupons/validate
interface ValidateCouponRequest {
  code: string;
  customerId: string;
  branchId: string;
  serviceIds?: string[];
  orderAmount: number;
}

interface ValidateCouponResponse {
  success: boolean;
  data: {
    valid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    invalidReason?: string;
    // 'expired', 'max_uses_reached', 'customer_limit_reached',
    // 'min_order_not_met', 'branch_not_eligible', 'service_not_eligible',
    // 'segment_not_eligible', 'opted_out'
  };
}
```

### Apply Referral

```typescript
// POST /api/v1/referrals/apply
interface ApplyReferralRequest {
  referralCode: string;
  referredPhone: string;
  referredName?: string;
}

interface ApplyReferralResponse {
  success: boolean;
  data: {
    referral: Referral;
    referredCustomer: Customer;
    referredReward?: {
      type: RewardType;
      value: number;
      description: string;
    };
  };
}
```

### Update Trigger Config

```typescript
// PATCH /api/v1/triggers/:type
interface UpdateTriggerConfigRequest {
  isEnabled?: boolean;
  delayMinutes?: number;
  daysBefore?: number;
  daysAfter?: number;
  sendTime?: string;
  templateId?: string;
  channel?: MarketingChannel;
  fallbackChannel?: MarketingChannel;
  branchIds?: string[];
  cooldownDays?: number;
}

interface UpdateTriggerConfigResponse {
  success: boolean;
  data: {
    triggerConfig: TriggerConfig;
  };
}
```

### Preview Template

```typescript
// POST /api/v1/templates/:id/preview
interface PreviewTemplateRequest {
  customerId?: string; // Use real customer data
  sampleData?: Record<string, string>; // Or provide sample data
  language?: "en" | "hi";
}

interface PreviewTemplateResponse {
  success: boolean;
  data: {
    preview: string;
    placeholdersUsed: string[];
    characterCount: number;
    smsSegments?: number; // For SMS
  };
}
```

---

## Business Logic

### 1. Campaign Service

```typescript
class CampaignService {
  /**
   * Create campaign with validation
   */
  async createCampaign(
    data: CreateCampaignRequest,
    userId: string
  ): Promise<CreateCampaignResponse> {
    // 1. Validate template exists and matches channel
    const template = await this.templateRepo.findById(data.templateId);
    if (template.channel !== data.channel) {
      throw new MarketingError('TEMPLATE_CHANNEL_MISMATCH',
        'Template channel does not match campaign channel');
    }

    // 2. For WhatsApp, ensure template is approved
    if (data.channel === MarketingChannel.WHATSAPP &&
        template.whatsappTemplateStatus !== WhatsAppTemplateStatus.APPROVED) {
      throw new MarketingError('WHATSAPP_TEMPLATE_NOT_APPROVED',
        'WhatsApp template must be approved before use');
    }

    // 3. Calculate estimated recipients
    const estimatedRecipients = await this.calculateRecipients(data);

    // 4. Calculate estimated cost
    const estimatedCost = await this.calculateCost(data.channel, estimatedRecipients);

    // 5. Check budget
    await this.checkBudget(data.branchIds, estimatedCost);

    // 6. Determine if approval required
    const config = await this.getMarketingConfig();
    const requiresApproval = config.campaignApprovalRequired &&
      estimatedRecipients >= config.campaignApprovalThresholdRecipients;

    // 7. Create campaign
    const campaign = await this.campaignRepo.create({
      ...data,
      status: CampaignStatus.DRAFT,
      requiresApproval,
      totalRecipients: estimatedRecipients,
      estimatedCost,
      createdBy: userId,
    });

    return {
      success: true,
      data: {
        campaign,
        estimatedRecipients,
        estimatedCost,
        requiresApproval,
      },
    };
  }
```

/\*\*

- Send campaign
  \*/
  async sendCampaign(
  campaignId: string,
  userId: string
  ): Promise<SendCampaignResponse> {
  const campaign = await this.campaignRepo.findById(campaignId);

  // Validate status
  if (![CampaignStatus.APPROVED, CampaignStatus.SCHEDULED].includes(campaign.status)) {
  throw new MarketingError('INVALID_CAMPAIGN_STATUS',
  'Campaign must be approved or scheduled to send');
  }

  // Update status
  await this.campaignRepo.update(campaignId, {
  status: CampaignStatus.SENDING,
  startedAt: new Date(),
  });

  // Get recipients
  const recipients = await this.getEligibleRecipients(campaign);

  // Create recipient records
  await this.createRecipientRecords(campaignId, recipients);

  // Queue messages for sending
  await this.queueCampaignMessages(campaign, recipients);

  return {
  success: true,
  data: {
  campaign: await this.campaignRepo.findById(campaignId),
  recipientsQueued: recipients.length,
  estimatedCompletionTime: this.estimateCompletionTime(recipients.length),
  },
  };

}

/\*\*

- Get eligible recipients (respecting consent and throttling)
  \*/
  private async getEligibleRecipients(campaign: Campaign): Promise<Customer[]> {
  // Get segment customers or all customers
  let customers: Customer[];
  if (campaign.segmentId) {
  customers = await this.segmentService.getCustomers(campaign.segmentId);
  } else if (campaign.targetAllCustomers) {
  customers = await this.customerRepo.findAll(campaign.branchIds);
  } else {
  return [];
  }

  // Filter by consent
  const eligibleCustomers = [];
  for (const customer of customers) {
  const consent = await this.consentService.getConsent(customer.id);

      // Check marketing opt-out
      if (consent.marketingOptedOut) continue;

      // Check channel consent
      if (campaign.channel === MarketingChannel.WHATSAPP && !consent.whatsappConsent) continue;
      if (campaign.channel === MarketingChannel.SMS && !consent.smsConsent) continue;
      if (campaign.channel === MarketingChannel.EMAIL && !consent.emailConsent) continue;

      // Check DND
      if (consent.isDnd && campaign.channel === MarketingChannel.SMS) continue;

      // Check throttling
      const canSend = await this.throttleService.canSendMessage(customer.id);
      if (!canSend) continue;

      eligibleCustomers.push(customer);

  }

  return eligibleCustomers;

}
}

```

```

### 2. Trigger Service

```typescript
class TriggerService {
  /**
   * Process triggers (called by scheduler)
   */
  async processTriggers(): Promise<void> {
    const enabledTriggers = await this.triggerConfigRepo.findEnabled();

    for (const trigger of enabledTriggers) {
      try {
        await this.processTrigger(trigger);
      } catch (error) {
        this.logger.error("Trigger processing failed", {
          triggerType: trigger.triggerType,
          error,
        });
      }
    }
  }

  /**
   * Process single trigger type
   */
  private async processTrigger(config: TriggerConfig): Promise<void> {
    switch (config.triggerType) {
      case TriggerType.POST_VISIT_THANK_YOU:
        await this.processPostVisitTrigger(config);
        break;
      case TriggerType.REBOOKING_REMINDER:
        await this.processRebookingTrigger(config);
        break;
      case TriggerType.BIRTHDAY_WISH:
        await this.processBirthdayTrigger(config);
        break;
      case TriggerType.PACKAGE_EXPIRY:
        await this.processPackageExpiryTrigger(config);
        break;
      case TriggerType.MISS_YOU:
        await this.processMissYouTrigger(config);
        break;
      case TriggerType.FEEDBACK_REQUEST:
        await this.processFeedbackTrigger(config);
        break;
      // ... other triggers
    }
  }

  /**
   * Post-visit thank you trigger
   */
  private async processPostVisitTrigger(config: TriggerConfig): Promise<void> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - config.delayMinutes);

    // Get completed appointments within delay window
    const appointments =
      await this.appointmentRepo.findCompletedSince(cutoffTime);

    for (const appointment of appointments) {
      // Check if already triggered
      const alreadyTriggered = await this.hasTriggered(
        appointment.customerId,
        TriggerType.POST_VISIT_THANK_YOU,
        appointment.id,
      );
      if (alreadyTriggered) continue;

      // Check consent
      const canSend = await this.canSendTrigger(appointment.customerId, config);
      if (!canSend) {
        await this.recordTriggerSkipped(
          appointment.customerId,
          config.triggerType,
          "no_consent",
        );
        continue;
      }

      // Send message
      await this.sendTriggerMessage(config, appointment.customer, {
        appointment,
        stylist: appointment.stylist,
      });

      // Record trigger
      await this.recordTriggerSent(
        appointment.customerId,
        config.triggerType,
        appointment.id,
      );
    }
  }

  /**
   * Birthday wish trigger
   */
  private async processBirthdayTrigger(config: TriggerConfig): Promise<void> {
    const targetDate = new Date();
    if (config.daysBefore) {
      targetDate.setDate(targetDate.getDate() + config.daysBefore);
    }

    // Get customers with birthday on target date
    const customers = await this.customerRepo.findByBirthday(
      targetDate.getMonth() + 1,
      targetDate.getDate(),
    );

    for (const customer of customers) {
      // Check cooldown
      const lastTrigger = await this.getLastTrigger(
        customer.id,
        TriggerType.BIRTHDAY_WISH,
      );
      if (
        lastTrigger &&
        this.isWithinCooldown(lastTrigger, config.cooldownDays)
      ) {
        continue;
      }

      // Check consent and send
      const canSend = await this.canSendTrigger(customer.id, config);
      if (!canSend) continue;

      await this.sendTriggerMessage(config, customer, {});
      await this.recordTriggerSent(customer.id, config.triggerType);
    }
  }
}
```

### 3. Segment Service

```typescript
class SegmentService {
  /**
   * Evaluate segment rules and get customers
   */
  async getCustomers(segmentId: string): Promise<Customer[]> {
    const segment = await this.segmentRepo.findById(segmentId);

    if (!segment.isDynamic) {
      // Return cached customers for static segments
      return this.segmentCustomerRepo.findBySegment(segmentId);
    }

    // Evaluate rules dynamically
    return this.evaluateRules(segment.rules, segment.branchIds);
  }

  /**
   * Evaluate segment rules
   */
  private async evaluateRules(
    rules: SegmentRules,
    branchIds?: string[],
  ): Promise<Customer[]> {
    const query = this.buildQuery(rules, branchIds);
    return this.customerRepo.findByQuery(query);
  }

  /**
   * Build SQL query from rules
   */
  private buildQuery(rules: SegmentRules, branchIds?: string[]): QueryBuilder {
    const qb = this.customerRepo.createQueryBuilder("c");

    // Add branch filter
    if (branchIds?.length) {
      qb.andWhere("c.branch_id IN (:...branchIds)", { branchIds });
    }

    // Build conditions
    const conditions = rules.conditions.map((cond) =>
      this.buildCondition(cond),
    );

    if (rules.operator === "AND") {
      conditions.forEach((cond) => qb.andWhere(cond.sql, cond.params));
    } else {
      qb.andWhere(
        new Brackets((qb) => {
          conditions.forEach((cond, i) => {
            if (i === 0) qb.where(cond.sql, cond.params);
            else qb.orWhere(cond.sql, cond.params);
          });
        }),
      );
    }

    return qb;
  }

  /**
   * Build single condition
   */
  private buildCondition(condition: SegmentCondition): {
    sql: string;
    params: object;
  } {
    const { field, op, value } = condition;

    switch (field) {
      case "last_visit_days":
        return this.buildLastVisitCondition(op, value);
      case "visit_count":
        return this.buildVisitCountCondition(op, value);
      case "total_spend":
        return this.buildTotalSpendCondition(op, value);
      case "membership_status":
        return this.buildMembershipCondition(op, value);
      case "has_package":
        return this.buildPackageCondition(op, value);
      case "tags":
        return this.buildTagsCondition(op, value);
      default:
        throw new Error(`Unknown segment field: ${field}`);
    }
  }

  /**
   * Refresh segment customer count
   */
  async refreshSegment(segmentId: string): Promise<number> {
    const customers = await this.getCustomers(segmentId);

    await this.segmentRepo.update(segmentId, {
      customerCount: customers.length,
      lastRefreshedAt: new Date(),
    });

    return customers.length;
  }
}
```

### 4. Coupon Service

```typescript
class CouponService {
  /**
   * Validate coupon for use
   */
  async validateCoupon(
    request: ValidateCouponRequest,
  ): Promise<ValidateCouponResponse> {
    const { code, customerId, branchId, serviceIds, orderAmount } = request;

    // Find coupon
    const coupon = await this.couponRepo.findByCode(code);
    if (!coupon || !coupon.isActive) {
      return {
        success: true,
        data: { valid: false, invalidReason: "invalid_code" },
      };
    }

    // Check validity period
    const today = new Date().toISOString().split("T")[0];
    if (today < coupon.validFrom || today > coupon.validUntil) {
      return {
        success: true,
        data: { valid: false, invalidReason: "expired" },
      };
    }

    // Check total uses
    if (coupon.maxTotalUses && coupon.currentUses >= coupon.maxTotalUses) {
      return {
        success: true,
        data: { valid: false, invalidReason: "max_uses_reached" },
      };
    }

    // Check customer uses
    const customerUses = await this.redemptionRepo.countByCustomer(
      coupon.id,
      customerId,
    );
    if (customerUses >= coupon.maxUsesPerCustomer) {
      return {
        success: true,
        data: { valid: false, invalidReason: "customer_limit_reached" },
      };
    }

    // Check minimum order
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return {
        success: true,
        data: { valid: false, invalidReason: "min_order_not_met" },
      };
    }

    // Check branch eligibility
    if (coupon.branchIds?.length && !coupon.branchIds.includes(branchId)) {
      return {
        success: true,
        data: { valid: false, invalidReason: "branch_not_eligible" },
      };
    }

    // Check service eligibility
    if (coupon.serviceIds?.length && serviceIds) {
      const hasEligibleService = serviceIds.some((s) =>
        coupon.serviceIds.includes(s),
      );
      if (!hasEligibleService) {
        return {
          success: true,
          data: { valid: false, invalidReason: "service_not_eligible" },
        };
      }
    }

    // Check segment eligibility
    if (coupon.segmentId) {
      const inSegment = await this.segmentService.isCustomerInSegment(
        customerId,
        coupon.segmentId,
      );
      if (!inSegment) {
        return {
          success: true,
          data: { valid: false, invalidReason: "segment_not_eligible" },
        };
      }
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(coupon, orderAmount);

    return {
      success: true,
      data: {
        valid: true,
        coupon,
        discountAmount,
      },
    };
  }

  /**
   * Calculate discount amount
   */
  private calculateDiscount(coupon: Coupon, orderAmount: number): number {
    let discount = 0;

    switch (coupon.discountType) {
      case DiscountType.PERCENTAGE:
        discount = orderAmount * (coupon.discountValue / 100);
        break;
      case DiscountType.FLAT:
        discount = coupon.discountValue;
        break;
      case DiscountType.FREE_SERVICE:
        // Handled separately in billing
        discount = 0;
        break;
    }

    // Apply max discount cap
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }

    // Don't exceed order amount
    if (discount > orderAmount) {
      discount = orderAmount;
    }

    return Math.round(discount * 100) / 100;
  }

  /**
   * Record coupon redemption
   */
  async recordRedemption(
    couponId: string,
    customerId: string,
    invoiceId: string,
    branchId: string,
    discountAmount: number,
  ): Promise<void> {
    await this.redemptionRepo.create({
      couponId,
      customerId,
      invoiceId,
      branchId,
      discountAmount,
    });

    // Increment usage count
    await this.couponRepo.incrementUses(couponId);
  }
}
```

### 5. Referral Service

```typescript
class ReferralService {
  /**
   * Generate referral code for customer
   */
  async getOrCreateReferralCode(customerId: string): Promise<string> {
    // Check if customer already has a code
    const existing = await this.referralRepo.findByReferrer(customerId);
    if (existing.length > 0) {
      return existing[0].referralCode;
    }

    // Generate unique code
    const customer = await this.customerRepo.findById(customerId);
    const code = this.generateCode(customer.name);

    return code;
  }

  /**
   * Apply referral code for new customer
   */
  async applyReferralCode(
    referralCode: string,
    referredPhone: string,
    referredName?: string,
  ): Promise<ApplyReferralResponse> {
    // Find referrer
    const referrerReferral = await this.referralRepo.findByCode(referralCode);
    if (!referrerReferral) {
      throw new MarketingError(
        "INVALID_REFERRAL_CODE",
        "Referral code not found",
      );
    }

    const referrerId = referrerReferral.referrerCustomerId;

    // Check anti-fraud: self-referral
    const referrer = await this.customerRepo.findById(referrerId);
    if (referrer.phone === referredPhone) {
      throw new MarketingError("SELF_REFERRAL", "Cannot refer yourself");
    }

    // Check anti-fraud: monthly limit
    const config = await this.getReferralConfig();
    const monthlyReferrals =
      await this.referralRepo.countMonthlyReferrals(referrerId);
    if (monthlyReferrals >= config.maxReferralsPerMonth) {
      throw new MarketingError(
        "REFERRAL_LIMIT_REACHED",
        "Monthly referral limit reached",
      );
    }

    // Check if phone already referred
    const existingReferral =
      await this.referralRepo.findByReferredPhone(referredPhone);
    if (existingReferral) {
      throw new MarketingError(
        "ALREADY_REFERRED",
        "This phone number has already been referred",
      );
    }

    // Create or find referred customer
    let referredCustomer = await this.customerRepo.findByPhone(referredPhone);
    if (!referredCustomer) {
      referredCustomer = await this.customerRepo.create({
        phone: referredPhone,
        name: referredName || "New Customer",
        source: "referral",
      });
    }

    // Create referral record
    const referral = await this.referralRepo.create({
      referrerCustomerId: referrerId,
      referralCode,
      referredCustomerId: referredCustomer.id,
      referredPhone,
      status: ReferralStatus.PENDING,
    });

    // Get referred customer reward
    const referredReward = this.getReferredReward(config);

    return {
      success: true,
      data: {
        referral,
        referredCustomer,
        referredReward,
      },
    };
  }

  /**
   * Process referral reward after first paid visit
   */
  async processReferralReward(
    referredCustomerId: string,
    invoiceId: string,
    invoiceAmount: number,
  ): Promise<void> {
    const referral = await this.referralRepo.findByReferred(referredCustomerId);
    if (!referral || referral.status !== ReferralStatus.PENDING) {
      return;
    }

    const config = await this.getReferralConfig();

    // Check minimum order
    if (invoiceAmount < config.minOrderForReward) {
      return;
    }

    // Update referral status
    await this.referralRepo.update(referral.id, {
      status: ReferralStatus.CONVERTED,
      convertedAt: new Date(),
      firstInvoiceId: invoiceId,
      firstInvoiceAmount: invoiceAmount,
    });

    // Credit referrer reward
    await this.creditReferrerReward(referral, config);

    // Send notification to referrer
    await this.notifyReferrer(referral);
  }
}
```

### 6. Message Sender Service

```typescript
class MessageSenderService {
  /**
   * Send message via appropriate channel
   */
  async sendMessage(
    customer: Customer,
    template: MessageTemplate,
    data: Record<string, any>,
    options: {
      channel: MarketingChannel;
      fallbackChannel?: MarketingChannel;
      campaignId?: string;
      triggerType?: TriggerType;
    },
  ): Promise<MessageLog> {
    // Check send window
    if (!this.isWithinSendWindow()) {
      throw new MarketingError(
        "OUTSIDE_SEND_WINDOW",
        "Cannot send messages outside configured hours",
      );
    }

    // Get consent
    const consent = await this.consentService.getConsent(customer.id);

    // Determine language
    const language = consent.preferredLanguage || "en";

    // Render template
    const content = this.renderTemplate(template, data, language);

    // Send via channel
    let result: SendResult;
    try {
      result = await this.sendViaChannel(
        options.channel,
        customer,
        content,
        template,
      );
    } catch (error) {
      // Try fallback channel
      if (options.fallbackChannel) {
        result = await this.sendViaChannel(
          options.fallbackChannel,
          customer,
          content,
          template,
        );
      } else {
        throw error;
      }
    }

    // Log message
    const messageLog = await this.messageLogRepo.create({
      customerId: customer.id,
      channel: result.channel,
      messageType: options.campaignId
        ? MessageType.CAMPAIGN
        : options.triggerType
          ? MessageType.TRIGGER
          : MessageType.TRANSACTIONAL,
      campaignId: options.campaignId,
      triggerType: options.triggerType,
      templateId: template.id,
      contentSent: content,
      recipientPhone: customer.phone,
      recipientEmail: customer.email,
      status: result.status,
      sentAt: result.sentAt,
      provider: result.provider,
      providerMessageId: result.messageId,
      messageCost: result.cost,
    });

    // Update throttle tracking
    await this.throttleService.recordMessage(customer.id);

    return messageLog;
  }

  /**
   * Send via specific channel
   */
  private async sendViaChannel(
    channel: MarketingChannel,
    customer: Customer,
    content: string,
    template: MessageTemplate,
  ): Promise<SendResult> {
    switch (channel) {
      case MarketingChannel.WHATSAPP:
        return this.whatsappProvider.send(
          customer.phone,
          template.whatsappTemplateName,
          content,
        );
      case MarketingChannel.SMS:
        return this.smsProvider.send(customer.phone, content);
      case MarketingChannel.EMAIL:
        return this.emailProvider.send(
          customer.email,
          template.emailSubjectEn,
          template.emailHtmlContent || content,
        );
    }
  }

  /**
   * Render template with data
   */
  private renderTemplate(
    template: MessageTemplate,
    data: Record<string, any>,
    language: string,
  ): string {
    const content =
      language === "hi" && template.contentHi
        ? template.contentHi
        : template.contentEn;

    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
}
```

---

## Validation Schemas

```typescript
import { z } from "zod";

// Segment
export const createSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  rules: z.object({
    operator: z.enum(["AND", "OR"]),
    conditions: z
      .array(
        z.object({
          field: z.string(),
          op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte", "in", "contains"]),
          value: z.any(),
        }),
      )
      .min(1),
  }),
  branchIds: z.array(z.string().uuid()).optional(),
});
```

// Campaign
export const createCampaignSchema = z.object({
name: z.string().min(1).max(100),
description: z.string().optional(),
campaignType: z.nativeEnum(CampaignType),
channel: z.nativeEnum(MarketingChannel),
templateId: z.string().uuid(),
segmentId: z.string().uuid().optional(),
targetAllCustomers: z.boolean().default(false),
branchIds: z.array(z.string().uuid()).optional(),
scheduledAt: z.string().datetime().optional(),
recurrencePattern: z.enum(['daily', 'weekly', 'monthly']).optional(),
recurrenceDay: z.number().int().min(0).max(31).optional(),
recurrenceTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
couponId: z.string().uuid().optional(),
}).refine(
(data) => data.segmentId || data.targetAllCustomers,
{ message: 'Either segmentId or targetAllCustomers must be specified' }
);

// Coupon
export const createCouponSchema = z.object({
code: z.string().max(50).optional(),
name: z.string().min(1).max(100),
description: z.string().optional(),
discountType: z.nativeEnum(DiscountType),
discountValue: z.number().positive(),
freeServiceId: z.string().uuid().optional(),
validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
maxTotalUses: z.number().int().positive().optional(),
maxUsesPerCustomer: z.number().int().positive().default(1),
minOrderAmount: z.number().min(0).optional(),
maxDiscountAmount: z.number().positive().optional(),
branchIds: z.array(z.string().uuid()).optional(),
serviceIds: z.array(z.string().uuid()).optional(),
categoryIds: z.array(z.string().uuid()).optional(),
segmentId: z.string().uuid().optional(),
allowStacking: z.boolean().default(false),
}).refine(
(data) => new Date(data.validFrom) <= new Date(data.validUntil),
{ message: 'validFrom must be before or equal to validUntil' }
);

// Template
export const createTemplateSchema = z.object({
name: z.string().min(1).max(100),
description: z.string().optional(),
channel: z.nativeEnum(MarketingChannel),
templateType: z.nativeEnum(TemplateType),
contentEn: z.string().min(1),
contentHi: z.string().optional(),
whatsappTemplateName: z.string().optional(),
emailSubjectEn: z.string().optional(),
emailSubjectHi: z.string().optional(),
emailHtmlContent: z.string().optional(),
category: z.string().optional(),
});

// Trigger config
export const updateTriggerConfigSchema = z.object({
isEnabled: z.boolean().optional(),
delayMinutes: z.number().int().min(0).optional(),
daysBefore: z.number().int().min(0).optional(),
daysAfter: z.number().int().min(0).optional(),
sendTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
templateId: z.string().uuid().optional(),
channel: z.nativeEnum(MarketingChannel).optional(),
fallbackChannel: z.nativeEnum(MarketingChannel).optional(),
branchIds: z.array(z.string().uuid()).optional(),
cooldownDays: z.number().int().min(0).optional(),
});

````

---

## Integration Points

### 1. Customer Module Integration

```typescript
interface CustomerMarketingIntegration {
  // Get customer for messaging
  getCustomer(customerId: string): Promise<Customer>;

  // Get customers by birthday
  findByBirthday(month: number, day: number): Promise<Customer[]>;

  // Get inactive customers
  findInactive(days: number, branchIds?: string[]): Promise<Customer[]>;

  // Update customer source on referral
  updateSource(customerId: string, source: string): Promise<void>;
}
````

### 2. Billing Module Integration

```typescript
interface BillingMarketingIntegration {
  // Validate and apply coupon
  applyCoupon(invoiceId: string, couponCode: string): Promise<void>;

  // Get invoice for referral processing
  getInvoice(invoiceId: string): Promise<Invoice>;

  // Listen for invoice finalized (for referral rewards)
  onInvoiceFinalized(invoiceId: string): Promise<void>;
}
```

### 3. Appointment Module Integration

```typescript
interface AppointmentMarketingIntegration {
  // Get completed appointments for triggers
  findCompletedSince(since: Date): Promise<Appointment[]>;

  // Listen for appointment completion
  onAppointmentCompleted(appointmentId: string): Promise<void>;
}
```

### 4. Membership/Package Module Integration

```typescript
interface MembershipMarketingIntegration {
  // Get expiring memberships/packages
  findExpiringMemberships(
    daysUntilExpiry: number,
  ): Promise<CustomerMembership[]>;
  findExpiringPackages(daysUntilExpiry: number): Promise<CustomerPackage[]>;
}
```

### 5. Loyalty Module Integration

```typescript
interface LoyaltyMarketingIntegration {
  // Credit referral points
  creditPoints(
    customerId: string,
    points: number,
    reason: string,
  ): Promise<void>;

  // Get expiring points for notification
  findExpiringPoints(
    daysUntilExpiry: number,
  ): Promise<{ customerId: string; points: number }[]>;
}
```

---

## Event Emissions

```typescript
// Campaign Events
'campaign.created'        -> { campaign: Campaign, userId: string }
'campaign.approved'       -> { campaign: Campaign, userId: string }
'campaign.rejected'       -> { campaign: Campaign, reason: string, userId: string }
'campaign.sent'           -> { campaign: Campaign, recipientCount: number }
'campaign.completed'      -> { campaign: Campaign, metrics: CampaignMetrics }

// Message Events
'message.sent'            -> { messageLog: MessageLog }
'message.delivered'       -> { messageLogId: string }
'message.read'            -> { messageLogId: string }
'message.failed'          -> { messageLogId: string, reason: string }

// Trigger Events
'trigger.fired'           -> { triggerType: TriggerType, customerId: string }
'trigger.skipped'         -> { triggerType: TriggerType, customerId: string, reason: string }

// Coupon Events
'coupon.created'          -> { coupon: Coupon, userId: string }
'coupon.redeemed'         -> { couponId: string, customerId: string, invoiceId: string }
'coupon.exhausted'        -> { coupon: Coupon }

// Referral Events
'referral.created'        -> { referral: Referral }
'referral.converted'      -> { referral: Referral }
'referral.rewarded'       -> { referral: Referral, referrerId: string }

// Consent Events
'consent.updated'         -> { customerId: string, field: string, oldValue: any, newValue: any }
'consent.opted_out'       -> { customerId: string, source: string }
```

---

## Error Handling

```typescript
export enum MarketingErrorCode {
  // Config errors
  MARKETING_DISABLED = "MARKETING_001",
  CHANNEL_DISABLED = "MARKETING_002",

  // Consent errors
  NO_CONSENT = "MARKETING_010",
  OPTED_OUT = "MARKETING_011",
  DND_REGISTERED = "MARKETING_012",

  // Campaign errors
  INVALID_CAMPAIGN_STATUS = "MARKETING_020",
  TEMPLATE_CHANNEL_MISMATCH = "MARKETING_021",
  WHATSAPP_TEMPLATE_NOT_APPROVED = "MARKETING_022",
  BUDGET_EXCEEDED = "MARKETING_023",

  // Coupon errors
  INVALID_COUPON_CODE = "MARKETING_030",
  COUPON_EXPIRED = "MARKETING_031",
  COUPON_MAX_USES = "MARKETING_032",
  COUPON_CUSTOMER_LIMIT = "MARKETING_033",
  COUPON_MIN_ORDER = "MARKETING_034",
  COUPON_NOT_ELIGIBLE = "MARKETING_035",

  // Referral errors
  INVALID_REFERRAL_CODE = "MARKETING_040",
  SELF_REFERRAL = "MARKETING_041",
  REFERRAL_LIMIT_REACHED = "MARKETING_042",
  ALREADY_REFERRED = "MARKETING_043",

  // Send errors
  OUTSIDE_SEND_WINDOW = "MARKETING_050",
  THROTTLE_LIMIT = "MARKETING_051",
  PROVIDER_ERROR = "MARKETING_052",
}

export class MarketingError extends Error {
  constructor(
    public code: MarketingErrorCode,
    message: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "MarketingError";
  }
}
```

---

## Testing Considerations

### Unit Tests

```typescript
describe("CampaignService", () => {
  describe("createCampaign", () => {
    it("should create campaign with valid data");
    it("should validate template channel matches");
    it("should require WhatsApp template approval");
    it("should calculate estimated recipients");
    it("should check budget limits");
    it("should determine approval requirement");
  });

  describe("sendCampaign", () => {
    it("should filter recipients by consent");
    it("should respect throttling limits");
    it("should queue messages for sending");
  });
});

describe("TriggerService", () => {
  describe("processTriggers", () => {
    it("should process post-visit trigger");
    it("should process birthday trigger");
    it("should respect cooldown period");
    it("should skip opted-out customers");
  });
});

describe("CouponService", () => {
  describe("validateCoupon", () => {
    it("should validate coupon code");
    it("should check validity period");
    it("should check usage limits");
    it("should check minimum order");
    it("should check branch eligibility");
    it("should check segment eligibility");
    it("should calculate discount correctly");
  });
});

describe("ReferralService", () => {
  describe("applyReferralCode", () => {
    it("should apply valid referral code");
    it("should prevent self-referral");
    it("should enforce monthly limit");
    it("should prevent duplicate referrals");
  });

  describe("processReferralReward", () => {
    it("should credit referrer reward");
    it("should check minimum order");
    it("should update referral status");
  });
});

describe("SegmentService", () => {
  describe("evaluateRules", () => {
    it("should evaluate AND conditions");
    it("should evaluate OR conditions");
    it("should filter by last visit days");
    it("should filter by total spend");
    it("should filter by membership status");
  });
});
```

### Integration Tests

```typescript
describe("Marketing Integration", () => {
  it("should send campaign to segment");
  it("should trigger post-visit message");
  it("should validate and redeem coupon");
  it("should process referral reward on first visit");
  it("should respect consent across all channels");
});
```

---

## Performance Considerations

### Database Indexes

```sql
-- Campaign queries
CREATE INDEX idx_campaigns_status ON campaigns(tenant_id, status, scheduled_at);

-- Message log queries
CREATE INDEX idx_message_log_customer_date ON message_log(customer_id, created_at);
CREATE INDEX idx_message_log_campaign ON message_log(campaign_id, status);

-- Coupon queries
CREATE INDEX idx_coupons_code ON coupons(code) WHERE is_active = true;
CREATE INDEX idx_coupon_redemptions_customer ON coupon_redemptions(customer_id, coupon_id);

-- Referral queries
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referred ON referrals(referred_customer_id, status);

-- Trigger history
CREATE INDEX idx_trigger_history_lookup ON trigger_history(customer_id, trigger_type, triggered_at);
```

### Caching Strategy

```typescript
// Cache marketing config (rarely changes)
const MARKETING_CONFIG_CACHE_TTL = 3600; // 1 hour

// Cache customer consent (check frequently)
const CONSENT_CACHE_TTL = 300; // 5 minutes

// Cache segment customer count
const SEGMENT_COUNT_CACHE_TTL = 600; // 10 minutes

// Cache coupon validation (short TTL)
const COUPON_CACHE_TTL = 60; // 1 minute
```

### Message Queue

```typescript
// Use message queue for campaign sending
// Prevents blocking and handles rate limits

interface CampaignMessageJob {
  campaignId: string;
  recipientId: string;
  customerId: string;
  priority: number;
}

// Queue configuration
const CAMPAIGN_QUEUE = "campaign-messages";
const MAX_CONCURRENT_SENDS = 50;
const RATE_LIMIT_PER_SECOND = 10;
```

---

## Security Considerations

### Access Control

```typescript
const MARKETING_PERMISSIONS = {
  // View only
  "campaign.view": [
    "Receptionist",
    "Branch_Manager",
    "Regional_Manager",
    "Super_Owner",
  ],

  // Campaign management
  "campaign.create": ["Branch_Manager", "Regional_Manager", "Super_Owner"],
  "campaign.approve": ["Regional_Manager", "Super_Owner"],
  "campaign.send": ["Branch_Manager", "Regional_Manager", "Super_Owner"],

  // Template management
  "template.manage": ["Branch_Manager", "Regional_Manager", "Super_Owner"],

  // Coupon management
  "coupon.manage": ["Branch_Manager", "Regional_Manager", "Super_Owner"],

  // Segment management
  "segment.manage": ["Branch_Manager", "Regional_Manager", "Super_Owner"],

  // Referral config
  "referral.config": ["Super_Owner"],

  // Budget config
  "budget.config": ["Super_Owner"],

  // Consent management
  "consent.update": ["Branch_Manager", "Regional_Manager", "Super_Owner"],
};
```

### Data Protection

```typescript
// Encrypt API keys
const ENCRYPTED_FIELDS = ["whatsapp_api_key", "sms_api_key", "email_api_key"];

// Audit all consent changes
// Audit all campaign sends
// Retain audit logs for 2 years

// Mask phone numbers in logs
function maskPhone(phone: string): string {
  return phone.slice(0, 4) + "****" + phone.slice(-2);
}
```

---

## Scheduled Jobs

```typescript
// Trigger processing
'*/5 * * * *'   -> processTriggers()              // Every 5 minutes

// Campaign scheduling
'* * * * *'     -> processScheduledCampaigns()    // Every minute

// Recurring campaigns
'0 * * * *'     -> processRecurringCampaigns()    // Every hour

// Segment refresh
'0 */6 * * *'   -> refreshAllSegments()           // Every 6 hours

// Delivery status updates
'*/2 * * * *'   -> updateDeliveryStatuses()       // Every 2 minutes

// Budget reset
'0 0 1 * *'     -> resetMonthlyBudgets()          // 1st of month

// Cleanup
'0 3 * * *'     -> cleanupOldMessageLogs()        // Daily at 3 AM
```

---

## Pre-built Segments

```typescript
const SYSTEM_SEGMENTS = [
  {
    name: "New Customers",
    rules: {
      operator: "AND",
      conditions: [{ field: "visit_count", op: "eq", value: 1 }],
    },
  },
  {
    name: "Repeat Customers",
    rules: {
      operator: "AND",
      conditions: [{ field: "visit_count", op: "gt", value: 1 }],
    },
  },
  {
    name: "Inactive Customers (30+ days)",
    rules: {
      operator: "AND",
      conditions: [{ field: "last_visit_days", op: "gt", value: 30 }],
    },
  },
  {
    name: "High-Value Customers",
    rules: {
      operator: "AND",
      conditions: [{ field: "total_spend", op: "gt", value: 10000 }],
    },
  },
  {
    name: "Package Holders",
    rules: {
      operator: "AND",
      conditions: [{ field: "has_active_package", op: "eq", value: true }],
    },
  },
  {
    name: "Members",
    rules: {
      operator: "AND",
      conditions: [{ field: "has_active_membership", op: "eq", value: true }],
    },
  },
  {
    name: "Birthday This Month",
    rules: {
      operator: "AND",
      conditions: [{ field: "birthday_month", op: "eq", value: "current" }],
    },
  },
];
```

---

## Default Trigger Configurations

```typescript
const DEFAULT_TRIGGER_CONFIGS = [
  {
    triggerType: TriggerType.POST_VISIT_THANK_YOU,
    isEnabled: true,
    delayMinutes: 120, // 2 hours after visit
    channel: MarketingChannel.WHATSAPP,
    cooldownDays: 1,
  },
  {
    triggerType: TriggerType.REBOOKING_REMINDER,
    isEnabled: true,
    daysAfter: 30,
    channel: MarketingChannel.WHATSAPP,
    cooldownDays: 7,
  },
  {
    triggerType: TriggerType.BIRTHDAY_WISH,
    isEnabled: true,
    daysBefore: 0, // On birthday
    sendTime: "09:00",
    channel: MarketingChannel.WHATSAPP,
    cooldownDays: 365,
  },
  {
    triggerType: TriggerType.FEEDBACK_REQUEST,
    isEnabled: true,
    delayMinutes: 60, // 1 hour after visit
    channel: MarketingChannel.WHATSAPP,
    cooldownDays: 7,
  },
  {
    triggerType: TriggerType.PACKAGE_EXPIRY,
    isEnabled: true,
    daysBefore: 7,
    channel: MarketingChannel.WHATSAPP,
    cooldownDays: 7,
  },
  {
    triggerType: TriggerType.MISS_YOU,
    isEnabled: false, // Disabled by default
    daysAfter: 60,
    channel: MarketingChannel.WHATSAPP,
    cooldownDays: 30,
  },
];
```
