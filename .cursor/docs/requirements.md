# Requirements Document

## Introduction

This document defines the requirements for a multi-tenant Salon Management SaaS platform. The system enables salon businesses to manage their daily operations, customers, staff, and finances through a centralized software solution. The platform supports multi-branch businesses with shared customer data and transferable staff.

This document will be built incrementally, module by module, starting with the foundational Tenant/Salon Management module.

## Glossary

- **Platform**: The overall SaaS application that hosts multiple businesses
- **Tenant**: A salon company/brand that may have one or more branches (isolation unit in multi-tenant architecture)
- **Business**: Synonym for Tenant - the salon brand entity
- **Branch**: A physical location of a business with its own address, working hours, staff assignments, and inventory
- **Super_Owner**: The business owner who has full administrative access to all branches, settings, and subscription management
- **Regional_Manager**: A manager who oversees multiple branches within a region
- **Branch_Manager**: A staff member with elevated permissions to manage a specific branch
- **Receptionist**: A staff member who handles appointments, billing, and customer check-in
- **Stylist**: A service provider (hairdresser, beautician) who performs services for customers
- **Accountant**: A staff member with access to financial reports, expenses, and billing data
- **Customer**: A person who receives services at any branch of a business
- **Subscription**: The billing plan that determines feature access and pricing for a business
- **Staff_Pool**: The collection of all staff members belonging to a business, assignable to branches
- **Audit_Log**: A record of sensitive actions performed in the system for compliance and debugging
- **Appointment**: A scheduled or walk-in booking for one or more services at a branch
- **Time_Slot**: A specific time period during which a stylist can serve a customer
- **Token**: A unique number assigned to walk-in customers for queue management
- **No_Show**: When a customer fails to arrive for their scheduled appointment
- **Prepaid_Only**: A customer flag requiring advance payment for online bookings due to repeated no-shows
- **Grace_Period**: The time window after scheduled appointment time before marking a customer as late
- **Buffer_Time**: Configurable gap between appointments for cleanup or preparation
- **Price_Lock**: Preserving the service price at booking time regardless of later price changes
- **Guest_Checkout**: A transaction where customer provides only name without creating a profile
- **Loyalty_Points**: Reward points earned by customers based on spending, redeemable for discounts
- **Referral**: When an existing customer brings a new customer to the salon
- **Customer_Tag**: Labels used to segment customers (VIP, Regular, New, Inactive, custom tags)
- **Customer_Wallet**: Prepaid balance maintained by a customer for future payments
- **Lifetime_Value**: Total amount spent by a customer across all visits
- **Soft_Delete**: Deactivating a record without permanently removing it from the database
- **Service_Category**: Top-level grouping of services (e.g., Hair, Skin, Nails)
- **Sub_Category**: Second-level grouping under a category (e.g., Hair → Cutting, Coloring)
- **Active_Time**: Duration when stylist is actively working on a service
- **Processing_Time**: Duration when service is settling/drying and stylist can serve others
- **Combo_Service**: A bundled package of multiple services offered at a discounted price
- **HSN_SAC_Code**: GST classification codes for goods (HSN) and services (SAC)
- **Add_On_Service**: A supplementary service that can be added to a parent service
- **Service_Commission**: Percentage or flat amount paid to staff for performing a service
- **Consumable**: Inventory item used during service delivery (e.g., shampoo, color)
- **Invoice**: Official document issued to customer after payment with transaction details
- **Credit_Note**: Document issued for refunds, linked to original invoice for GST compliance
- **CGST**: Central Goods and Services Tax (central government's share)
- **SGST**: State Goods and Services Tax (state government's share)
- **IGST**: Integrated Goods and Services Tax (for inter-state transactions)
- **Day_Closure**: End-of-day process to reconcile cash and finalize transactions
- **Cash_Drawer**: Physical or virtual container tracking cash transactions
- **Shift**: A defined work period for staff (e.g., morning shift 9 AM - 3 PM)
- **Overtime**: Hours worked beyond assigned shift, often compensated at higher rate
- **EMI**: Equated Monthly Installment - fixed monthly deduction for loan repayment
- **Payslip**: Document showing salary breakdown (earnings, deductions, net pay)
- **Commission_Split**: Division of commission between primary stylist and assistant(s)
- **FIFO**: First In First Out - inventory valuation method using oldest stock first
- **FOC**: Free of Cost - complimentary items given by vendors
- **Reorder_Level**: Minimum stock quantity that triggers reorder alert
- **Dead_Stock**: Inventory items not consumed or sold for extended period
- **Shrinkage**: Loss of inventory due to theft, damage, or errors
- **Membership**: Long-term subscription plan offering ongoing benefits (discounts, priority booking)
- **Package**: Prepaid bundle of services or value purchased in advance at discounted rate
- **Service_Credit**: Unit representing one service entitlement in a package
- **Grace_Period**: Time after expiry during which benefits can still be used
- **Membership_Freeze**: Temporary pause of membership with validity extension
- **Financial_Year**: Accounting period for tax purposes (April-March in India)
- **Direct_Expense**: Costs directly related to service delivery (consumables, commissions)
- **Indirect_Expense**: Overhead costs not tied to specific services (rent, utilities)
- **Capital_Expense**: One-time purchases of assets (equipment, furniture)
- **Operational_Expense**: Recurring costs of running the business (salaries, rent)
- **Petty_Cash**: Small cash fund for minor daily expenses
- **Period_Close**: Locking a month's financial data from further edits
- **Opening_Balance**: Starting balances when initializing the system
- **GST_Input**: GST paid on purchases, claimable as credit against GST collected
- **Cash_Flow**: Movement of money in and out of the business
- **P&L**: Profit and Loss statement showing revenue minus expenses
- **Budget_Variance**: Difference between planned budget and actual spending
- **Data_Snapshot**: Point-in-time copy of metrics for historical reporting accuracy
- **Staff_Utilization**: Percentage of available working hours that are booked with appointments
- **Churn_Risk**: Likelihood that a customer will stop visiting the salon
- **Package_Liability**: Value of prepaid packages/memberships not yet redeemed (deferred revenue)
- **Drill_Down**: Navigating from summary metrics to detailed underlying data
- **Anomaly_Alert**: Automated notification when metrics deviate significantly from normal
- **Marketing_Consent**: Customer's permission to receive promotional messages
- **DND_Flag**: Do Not Disturb compliance marker preventing marketing messages
- **Dynamic_Segment**: Customer group that auto-updates based on defined rules
- **Lifecycle_Campaign**: Automated marketing triggered by customer events (visit, inactivity, birthday)
- **Trigger_Campaign**: Marketing message sent automatically when specific event occurs
- **Frequency_Cap**: Maximum number of marketing messages a customer can receive in a period
- **Throttling**: Controlling message send rate to prevent spam and respect limits
- **Referral_Code**: Unique code for customers to share and earn rewards for new customer acquisition
- **Engagement_Timeline**: Chronological history of all communications with a customer
- **Online_Booking**: Customer self-service appointment booking via web interface
- **Booking_Page**: Public-facing web page where customers can book appointments
- **Slot_Lock**: Temporary reservation of a time slot while customer completes booking
- **Abandonment**: When a customer starts but doesn't complete the booking process
- **Conversion_Rate**: Percentage of booking page visitors who complete a booking
- **Prepayment**: Advance payment collected during online booking to confirm appointment

---

## Module 1: Tenant/Salon Management

### Requirement 1.1: Business Registration

**User Story:** As a salon owner, I want to register my business on the platform, so that I can start using the salon management software.

#### Acceptance Criteria

1. WHEN a new user visits the registration page, THE Platform SHALL display a registration form requesting business name, owner name, email, phone number, and password
2. WHEN a user submits valid registration details, THE Platform SHALL create a new Business account and Owner user account
3. WHEN a user submits a registration with an email already in use, THE Platform SHALL reject the registration and display an appropriate error message
4. WHEN a Business account is created, THE Platform SHALL automatically start a 30-day free trial period
5. WHEN registration is successful, THE Platform SHALL prompt the user to create their first Branch

---

### Requirement 1.2: User Authentication

**User Story:** As a platform user, I want to securely log in with my credentials, so that I can access my business data.

#### Acceptance Criteria

1. WHEN a user visits the login page, THE Platform SHALL display a login form requesting username/email and password
2. WHEN a user submits valid credentials, THE Platform SHALL authenticate the user and redirect them to their dashboard
3. WHEN a user submits invalid credentials, THE Platform SHALL reject the login and display an error message without revealing which field was incorrect
4. WHEN a user is authenticated, THE Platform SHALL create a secure session with appropriate expiration
5. WHEN a user clicks logout, THE Platform SHALL terminate the session and redirect to the login page
6. THE Platform SHALL store passwords using secure hashing algorithms (bcrypt or similar)
7. WHEN a user forgets their password, THE Platform SHALL provide a password reset flow via email

---

### Requirement 1.3: Branch Management

**User Story:** As a business owner, I want to add and manage multiple branches, so that I can operate my salon business across different locations.

#### Acceptance Criteria

1. WHEN an Owner accesses branch management, THE Platform SHALL display a list of all branches under the business
2. WHEN an Owner creates a new branch, THE Platform SHALL collect branch name, address, phone number, email, and working hours
3. WHEN a branch is created, THE Platform SHALL allow configuration of timezone and currency for that branch
4. WHEN an Owner edits a branch, THE Platform SHALL allow updating all branch details including working hours and holidays
5. WHEN an Owner deactivates a branch, THE Platform SHALL hide the branch from active operations while preserving historical data
6. THE Platform SHALL allow each branch to have its own logo, contact information, and GST number
7. WHEN viewing branch details, THE Platform SHALL display the branch-specific settings and assigned staff count

---

### Requirement 1.4: Branch Configuration

**User Story:** As a business owner, I want to configure each branch independently, so that each location can operate according to its specific needs.

#### Acceptance Criteria

1. WHEN configuring a branch, THE Platform SHALL allow setting daily working hours for each day of the week
2. WHEN configuring a branch, THE Platform SHALL allow marking specific dates as holidays
3. WHEN configuring a branch, THE Platform SHALL allow setting the timezone (default: Asia/Kolkata)
4. WHEN configuring a branch, THE Platform SHALL allow setting the currency (default: INR)
5. WHEN configuring a branch, THE Platform SHALL allow uploading a branch-specific logo
6. WHEN configuring a branch, THE Platform SHALL allow setting GST registration details (GSTIN, legal name)
7. WHEN a branch configuration is updated, THE Platform SHALL apply changes immediately to all relevant operations

---

### Requirement 1.5: Staff Pool Management

**User Story:** As a business owner, I want to manage all staff at the business level and assign them to branches, so that I can flexibly deploy staff across locations.

#### Acceptance Criteria

1. WHEN an Super_Owner or Regional_Manager creates a staff member, THE Platform SHALL add them to the Business-level Staff_Pool
2. WHEN creating a staff member, THE Platform SHALL collect name, phone, email, role, and create login credentials
3. WHEN a staff member is created, THE Platform SHALL require assignment to at least one branch
4. WHEN assigning staff to branches, THE Platform SHALL allow a staff member to be assigned to multiple branches
5. WHEN transferring staff, THE Platform SHALL allow changing branch assignments without losing historical data
6. WHEN viewing the Staff_Pool, THE Platform SHALL display all staff with their current branch assignments
7. WHEN a staff member is deactivated, THE Platform SHALL revoke their login access while preserving their historical records

---

### Requirement 1.6: Role-Based Access Control

**User Story:** As a business owner, I want to assign roles with specific permissions to staff, so that each person can only access features relevant to their job.

#### Acceptance Criteria

1. THE Platform SHALL support six roles: Super_Owner, Regional_Manager, Branch_Manager, Receptionist, Stylist, and Accountant
2. THE Platform SHALL assign exactly one role per user (no multi-role per user)
3. WHEN a user with Super_Owner role logs in, THE Platform SHALL grant access to all features including subscription management, all branches, business settings, and staff management across the entire tenant
4. WHEN a user with Regional_Manager role logs in, THE Platform SHALL grant access to multiple assigned branches including staff management, appointments, billing, reports, and branch settings for those branches
5. WHEN a user with Branch_Manager role logs in, THE Platform SHALL grant access to a single assigned branch including staff scheduling, appointments, billing, reports, and day-to-day operations
6. WHEN a user with Receptionist role logs in, THE Platform SHALL grant access to appointments, billing, customer check-in, and basic customer management for assigned branches
7. WHEN a user with Stylist role logs in, THE Platform SHALL grant access to view their own appointments, mark services as complete, and view their commission summary
8. WHEN a user with Accountant role logs in, THE Platform SHALL grant access to financial reports, expense management, billing history, and GST reports for assigned branches
9. WHEN a user attempts to access a feature outside their permissions, THE Platform SHALL deny access and display an appropriate message
10. THE Platform SHALL allow Super_Owner to modify role assignments for any staff member

---

### Requirement 1.7: Subscription Management

**User Story:** As a business owner, I want to manage my subscription plan, so that I can access features appropriate for my business size.

#### Acceptance Criteria

1. WHEN a new Business is registered, THE Platform SHALL automatically assign a 30-day free trial with full feature access
2. WHEN the trial period ends, THE Platform SHALL prompt the Super_Owner to select a subscription plan
3. THE Platform SHALL support monthly and annual billing cycles
4. WHEN annual billing is selected, THE Platform SHALL apply a discount (2 months free)
5. WHEN a Super_Owner views subscription details, THE Platform SHALL display current plan, billing cycle, next billing date, and payment history
6. WHEN a Super_Owner upgrades their plan, THE Platform SHALL apply the new plan immediately and prorate charges
7. WHEN a Super_Owner downgrades their plan, THE Platform SHALL apply the change at the next billing cycle
8. WHEN a subscription payment fails, THE Platform SHALL notify the Super_Owner and provide a grace period before restricting access
9. IF a subscription expires without renewal, THEN THE Platform SHALL restrict access to read-only mode while preserving all data

---

### Requirement 1.8: Subscription Plan Constraints

**User Story:** As a platform operator, I want to enforce plan-based limits, so that businesses use features according to their subscription tier.

#### Acceptance Criteria

1. THE Platform SHALL enforce maximum number of branches allowed per subscription plan
2. THE Platform SHALL enforce maximum number of users allowed per subscription plan
3. WHEN a Business attempts to create a branch exceeding their plan limit, THE Platform SHALL block the action and prompt for plan upgrade
4. WHEN a Business attempts to add a user exceeding their plan limit, THE Platform SHALL block the action and prompt for plan upgrade
5. THE Platform SHALL support feature toggles per subscription plan (e.g., advanced reports, marketing module)
6. WHEN a feature is disabled for a plan, THE Platform SHALL hide or disable the feature in the UI and block API access
7. THE Platform SHALL display current usage vs plan limits in the subscription dashboard

---

### Requirement 1.9: Business Profile & Branding

**User Story:** As a business owner, I want to maintain my business profile and branding, so that my brand information is consistent across the platform and customer-facing documents.

#### Acceptance Criteria

1. WHEN a Super_Owner accesses business settings, THE Platform SHALL display the business profile with all editable fields
2. THE Platform SHALL store business-level information including: business name, legal entity name, owner details, primary contact, business type, and logo
3. THE Platform SHALL store branding settings including: logo, invoice header, invoice footer, and default color theme
4. WHEN the business profile is updated, THE Platform SHALL reflect changes across all branches where applicable
5. THE Platform SHALL allow setting a primary branch for the business
6. WHEN viewing the business profile, THE Platform SHALL display aggregate statistics (total branches, total staff, total customers)
7. THE Platform SHALL allow configuring WhatsApp sender ID for business-wide notifications (future use)
8. THE Platform SHALL allow setting default service categories at the tenant level (branches can override)

---

### Requirement 1.10: Dashboard Theme Customization

**User Story:** As a salon manager, I want to customize the dashboard theme, so that the interface reflects my brand identity and provides a personalized experience for my staff.

#### Acceptance Criteria

1. THE Platform SHALL provide 7 preset themes: Indigo Night (default), Rose Gold, Ocean Breeze, Forest Calm, Sunset Glow, Midnight Purple, and Classic Professional
2. THE Platform SHALL allow Manager+ roles to select a preset theme or create a custom theme using a color picker
3. THE Platform SHALL support Light, Dark, and System (auto-detect) appearance modes
4. THE Platform SHALL allow theme customization at the tenant level (applies to all branches by default)
5. THE Platform SHALL allow branch-level theme override (Branch_Manager can set a different theme for their branch)
6. THE Platform SHALL allow individual users to set their own theme preference (overrides tenant/branch default)
7. WHEN a user logs in, THE Platform SHALL apply theme in order of precedence: User preference > Branch setting > Tenant setting > Default
8. THE Platform SHALL store theme settings using CSS variables for consistent application across all dashboard pages
9. THE Platform SHALL keep booking page theme separate from dashboard theme (configured in online booking settings)
10. WHEN theme settings are changed, THE Platform SHALL apply changes immediately without requiring page refresh

---

### Requirement 1.11: Audit Logging

**User Story:** As a business owner, I want sensitive actions to be logged, so that I can track changes and investigate issues when needed.

#### Acceptance Criteria

1. THE Platform SHALL log all sensitive actions with tenant ID, branch ID, user ID, timestamp, action type, and changed values
2. THE Platform SHALL log the following sensitive actions: price changes, bill edits, bill deletions, discount applications, commission rate changes, staff role changes, and refund processing
3. WHEN an audit log entry is created, THE Platform SHALL store the old value and new value for changed fields
4. THE Platform SHALL retain audit logs for a minimum of 2 years
5. WHEN a Super_Owner or Accountant accesses audit logs, THE Platform SHALL display logs with filtering by date range, branch, user, and action type
6. THE Platform SHALL make audit logs read-only (no editing or deletion by any user)
7. THE Platform SHALL include IP address and device information in audit log entries where available

---

### Requirement 1.12: Data Isolation & Security

**User Story:** As a platform operator, I want strict data isolation between tenants, so that no business can ever access another business's data.

#### Acceptance Criteria

1. THE Platform SHALL enforce tenant-based row filtering at the database/API level for all queries
2. THE Platform SHALL enforce branch-based filtering for branch-specific data (inventory, appointments, attendance)
3. THE Platform SHALL implement soft deletes with tenant scope (deleted records remain isolated to their tenant)
4. THE Platform SHALL never rely on frontend/UI filtering for data isolation
5. WHEN a user queries data, THE Platform SHALL automatically scope the query to their tenant and authorized branches
6. THE Platform SHALL log any data access attempts that cross tenant boundaries as security incidents
7. THE Platform SHALL encrypt sensitive data at rest (passwords, payment information)

---

## Module 2: Appointment Management

### Requirement 2.1: Appointment Creation

**User Story:** As a receptionist, I want to create appointments for customers, so that I can schedule their salon visits efficiently.

#### Acceptance Criteria

1. WHEN creating an appointment, THE Platform SHALL collect customer details, branch, date, time, and selected services
2. WHEN creating an appointment, THE Platform SHALL allow selecting a preferred stylist (optional)
3. WHEN creating an appointment, THE Platform SHALL allow selecting stylist gender preference (male/female/no preference)
4. IF no stylist is selected, THEN THE Platform SHALL auto-assign the next available stylist matching gender preference at the scheduled time
5. THE Platform SHALL support booking multiple services in a single appointment
6. WHEN multiple services are selected, THE Platform SHALL calculate total duration by summing individual service durations
7. THE Platform SHALL support three appointment types: Online (customer self-booking), Phone (receptionist creates on call), and Walk-in (offline)
8. WHEN a walk-in customer arrives, THE Platform SHALL create an appointment with type "Walk-in" and assign a token number
9. THE Platform SHALL display all appointment types (Online, Phone, Walk-in) in the same calendar view
10. THE Platform SHALL prevent double-booking a stylist for overlapping time slots (no overbooking allowed)
11. WHEN a time slot is unavailable, THE Platform SHALL display the next available slot for the selected stylist or branch
12. WHEN an appointment is created, THE Platform SHALL lock the service prices at booking time

---

### Requirement 2.2: Appointment Calendar Views

**User Story:** As a branch manager, I want to view appointments in different calendar formats, so that I can manage daily operations effectively.

#### Acceptance Criteria

1. THE Platform SHALL provide a daily calendar view showing all appointments for a branch
2. THE Platform SHALL provide a weekly calendar view showing appointments across 7 days
3. THE Platform SHALL provide a monthly calendar view showing appointment counts per day
4. WHEN viewing the calendar, THE Platform SHALL allow filtering by stylist
5. WHEN viewing the calendar, THE Platform SHALL color-code appointments by status (Booked, Confirmed, In Progress, Completed, Cancelled, No Show)
6. THE Platform SHALL display appointment details (customer name, services, duration) on hover or click
7. WHEN a stylist views the calendar, THE Platform SHALL show only their own appointments by default

---

### Requirement 2.3: Time Slot Management

**User Story:** As a branch manager, I want the system to manage time slots based on service duration, so that appointments don't overlap.

#### Acceptance Criteria

1. THE Platform SHALL calculate available time slots based on service duration (not fixed intervals)
2. WHEN a service of 45 minutes is booked at 10:00 AM, THE Platform SHALL block the stylist until 10:45 AM
3. THE Platform SHALL consider buffer time between appointments if configured by the branch
4. WHEN checking availability, THE Platform SHALL respect branch working hours and holidays
5. WHEN checking availability, THE Platform SHALL respect stylist break times and blocked slots
6. THE Platform SHALL prevent booking outside branch working hours
7. WHEN a stylist is on leave, THE Platform SHALL not show them as available for that day

---

### Requirement 2.4: Stylist Availability Management

**User Story:** As a branch manager, I want to manage stylist availability, so that appointments are only booked when stylists are actually available.

#### Acceptance Criteria

1. THE Platform SHALL allow Branch_Manager or higher roles to set stylist working hours per day
2. THE Platform SHALL allow configuring predefined break times (lunch, tea break) for stylists
3. THE Platform SHALL allow Branch_Manager or higher roles to block specific time slots for a stylist (personal time, training, etc.)
4. WHEN a stylist is marked on leave, THE Platform SHALL block all their slots for that day
5. THE Platform SHALL display stylist availability status (Available, On Break, Busy, On Leave) in real-time
6. WHEN viewing stylist schedule, THE Platform SHALL show booked slots, break times, and blocked slots distinctly
7. THE Platform SHALL store stylist gender for gender-preference matching during booking
8. THE Platform SHALL allow skill-level tagging for stylists (Junior, Senior, Expert) for skill-based assignment
9. WHEN auto-assigning stylists, THE Platform SHALL consider gender preference, skill level, and current workload

---

### Requirement 2.5: Appointment Lifecycle & Status

**User Story:** As a receptionist, I want to track appointment status, so that I can manage the customer flow efficiently.

#### Acceptance Criteria

1. THE Platform SHALL support the following appointment statuses: Booked, Confirmed, Checked-in, In Progress, Completed, Cancelled, No Show, Rescheduled
2. WHEN an appointment is created, THE Platform SHALL set status to "Booked"
3. WHEN a customer confirms via reminder response, THE Platform SHALL update status to "Confirmed"
4. WHEN a customer arrives at the salon, THE Platform SHALL allow updating status to "Checked-in"
5. WHEN service begins, THE Platform SHALL allow updating status to "In Progress"
6. WHEN services are completed, THE Platform SHALL allow updating status to "Completed"
7. WHEN a customer cancels, THE Platform SHALL update status to "Cancelled", record cancellation reason, and free the time slot
8. WHEN a salon cancels an appointment, THE Platform SHALL update status to "Cancelled", mark it as salon-initiated, and notify the customer
9. WHEN a customer doesn't show up after grace period, THE Platform SHALL allow marking status as "No Show"
10. WHEN an appointment is rescheduled, THE Platform SHALL update status to "Rescheduled" and create a new linked appointment
11. THE Platform SHALL log all status changes with timestamp and user who made the change

---

### Requirement 2.6: Appointment Rescheduling

**User Story:** As a customer, I want to reschedule my appointment, so that I can adjust to changes in my schedule.

#### Acceptance Criteria

1. THE Platform SHALL allow rescheduling an appointment to a different date/time
2. THE Platform SHALL allow rescheduling a maximum of 3 times per appointment
3. WHEN rescheduling limit is reached, THE Platform SHALL block further rescheduling and display a message
4. WHEN an appointment is rescheduled, THE Platform SHALL free the original time slot
5. WHEN an appointment is rescheduled, THE Platform SHALL send a notification to the customer with new details
6. THE Platform SHALL log each reschedule with old and new date/time in the appointment history
7. WHEN rescheduling, THE Platform SHALL apply the same availability rules as new bookings

---

### Requirement 2.7: No-Show Policy & Enforcement

**User Story:** As a salon owner, I want to enforce a no-show policy, so that customers respect their appointments and reduce revenue loss.

#### Acceptance Criteria

1. THE Platform SHALL track no-show count per customer
2. WHEN a customer has their first no-show, THE Platform SHALL send a warning notification via WhatsApp and record it in the customer profile
3. WHEN a customer has their second no-show, THE Platform SHALL flag the customer as "Prepaid Only" requiring advance payment for future online bookings
4. WHEN a "Prepaid Only" customer books online, THE Platform SHALL require full payment at booking time (refundable if cancelled before appointment)
5. WHEN a customer has their third no-show, THE Platform SHALL block online bookings for that customer (walk-ins only)
6. WHEN a customer is blocked from online bookings, THE Platform SHALL display a message explaining the restriction
7. THE Platform SHALL allow Branch_Manager or higher roles to unblock a customer and reset their no-show count
8. WHEN a customer is unblocked, THE Platform SHALL create an audit log entry with the reason and approving user

---

### Requirement 2.8: Appointment Reminders & Notifications

**User Story:** As a salon owner, I want automated reminders sent to customers, so that they don't forget their appointments.

#### Acceptance Criteria

1. THE Platform SHALL send an appointment reminder 1 day before the scheduled time via WhatsApp
2. THE Platform SHALL send an appointment reminder 1 hour before the scheduled time via WhatsApp
3. THE Platform SHALL send a confirmation request 30 minutes before the appointment via WhatsApp or automated AI call
4. WHEN an appointment is created, THE Platform SHALL send a booking confirmation notification
5. WHEN an appointment is rescheduled, THE Platform SHALL send a notification with updated details
6. WHEN an appointment is cancelled, THE Platform SHALL send a cancellation confirmation
7. THE Platform SHALL allow configuring reminder timing at the branch level
8. THE Platform SHALL log all sent notifications with delivery status

---

### Requirement 2.9: Walk-in Queue Management

**User Story:** As a receptionist, I want to manage walk-in customers with a queue system, so that customers are served fairly and efficiently.

#### Acceptance Criteria

1. WHEN a walk-in customer arrives, THE Platform SHALL generate a unique token number for that branch and day
2. THE Platform SHALL maintain a queue of walk-in customers per branch
3. WHEN a walk-in has no stylist preference, THE Platform SHALL assign the next available stylist
4. THE Platform SHALL calculate and display estimated wait time based on current queue and ongoing appointments
5. THE Platform SHALL support a display screen mode showing current token being served and estimated wait times
6. WHEN a stylist becomes available, THE Platform SHALL notify the receptionist to call the next customer in queue
7. THE Platform SHALL allow customers to leave the queue (mark as "Left Without Service")
8. WHEN a walk-in customer is called, THE Platform SHALL convert their queue entry to an active appointment

---

### Requirement 2.10: Queue Display Screen

**User Story:** As a salon owner, I want a display screen in my salon showing queue status, so that customers can see their position and wait time.

#### Acceptance Criteria

1. THE Platform SHALL provide a dedicated display screen view for branch waiting areas
2. THE Platform SHALL display currently serving token numbers per stylist/station
3. THE Platform SHALL display upcoming token numbers in queue
4. THE Platform SHALL display estimated wait time for customers in queue
5. THE Platform SHALL auto-refresh the display in real-time as appointments progress
6. THE Platform SHALL allow customizing the display with branch logo and branding
7. THE Platform SHALL support full-screen mode for TV/monitor display
8. WHEN a token is called, THE Platform SHALL highlight it on the display with visual/audio notification (optional)

---

### Requirement 2.11: Appointment Configuration Settings

**User Story:** As a branch manager, I want to configure appointment settings for my branch, so that the booking system matches our operational needs.

#### Acceptance Criteria

1. THE Platform SHALL allow configuring appointment slot granularity (5, 10, 15, 30 minutes) per branch
2. THE Platform SHALL allow configuring buffer time between appointments (0 to 30 minutes)
3. THE Platform SHALL allow configuring cancellation window (minimum hours before appointment when cancellation is allowed)
4. THE Platform SHALL allow configuring grace period for late arrivals (minutes after scheduled time before marking as late)
5. THE Platform SHALL allow configuring minimum advance booking time (e.g., at least 2 hours before)
6. THE Platform SHALL allow configuring maximum advance booking window (e.g., up to 30 days ahead)
7. WHEN appointment settings are updated, THE Platform SHALL apply them to new bookings only (existing bookings unaffected)
8. THE Platform SHALL allow Branch_Manager or higher roles to modify appointment settings

---

### Requirement 2.12: Conflict Detection & Resolution

**User Story:** As a receptionist, I want the system to detect scheduling conflicts, so that I can resolve them before confirming bookings.

#### Acceptance Criteria

1. WHEN a booking would cause stylist double-booking, THE Platform SHALL block the booking and display the conflict
2. WHEN a booking would extend beyond branch closing time, THE Platform SHALL warn and suggest an earlier slot
3. WHEN a booking conflicts with stylist break time, THE Platform SHALL suggest alternate stylists or time slots
4. WHEN a booking conflicts with a branch holiday, THE Platform SHALL block the booking and display the reason
5. THE Platform SHALL suggest the next available slot when a conflict is detected
6. THE Platform SHALL suggest alternate available stylists when the preferred stylist is unavailable
7. WHEN multiple conflicts exist, THE Platform SHALL display all conflicts with resolution options

---

### Requirement 2.13: Cross-Branch Booking

**User Story:** As a customer, I want to book appointments at any branch of the salon, so that I can choose the most convenient location.

#### Acceptance Criteria

1. THE Platform SHALL allow customers to view availability across all branches of a business
2. WHEN booking online, THE Platform SHALL allow selecting any active branch of the business
3. THE Platform SHALL display branch-specific details (address, working hours) during branch selection
4. WHEN a customer books at a different branch, THE Platform SHALL use that branch's pricing and settings
5. THE Platform SHALL share customer profile and history across all branches of the same business
6. WHEN viewing customer history, THE Platform SHALL show appointments from all branches with branch name indicated

---

### Requirement 2.14: Appointment Notes & Context

**User Story:** As a stylist, I want to see relevant notes and history for each appointment, so that I can provide personalized service.

#### Acceptance Criteria

1. THE Platform SHALL allow adding notes to an appointment (special requests, preferences)
2. THE Platform SHALL display customer's past appointment history when viewing an appointment
3. THE Platform SHALL display customer's service preferences and allergies (from customer profile) during appointment
4. THE Platform SHALL allow stylists to add post-service notes (color formula used, recommendations)
5. WHEN a repeat service is booked, THE Platform SHALL display notes from the previous instance of that service
6. THE Platform SHALL allow attaching photos to appointment notes (before/after, reference images)

---

### Requirement 2.15: Appointment Data Integrity

**User Story:** As a platform operator, I want appointment data to be protected against loss, so that business operations are not disrupted.

#### Acceptance Criteria

1. THE Platform SHALL auto-save appointment drafts during creation to prevent data loss
2. WHEN a booking is interrupted (network issue, browser close), THE Platform SHALL recover the draft on next visit
3. THE Platform SHALL maintain appointment history even after completion or cancellation (no hard deletes)
4. WHEN service prices change, THE Platform SHALL preserve the locked price for existing appointments
5. THE Platform SHALL log all appointment modifications with before/after values
6. THE Platform SHALL prevent concurrent edits to the same appointment (optimistic locking)

---

## Module 3: Customer Management (CRM)

### Requirement 3.1: Customer Profile Creation

**User Story:** As a receptionist, I want to create customer profiles, so that I can track their information and service history.

#### Acceptance Criteria

1. WHEN creating a customer profile, THE Platform SHALL collect: name (required), phone number (required), email (optional), gender, date of birth (optional), anniversary date (optional)
2. THE Platform SHALL use phone number as the unique identifier for customers across all branches
3. THE Platform SHALL allow storing customer address (optional, for home service)
4. THE Platform SHALL allow uploading a customer profile photo (optional)
5. WHEN a customer with existing phone number is found, THE Platform SHALL retrieve their existing profile instead of creating duplicate
6. THE Platform SHALL allow searching customers by name, phone number, or email
7. WHEN a new customer is created at any branch, THE Platform SHALL make the profile available across all branches of the business

---

### Requirement 3.2: Guest Checkout

**User Story:** As a receptionist, I want to serve walk-in customers without creating a full profile, so that I can quickly process one-time visitors.

#### Acceptance Criteria

1. THE Platform SHALL support guest checkout requiring only customer name
2. WHEN processing a guest checkout, THE Platform SHALL generate a bill with the provided name
3. THE Platform SHALL NOT create a customer profile for guest checkouts
4. THE Platform SHALL mark the transaction as "Guest" in reports
5. THE Platform SHALL NOT track history or preferences for guest customers
6. WHEN a guest provides phone number voluntarily, THE Platform SHALL offer to create a full profile

---

### Requirement 3.3: Customer Preferences & Notes

**User Story:** As a stylist, I want to see customer preferences and notes, so that I can provide personalized service.

#### Acceptance Criteria

1. THE Platform SHALL allow storing preferred stylist for each customer
2. THE Platform SHALL allow storing preferred branch for each customer
3. THE Platform SHALL allow storing service preferences (e.g., preferred haircut style, beard style)
4. THE Platform SHALL allow storing allergies and sensitivities (hair dye allergies, skin conditions, product sensitivities)
5. THE Platform SHALL display allergy warnings prominently when booking or servicing a customer with recorded allergies
6. THE Platform SHALL allow storing style preferences with notes (hair length preference, color formulas used, styling notes)
7. THE Platform SHALL allow adding free-form notes to customer profile
8. THE Platform SHALL allow attaching reference photos to customer profile (preferred styles, past work)

---

### Requirement 3.4: Customer History

**User Story:** As a branch manager, I want to view complete customer history, so that I can understand their relationship with our salon.

#### Acceptance Criteria

1. THE Platform SHALL display complete appointment history for each customer across all branches
2. THE Platform SHALL display complete billing history for each customer
3. THE Platform SHALL display all services availed with dates and servicing stylist
4. THE Platform SHALL display feedback and ratings given by the customer
5. THE Platform SHALL retain all customer history indefinitely until a purging system is implemented
6. WHEN a Stylist views customer profile, THE Platform SHALL show limited view (recent appointments, preferences, allergies only)
7. WHEN a Stylist views customer profile, THE Platform SHALL mask phone number (e.g., 98XXX-XX123)
8. WHEN a Branch_Manager or higher role views customer history, THE Platform SHALL show complete history including billing, feedback, and full contact details
9. THE Platform SHALL display customer's no-show count and booking restrictions if any
10. THE Platform SHALL display first visit branch and most visited branch
11. THE Platform SHALL display cross-branch visit summary (visits per branch)
12. THE Platform SHALL display active memberships, packages, and wallet balance summary (details in Module 8)

---

### Requirement 3.5: Customer Segmentation & Tagging

**User Story:** As a salon owner, I want to segment customers with tags, so that I can target them for marketing and offers.

#### Acceptance Criteria

1. THE Platform SHALL support system tags: New, Regular, VIP, Inactive, Blocked
2. THE Platform SHALL automatically tag customers as "New" on first visit
3. THE Platform SHALL automatically tag customers as "Regular" after configurable number of visits (default: 5)
4. THE Platform SHALL automatically tag customers as "Inactive" after configurable days without visit (default: 90 days)
5. THE Platform SHALL allow Branch_Manager or higher roles to manually tag customers as "VIP"
6. THE Platform SHALL allow creating custom tags at the business level
7. THE Platform SHALL allow assigning multiple tags to a single customer
8. THE Platform SHALL allow filtering customer list by tags
9. THE Platform SHALL support auto-tagging rules based on total spend (e.g., VIP if spent > ₹10,000)

---

### Requirement 3.6: Loyalty Points System

**User Story:** As a salon owner, I want to reward loyal customers with points, so that they keep coming back.

#### Acceptance Criteria

1. THE Platform SHALL support a points-based loyalty program per business
2. THE Platform SHALL allow configuring points earned per rupee spent (e.g., 1 point per ₹100)
3. THE Platform SHALL automatically credit points to customer account after bill payment
4. THE Platform SHALL allow configuring point redemption value (e.g., 100 points = ₹50 discount)
5. THE Platform SHALL allow redeeming points during billing as discount
6. THE Platform SHALL display current points balance on customer profile and during billing
7. THE Platform SHALL maintain points transaction history (earned, redeemed, expired, adjusted)
8. THE Platform SHALL allow configuring points expiry period (e.g., expire after 1 year)
9. THE Platform SHALL allow Branch_Manager or higher roles to manually adjust points with mandatory reason
10. THE Platform SHALL log all manual point adjustments in audit log for fraud prevention
11. THE Platform SHALL prevent point redemption exceeding available balance

---

### Requirement 3.7: Referral Tracking

**User Story:** As a salon owner, I want to track customer referrals, so that I can reward customers who bring new business.

#### Acceptance Criteria

1. THE Platform SHALL allow recording referral source when creating a new customer profile
2. THE Platform SHALL allow selecting an existing customer as the referrer
3. THE Platform SHALL track referral count per customer
4. THE Platform SHALL allow configuring referral rewards (points or discount for referrer)
5. WHEN a referred customer completes their first paid visit, THE Platform SHALL credit referral reward to the referrer
6. THE Platform SHALL display referral statistics on customer profile (customers referred, rewards earned)
7. THE Platform SHALL allow generating referral reports (top referrers, referral conversion rate)

---

### Requirement 3.8: Birthday & Anniversary Rewards

**User Story:** As a salon owner, I want to send special offers on customer birthdays and anniversaries, so that I can build personal relationships.

#### Acceptance Criteria

1. THE Platform SHALL identify customers with upcoming birthdays (configurable days ahead, default: 7 days)
2. THE Platform SHALL identify customers with upcoming anniversaries (configurable days ahead, default: 7 days)
3. THE Platform SHALL allow configuring birthday reward (discount percentage, free service, or bonus points)
4. THE Platform SHALL allow configuring anniversary reward (discount percentage, free service, or bonus points)
5. THE Platform SHALL automatically send birthday/anniversary wishes via WhatsApp with reward details
6. THE Platform SHALL track reward redemption (used/unused)
7. THE Platform SHALL allow configuring reward validity period (e.g., valid for 15 days from birthday)

---

### Requirement 3.9: Communication Management

**User Story:** As a salon owner, I want to control customer communications, so that I can manage marketing effectively.

#### Acceptance Criteria

1. THE Platform SHALL use WhatsApp as the primary communication channel
2. THE Platform SHALL support SMS as secondary channel when WhatsApp is unavailable
3. THE Platform SHALL support Email for detailed communications (invoices, reports)
4. THE Platform SHALL allow salon staff to control which customers receive marketing messages
5. THE Platform SHALL allow marking customers as "Do Not Contact for Marketing" by Branch_Manager or higher roles
6. THE Platform SHALL always send transactional messages (appointment confirmations, reminders) regardless of marketing preferences
7. THE Platform SHALL log all communications sent to each customer

---

### Requirement 3.10: Customer Feedback & Ratings

**User Story:** As a salon owner, I want to collect customer feedback, so that I can improve service quality.

#### Acceptance Criteria

1. THE Platform SHALL send feedback request after appointment completion via WhatsApp
2. THE Platform SHALL support star rating (1-5 stars) for overall experience
3. THE Platform SHALL support star rating for individual stylist
4. THE Platform SHALL allow customers to add text feedback/comments
5. THE Platform SHALL display average rating on customer profile
6. THE Platform SHALL display feedback history on customer profile
7. THE Platform SHALL allow Branch_Manager or higher roles to respond to feedback
8. THE Platform SHALL flag low ratings (1-2 stars) for manager review

---

### Requirement 3.11: Complaint Tracking

**User Story:** As a branch manager, I want to track customer complaints, so that I can resolve issues and prevent recurrence.

#### Acceptance Criteria

1. THE Platform SHALL allow logging complaints against a customer profile
2. WHEN logging a complaint, THE Platform SHALL collect: complaint type, description, related appointment (if any), severity
3. THE Platform SHALL support complaint statuses: Open, In Progress, Resolved, Closed
4. THE Platform SHALL allow assigning complaint to a staff member for resolution
5. THE Platform SHALL track resolution notes and actions taken
6. THE Platform SHALL display complaint history on customer profile
7. THE Platform SHALL generate complaint reports (by type, by branch, resolution time)
8. THE Platform SHALL notify Branch_Manager when a new complaint is logged

---

### Requirement 3.12: Customer Financial Summary

**User Story:** As a branch manager, I want to see customer's financial relationship with our salon, so that I can understand their value and any pending matters.

#### Acceptance Criteria

1. THE Platform SHALL display total lifetime spend for each customer
2. THE Platform SHALL display average ticket size (total spend / number of visits)
3. THE Platform SHALL display current wallet balance (prepaid amount + refund credits)
4. THE Platform SHALL display active package balances (remaining services from purchased packages)
5. THE Platform SHALL display active membership status and benefits
6. THE Platform SHALL display refund history if any
7. THE Platform SHALL NOT allow unpaid bills - payment is required at service completion
8. WHEN a customer has wallet balance, THE Platform SHALL allow using it during billing

---

### Requirement 3.13: Customer Wallet

**User Story:** As a customer, I want to prepay and maintain a wallet balance, so that I can pay conveniently during visits.

#### Acceptance Criteria

1. THE Platform SHALL support customer wallet for prepaid balances
2. THE Platform SHALL allow customers to add money to wallet (at branch or online)
3. THE Platform SHALL allow using wallet balance during billing
4. THE Platform SHALL maintain wallet transaction history (credits, debits, refunds)
5. THE Platform SHALL credit refunds to wallet instead of cash (configurable)
6. THE Platform SHALL display wallet balance prominently during billing
7. THE Platform SHALL allow Branch_Manager or higher roles to manually adjust wallet with mandatory reason
8. THE Platform SHALL log all manual wallet adjustments in audit log

---

### Requirement 3.14: Customer Data Hygiene

**User Story:** As a branch manager, I want to maintain clean customer data, so that the CRM remains accurate and useful.

#### Acceptance Criteria

1. THE Platform SHALL detect potential duplicate customers based on phone number
2. THE Platform SHALL allow Branch_Manager or higher roles to merge duplicate customer profiles
3. WHEN merging customers, THE Platform SHALL combine all history, points, and wallet balances
4. WHEN merging customers, THE Platform SHALL create an audit log entry with merge details
5. THE Platform SHALL allow changing customer phone number with verification (OTP or manager approval)
6. THE Platform SHALL maintain edit history for customer profile changes
7. THE Platform SHALL support fast search by phone, name, and email for reception efficiency
8. THE Platform SHALL index customer data for quick lookup (search should return results in under 1 second)

---

### Requirement 3.15: Customer Data Protection

**User Story:** As a platform operator, I want to protect customer data from accidental loss, so that business relationships are preserved.

#### Acceptance Criteria

1. THE Platform SHALL only allow soft-delete (deactivation) of customer profiles, not hard delete
2. THE Platform SHALL prevent deactivating customers with active wallet balance, packages, or memberships
3. THE Platform SHALL prevent deactivating customers with active appointments
4. THE Platform SHALL allow Branch_Manager or higher roles to reactivate deactivated customers
5. THE Platform SHALL lock customer profile from edits during active appointment
6. THE Platform SHALL maintain complete audit trail of all customer profile changes
7. WHEN a customer is deactivated, THE Platform SHALL retain all historical data for reporting

---

## Module 4: Services & Pricing

### Requirement 4.1: Service Catalog Structure

**User Story:** As a salon owner, I want to organize services in categories, so that customers and staff can easily find and select services.

#### Acceptance Criteria

1. THE Platform SHALL support a two-level category hierarchy: Category → Sub-category → Service
2. THE Platform SHALL allow creating service categories at the tenant level (e.g., Hair, Skin, Nails, Spa)
3. THE Platform SHALL allow creating sub-categories under each category (e.g., Hair → Cutting, Coloring, Treatment)
4. THE Platform SHALL allow assigning services to a sub-category
5. THE Platform SHALL allow reordering categories, sub-categories, and services for display
6. THE Platform SHALL allow Branch_Manager or higher roles to manage the service catalog
7. WHEN displaying services, THE Platform SHALL group them by category and sub-category

---

### Requirement 4.2: Service Definition

**User Story:** As a branch manager, I want to define services with all relevant details, so that pricing and scheduling work correctly.

#### Acceptance Criteria

1. WHEN creating a service, THE Platform SHALL collect: name, description, category, sub-category, base price, and duration
2. THE Platform SHALL allow assigning a unique SKU/code to each service for reporting
3. THE Platform SHALL allow uploading a service image (optional)
4. THE Platform SHALL allow setting active time (stylist working) and processing time (waiting/settling) separately
5. WHEN a service has processing time, THE Platform SHALL mark the stylist as available for other customers during that period
6. THE Platform SHALL calculate total service duration as active time + processing time
7. THE Platform SHALL allow marking a service as active or inactive
8. THE Platform SHALL allow adding internal notes for staff (not visible to customers)

---

### Requirement 4.3: Gender-Based Pricing

**User Story:** As a salon owner, I want to set different prices for men and women, so that I can reflect the actual effort and time differences.

#### Acceptance Criteria

1. THE Platform SHALL support gender-based pricing variants for services
2. WHEN creating a service, THE Platform SHALL allow setting separate prices for: Men, Women, Kids (optional)
3. WHEN creating a service, THE Platform SHALL allow setting separate durations for each gender variant
4. WHEN booking an appointment, THE Platform SHALL apply the price based on customer's gender
5. IF a service has only one price (no gender variants), THE Platform SHALL apply that price to all genders
6. THE Platform SHALL display gender-specific prices in the service catalog

---

### Requirement 4.4: Optional Pricing Features

**User Story:** As a salon owner, I want optional pricing features that I can enable based on my business needs.

#### Acceptance Criteria

1. THE Platform SHALL support duration-based pricing as an optional feature (e.g., short hair vs long hair)
2. WHEN duration-based pricing is enabled, THE Platform SHALL allow setting price variants by hair length or service complexity
3. THE Platform SHALL support staff-level pricing as an optional feature (e.g., senior stylist charges more)
4. WHEN staff-level pricing is enabled, THE Platform SHALL allow setting price multipliers per staff skill level (Junior, Senior, Expert)
5. THE Platform SHALL allow enabling/disabling these optional pricing features at the tenant level
6. WHEN an optional pricing feature is disabled, THE Platform SHALL use base price for all variants

---

### Requirement 4.5: Tenant vs Branch Pricing

**User Story:** As a salon owner, I want to set default prices at tenant level but allow branches to override, so that each location can price competitively.

#### Acceptance Criteria

1. THE Platform SHALL allow defining default service prices at the tenant level
2. THE Platform SHALL allow branches to override tenant-level prices with branch-specific prices
3. WHEN a branch has no price override, THE Platform SHALL use the tenant-level default price
4. THE Platform SHALL clearly indicate which prices are tenant-default vs branch-override
5. WHEN a tenant-level price is updated, THE Platform SHALL NOT affect branch-level overrides
6. THE Platform SHALL allow branches to reset to tenant-default price
7. WHEN a service price is changed, THE Platform SHALL apply the new price immediately to new bookings (existing bookings retain locked price)
8. THE Platform SHALL maintain price history with effective dates for each price change
9. THE Platform SHALL allow scheduling future price changes with effective date
10. THE Platform SHALL display price change history for audit purposes

---

### Requirement 4.6: Combo/Package Services

**User Story:** As a salon owner, I want to create combo packages, so that I can offer bundled services at attractive prices.

#### Acceptance Criteria

1. THE Platform SHALL allow creating combo services that bundle multiple individual services
2. WHEN creating a combo, THE Platform SHALL allow selecting which services to include
3. THE Platform SHALL allow setting a combo price (typically less than sum of individual prices)
4. THE Platform SHALL allow setting combo duration manually (salon knows their workflow)
5. THE Platform SHALL allow including products in combos (as complimentary or discounted)
6. WHEN a combo includes products, THE Platform SHALL deduct from inventory when combo is availed
7. THE Platform SHALL display combo savings (original price vs combo price) to customers
8. THE Platform SHALL allow setting combo validity period (e.g., seasonal combos)
9. THE Platform SHALL allow marking combos as active or inactive

---

### Requirement 4.7: Service Availability

**User Story:** As a branch manager, I want to control which services are available at my branch and by which stylists.

#### Acceptance Criteria

1. THE Platform SHALL allow marking services as branch-specific (available only at selected branches)
2. THE Platform SHALL allow marking services as stylist-specific (only certain stylists can perform)
3. WHEN a service is stylist-specific, THE Platform SHALL only show qualified stylists during booking
4. THE Platform SHALL allow creating seasonal services with start and end dates
5. WHEN a seasonal service is outside its validity period, THE Platform SHALL hide it from booking
6. THE Platform SHALL allow Branch_Manager to enable/disable tenant-level services for their branch
7. WHEN a service is disabled at a branch, THE Platform SHALL not show it in that branch's catalog
8. THE Platform SHALL allow setting temporary unavailability for a service with date range
9. WHEN setting temporary unavailability, THE Platform SHALL allow recording a reason (staff leave, equipment issue, etc.)
10. WHEN a service is temporarily unavailable, THE Platform SHALL hide it from booking for that period only

---

### Requirement 4.8: Service Dependencies & Workflow

**User Story:** As a salon owner, I want to define service dependencies, so that the system schedules services correctly.

#### Acceptance Criteria

1. THE Platform SHALL allow marking services as parallelizable (can run alongside other services)
2. THE Platform SHALL allow defining sequential dependencies (Service B must follow Service A)
3. WHEN services are sequential, THE Platform SHALL schedule them back-to-back with the same stylist
4. THE Platform SHALL allow setting cleanup/rest time between services
5. WHEN a service has processing time (settling, drying), THE Platform SHALL allow the stylist to serve other customers during that period
6. THE Platform SHALL calculate total appointment duration considering parallel, sequential, and processing times
7. WHEN booking multiple services, THE Platform SHALL optimize the schedule based on dependencies

---

### Requirement 4.9: GST & Tax Configuration

**User Story:** As a salon owner, I want to configure GST for services, so that billing is tax-compliant.

#### Acceptance Criteria

1. THE Platform SHALL support GST configuration for services
2. THE Platform SHALL allow setting a default GST rate at the tenant level (e.g., 18%)
3. THE Platform SHALL allow setting service-specific GST rates (if different from default)
4. THE Platform SHALL allow applying the same GST rate to all services with one action
5. THE Platform SHALL allow configuring whether prices are GST-inclusive or GST-exclusive at the branch level
6. WHEN prices are GST-exclusive, THE Platform SHALL calculate and add GST during billing
7. WHEN prices are GST-inclusive, THE Platform SHALL display GST breakup on invoice
8. THE Platform SHALL store GST HSN/SAC codes for services (for GST compliance)

---

### Requirement 4.10: Add-On Services

**User Story:** As a salon owner, I want to configure add-on services, so that staff can upsell during appointments.

#### Acceptance Criteria

1. THE Platform SHALL allow marking any service as an add-on to a parent service
2. THE Platform SHALL allow a service to be both standalone and an add-on (configurable by salon)
3. WHEN booking a parent service, THE Platform SHALL suggest relevant add-ons
4. THE Platform SHALL allow marking add-ons as mandatory or optional
5. WHEN a mandatory add-on exists, THE Platform SHALL auto-include it with the parent service
6. THE Platform SHALL allow setting add-on-specific pricing (may differ from standalone price)
7. THE Platform SHALL track add-on revenue separately in reports

---

### Requirement 4.11: Service Commission Rules

**User Story:** As a salon owner, I want to define commission rules per service, so that staff are compensated fairly.

#### Acceptance Criteria

1. THE Platform SHALL allow setting a default commission percentage per service
2. THE Platform SHALL allow setting commission as percentage or flat amount per service
3. THE Platform SHALL allow overriding commission for individual staff members
4. WHEN a staff member has a custom commission, THE Platform SHALL use that instead of service default
5. THE Platform SHALL apply commission when the service is marked as completed
6. THE Platform SHALL track commission earned per service in staff reports
7. THE Platform SHALL allow Branch_Manager or higher roles to configure commission rules

---

### Requirement 4.12: Service Inventory Linkage

**User Story:** As a salon owner, I want to link consumables to services, so that inventory is automatically tracked.

#### Acceptance Criteria

1. THE Platform SHALL allow mapping consumable products to services
2. THE Platform SHALL allow specifying quantity of each consumable used per service
3. WHEN a service is completed, THE Platform SHALL automatically deduct linked consumables from inventory
4. THE Platform SHALL allow variant-based consumption (e.g., more product for long hair)
5. THE Platform SHALL alert when linked consumables are low in stock
6. THE Platform SHALL track consumable usage per service in reports
7. THE Platform SHALL allow Branch_Manager or higher roles to configure service-inventory linkage

---

### Requirement 4.13: Discount Rules

**User Story:** As a salon owner, I want to define discount rules, so that discounts are controlled and consistent.

#### Acceptance Criteria

1. THE Platform SHALL allow setting service-specific discount limits (max % or amount)
2. THE Platform SHALL allow setting discount stacking rules (can multiple discounts apply?)
3. THE Platform SHALL allow setting a global maximum discount cap per bill
4. THE Platform SHALL allow configuring which roles can apply manual discounts
5. WHEN a discount exceeds the allowed limit, THE Platform SHALL require manager approval
6. THE Platform SHALL track all discounts applied with reason and approver
7. THE Platform SHALL generate discount impact reports

---

### Requirement 4.14: Service Access Control

**User Story:** As a salon owner, I want to control who can create and modify services, so that pricing integrity is maintained.

#### Acceptance Criteria

1. THE Platform SHALL allow only Super_Owner and Regional_Manager to create new services
2. THE Platform SHALL allow configuring whether price changes require Super_Owner approval
3. WHEN price change approval is enabled, THE Platform SHALL create a pending change request for Branch_Manager price edits
4. THE Platform SHALL notify Super_Owner of pending price change requests
5. WHEN a price change is approved, THE Platform SHALL apply it immediately
6. WHEN a price change is rejected, THE Platform SHALL notify the requester with reason
7. THE Platform SHALL log all service creation, modification, and approval actions

---

### Requirement 4.15: Service Audit Logs

**User Story:** As a salon owner, I want all service changes to be logged, so that I can track modifications and investigate issues.

#### Acceptance Criteria

1. THE Platform SHALL log all service creation with creator and timestamp
2. THE Platform SHALL log all price changes with old value, new value, user, and timestamp
3. THE Platform SHALL log all duration changes with old value, new value, user, and timestamp
4. THE Platform SHALL log all tax/GST changes with old value, new value, user, and timestamp
5. THE Platform SHALL log all commission changes with old value, new value, user, and timestamp
6. THE Platform SHALL allow Super_Owner and Accountant to view service audit logs
7. THE Platform SHALL retain service audit logs for minimum 2 years

---

### Requirement 4.16: Bulk Service Operations

**User Story:** As a salon owner, I want to import and update services in bulk, so that I can manage large catalogs efficiently.

#### Acceptance Criteria

1. THE Platform SHALL support bulk service import via CSV or Excel file
2. THE Platform SHALL provide a template file for bulk import with all required fields
3. THE Platform SHALL validate imported data and display errors before committing
4. THE Platform SHALL allow bulk price updates via CSV or Excel file
5. THE Platform SHALL allow bulk enable/disable of services
6. THE Platform SHALL allow merging duplicate services (combine history, redirect references)
7. WHEN merging services, THE Platform SHALL create an audit log entry
8. THE Platform SHALL allow Super_Owner or Regional_Manager to perform bulk operations

---

## Module 5: Billing & Invoicing

### Requirement 5.1: Billing Configuration

**User Story:** As a branch manager, I want to configure billing settings for my branch, so that invoices are generated according to our business needs.

#### Acceptance Criteria

1. THE Platform SHALL allow configuring invoice number prefix per branch (e.g., "GLAM-CS-")
2. THE Platform SHALL generate sequential invoice numbers per branch
3. THE Platform SHALL allow configuring whether prices are GST-inclusive or GST-exclusive per branch
4. THE Platform SHALL allow configuring rounding rules (nearest ₹1, ₹5, or ₹10) per branch
5. THE Platform SHALL allow configuring tip handling (included in bill or captured separately)
6. THE Platform SHALL allow configuring edit permissions after bill generation
7. THE Platform SHALL allow Branch_Manager or higher roles to modify billing configuration

---

### Requirement 5.2: Bill Creation

**User Story:** As a receptionist, I want to create bills for customers, so that I can collect payment for services and products.

#### Acceptance Criteria

1. THE Platform SHALL allow creating a bill from a completed appointment
2. THE Platform SHALL allow creating a direct bill (Quick Sale) without an appointment for walk-ins or product-only sales
3. THE Platform SHALL auto-populate services and prices from the linked appointment
4. THE Platform SHALL allow adding products to the bill along with services
5. THE Platform SHALL lock prices at bill creation time (price changes don't affect existing bills)
6. THE Platform SHALL allow adding notes to the bill
7. THE Platform SHALL create one bill per appointment (no combining multiple appointments)
8. THE Platform SHALL allow Receptionist or higher roles to create bills

---

### Requirement 5.3: Bill Line Items

**User Story:** As a receptionist, I want to see detailed line items on the bill, so that customers understand what they're paying for.

#### Acceptance Criteria

1. THE Platform SHALL display each service as a separate line item with price
2. THE Platform SHALL display add-on services as separate line items
3. THE Platform SHALL display products as separate line items with quantity
4. THE Platform SHALL track which stylist performed each service (staff attribution)
5. THE Platform SHALL allow partial service billing if service was dropped mid-way
6. WHEN a service is partially completed, THE Platform SHALL allow adjusting the price proportionally
7. THE Platform SHALL display subtotal, discounts, taxes, and grand total clearly

---

### Requirement 5.4: Manual Price Override

**User Story:** As a branch manager, I want to override prices on a bill when needed, so that I can handle special situations.

#### Acceptance Criteria

1. THE Platform SHALL allow manual price override on bill line items
2. THE Platform SHALL require Branch_Manager or higher role for price overrides
3. WHEN a price is overridden, THE Platform SHALL log the original price, new price, and reason
4. THE Platform SHALL display overridden prices distinctly on the bill
5. THE Platform SHALL include price overrides in audit logs

---

### Requirement 5.5: Discounts & Offers

**User Story:** As a receptionist, I want to apply discounts to bills, so that customers can avail offers and promotions.

#### Acceptance Criteria

1. THE Platform SHALL support flat amount discounts (e.g., ₹100 off)
2. THE Platform SHALL support percentage discounts (e.g., 10% off)
3. THE Platform SHALL support item-level discounts (discount on specific service/product)
4. THE Platform SHALL support bill-level discounts (discount on total)
5. THE Platform SHALL auto-apply membership discounts based on customer's active membership
6. THE Platform SHALL support coupon code application with validation
7. THE Platform SHALL apply only one automatic discount (membership OR offer, whichever is higher)
8. THE Platform SHALL allow manual discount on top of automatic discount (with approval if exceeds limit)
9. THE Platform SHALL enforce maximum discount cap as configured
10. THE Platform SHALL apply discounts BEFORE tax calculation
11. THE Platform SHALL log all discounts with type, amount, and approver (if manual)

---

### Requirement 5.6: GST & Tax Calculation

**User Story:** As a salon owner, I want GST calculated correctly on bills, so that I remain tax-compliant.

#### Acceptance Criteria

1. THE Platform SHALL calculate GST based on branch configuration (inclusive/exclusive)
2. THE Platform SHALL split GST into CGST and SGST for intra-state transactions
3. THE Platform SHALL apply IGST for inter-state transactions (if applicable)
4. THE Platform SHALL use service-specific GST rates where configured
5. THE Platform SHALL handle non-taxable services (GST exempt)
6. THE Platform SHALL display tax breakup on the bill (taxable value, CGST, SGST, total tax)
7. THE Platform SHALL never merge GST across branches with different GSTINs
8. THE Platform SHALL store SAC codes for services on invoices

---

### Requirement 5.7: Payment Collection

**User Story:** As a receptionist, I want to collect payment through multiple methods, so that customers can pay conveniently.

#### Acceptance Criteria

1. THE Platform SHALL support payment via Cash
2. THE Platform SHALL support payment via UPI (and track UPI app used)
3. THE Platform SHALL support payment via Card (and track card type - Credit/Debit)
4. THE Platform SHALL support payment via Customer Wallet balance
5. THE Platform SHALL support split payments (multiple payment methods in single transaction)
6. THE Platform SHALL NOT allow partial payments (full payment required to close bill)
7. THE Platform SHALL allow applying loyalty points as payment
8. THE Platform SHALL allow redeeming package/membership services
9. WHEN wallet or points are used, THE Platform SHALL deduct from customer balance immediately
10. THE Platform SHALL generate payment receipt after successful payment

---

### Requirement 5.8: Tips & Gratuity

**User Story:** As a stylist, I want tips to be tracked separately, so that I receive my gratuity correctly.

#### Acceptance Criteria

1. THE Platform SHALL allow capturing tips separately from the bill amount
2. THE Platform SHALL allow specifying tip amount during payment
3. THE Platform SHALL attribute tips to the stylist who performed the service
4. WHEN multiple stylists served the customer, THE Platform SHALL allow splitting tips
5. THE Platform SHALL track tips in stylist's earnings report
6. THE Platform SHALL NOT include tips in salon revenue (tips go directly to stylist)

---

### Requirement 5.9: Invoice Generation

**User Story:** As a customer, I want a proper invoice for my payment, so that I have a record of my transaction.

#### Acceptance Criteria

1. THE Platform SHALL generate invoice immediately after payment
2. THE Platform SHALL support simple receipt format (for regular customers)
3. THE Platform SHALL support GST invoice format (when requested or for B2B)
4. THE Platform SHALL include on invoice: branch details, GSTIN, invoice number, date, customer name, line items, taxes, total, payment method
5. THE Platform SHALL support thermal printer format (small receipt)
6. THE Platform SHALL support A4 print format (full invoice)
7. THE Platform SHALL include branch logo and branding on invoice
8. THE Platform SHALL optionally include QR code for digital verification

---

### Requirement 5.10: Digital Invoice Sharing

**User Story:** As a customer, I want to receive my invoice digitally, so that I don't need to keep paper receipts.

#### Acceptance Criteria

1. THE Platform SHALL allow sending invoice via WhatsApp
2. THE Platform SHALL allow sending invoice link via SMS
3. THE Platform SHALL allow downloading invoice as PDF
4. THE Platform SHALL allow re-sending invoice to customer
5. THE Platform SHALL store digital copy of all invoices
6. THE Platform SHALL allow customer to access past invoices from their profile

---

### Requirement 5.11: Bill Editing & Void

**User Story:** As a branch manager, I want to edit or void bills when errors occur, so that I can correct mistakes.

#### Acceptance Criteria

1. THE Platform SHALL allow reopening a bill before final settlement (payment not yet collected)
2. THE Platform SHALL allow editing bill line items with Branch_Manager approval
3. THE Platform SHALL allow voiding a bill with mandatory reason
4. WHEN a bill is voided, THE Platform SHALL reverse any wallet/points deductions
5. THE Platform SHALL restrict editing after payment is collected (require void and re-bill)
6. THE Platform SHALL log all bill edits with old value, new value, user, and timestamp
7. THE Platform SHALL log all void actions with reason, user, and timestamp

---

### Requirement 5.12: Refunds & Credit Notes

**User Story:** As a branch manager, I want to process refunds when needed, so that customers are compensated for issues.

#### Acceptance Criteria

1. THE Platform SHALL support full refund of a bill
2. THE Platform SHALL support partial refund (specific amount)
3. THE Platform SHALL support service-level refund (refund specific service from bill)
4. THE Platform SHALL allow refund to original payment method or customer wallet
5. WHEN refunding, THE Platform SHALL generate a credit note (GST requirement)
6. THE Platform SHALL link credit note to original invoice
7. THE Platform SHALL adjust GST in credit note correctly
8. THE Platform SHALL preserve original invoice history (no modification)
9. THE Platform SHALL require Branch_Manager or higher role for refunds
10. THE Platform SHALL log all refunds with reason, amount, method, and approver

---

### Requirement 5.13: Commission Locking

**User Story:** As a salon owner, I want staff commissions locked at billing time, so that later changes don't affect payroll.

#### Acceptance Criteria

1. THE Platform SHALL calculate and lock staff commission at bill creation time
2. THE Platform SHALL store commission snapshot with the bill
3. WHEN a bill is voided, THE Platform SHALL reverse the commission
4. WHEN a refund is processed, THE Platform SHALL adjust commission proportionally
5. THE Platform SHALL NOT recalculate commission based on later rate changes
6. THE Platform SHALL protect commission records from post-billing edits

---

### Requirement 5.14: Cash Drawer Management

**User Story:** As a receptionist, I want to manage the cash drawer, so that cash is tracked accurately.

#### Acceptance Criteria

1. THE Platform SHALL track opening cash balance at start of day/shift
2. THE Platform SHALL track all cash-in (payments received)
3. THE Platform SHALL track all cash-out (refunds, petty cash)
4. THE Platform SHALL calculate expected cash balance
5. THE Platform SHALL allow recording actual cash count
6. THE Platform SHALL highlight variance between expected and actual
7. THE Platform SHALL require explanation for variances above threshold
8. THE Platform SHALL allow Branch_Manager or higher roles to approve variances

---

### Requirement 5.15: Day/Shift Closure & Reconciliation

**User Story:** As a branch manager, I want to close the day with reconciliation, so that I know the financial status.

#### Acceptance Criteria

1. THE Platform SHALL support daily closure with reconciliation
2. THE Platform SHALL optionally support shift-based closure (configurable per branch)
3. THE Platform SHALL display daily sales summary (total revenue, by payment method)
4. THE Platform SHALL display cash-in-hand vs expected
5. THE Platform SHALL display payment mode breakdown (Cash, UPI, Card, Wallet)
6. THE Platform SHALL display discount summary (total discounts given)
7. THE Platform SHALL display refund summary
8. THE Platform SHALL require closure before starting new day/shift
9. THE Platform SHALL prevent billing for previous day after closure
10. THE Platform SHALL allow Branch_Manager or higher roles to perform closure

---

### Requirement 5.16: Billing Access Control

**User Story:** As a salon owner, I want to control who can perform billing actions, so that financial integrity is maintained.

#### Acceptance Criteria

1. THE Platform SHALL allow Receptionist or higher roles to create bills
2. THE Platform SHALL allow only Branch_Manager or higher roles to apply manual discounts beyond limit
3. THE Platform SHALL allow only Branch_Manager or higher roles to override prices
4. THE Platform SHALL allow only Branch_Manager or higher roles to void bills
5. THE Platform SHALL allow only Branch_Manager or higher roles to process refunds
6. THE Platform SHALL allow only Accountant, Branch_Manager, or higher roles to view financial reports
7. THE Platform SHALL hide profit/margin information from Receptionist and Stylist roles

---

### Requirement 5.17: Billing Audit Logs

**User Story:** As a salon owner, I want all billing actions logged, so that I can investigate discrepancies.

#### Acceptance Criteria

1. THE Platform SHALL log all bill creation with user, timestamp, and amount
2. THE Platform SHALL log all bill edits with old value, new value, user, and timestamp
3. THE Platform SHALL log all discounts applied with type, amount, reason, and approver
4. THE Platform SHALL log all price overrides with original price, new price, and reason
5. THE Platform SHALL log all void actions with reason and user
6. THE Platform SHALL log all refunds with amount, reason, and approver
7. THE Platform SHALL log all GST changes
8. THE Platform SHALL include branch ID in all audit logs
9. THE Platform SHALL retain billing audit logs for minimum 7 years (tax compliance)

---

### Requirement 5.18: Financial Year Management

**User Story:** As a salon owner, I want to close financial years properly, so that accounting is organized.

#### Acceptance Criteria

1. THE Platform SHALL support financial year closure (April to March for India)
2. THE Platform SHALL prevent editing bills from closed financial years
3. THE Platform SHALL carry forward relevant balances to new financial year
4. THE Platform SHALL generate year-end summary reports
5. THE Platform SHALL allow Super_Owner to perform financial year closure
6. THE Platform SHALL maintain separate invoice number sequences per financial year (optional)

---

## Module 6: Staff Management (Attendance & Commissions)

### Requirement 6.1: Staff Profile Enhancement

**User Story:** As a branch manager, I want to maintain comprehensive staff profiles, so that I can manage HR and payroll effectively.

#### Acceptance Criteria

1. THE Platform SHALL store employment type for each staff (Full-time, Part-time, Contractual)
2. THE Platform SHALL store joining date and confirmation date
3. THE Platform SHALL store base salary amount
4. THE Platform SHALL store bank account details for salary disbursement
5. THE Platform SHALL store emergency contact information
6. THE Platform SHALL store ID proof documents (Aadhaar, PAN)
7. THE Platform SHALL store employment contract documents
8. THE Platform SHALL store training and certification records
9. THE Platform SHALL only allow soft-delete (deactivation) of staff profiles
10. THE Platform SHALL retain all historical data for deactivated staff

---

### Requirement 6.2: Attendance Configuration

**User Story:** As a branch manager, I want to configure attendance rules for my branch, so that attendance tracking matches our operational needs.

#### Acceptance Criteria

1. THE Platform SHALL support multiple attendance modes: Manual (manager marks), App-based (staff self check-in), Biometric (integration-ready)
2. THE Platform SHALL allow configuring attendance mode per branch
3. THE Platform SHALL allow configuring late tolerance/grace period in minutes (default: 15 min)
4. THE Platform SHALL allow configuring half-day rules (e.g., worked less than 4 hours = half day)
5. THE Platform SHALL allow configuring overtime rules (hours beyond shift, overtime rate)
6. THE Platform SHALL allow configuring auto-mark absent time (if no check-in by X time, mark absent)
7. THE Platform SHALL allow Branch_Manager or higher roles to modify attendance configuration

---

### Requirement 6.3: Daily Attendance Tracking

**User Story:** As a staff member, I want to mark my attendance, so that my presence is recorded accurately.

#### Acceptance Criteria

1. THE Platform SHALL allow staff to clock-in at shift start
2. THE Platform SHALL allow staff to clock-out at shift end
3. THE Platform SHALL record clock-in and clock-out timestamps
4. THE Platform SHALL track break times (lunch, tea breaks)
5. THE Platform SHALL calculate total working hours per day
6. THE Platform SHALL mark attendance status: Present, Absent, Late, Half-Day, On Leave, Weekly Off
7. WHEN staff clocks in after grace period, THE Platform SHALL mark as "Late"
8. THE Platform SHALL allow Branch_Manager to manually override attendance with mandatory reason
9. THE Platform SHALL log all attendance overrides with user and timestamp

---

### Requirement 6.4: Geo-Location Validation (Optional)

**User Story:** As a salon owner, I want to verify staff check-in location, so that I can prevent fake attendance.

#### Acceptance Criteria

1. THE Platform SHALL support geo-location validation as an optional feature per branch
2. WHEN geo-validation is enabled, THE Platform SHALL capture location during check-in
3. THE Platform SHALL compare check-in location with branch coordinates
4. WHEN check-in is outside allowed radius, THE Platform SHALL flag for manager review (not block)
5. THE Platform SHALL allow configuring allowed radius in meters (default: 100m)
6. THE Platform SHALL store device information for check-in verification

---

### Requirement 6.5: Shift Management

**User Story:** As a branch manager, I want to manage staff shifts, so that I can schedule coverage effectively.

#### Acceptance Criteria

1. THE Platform SHALL support fixed shifts (same timing daily) and flexible shifts (varying by day)
2. THE Platform SHALL allow defining multiple shifts per day (morning, evening)
3. THE Platform SHALL allow assigning staff to specific shifts
4. THE Platform SHALL allow shift swapping between staff with manager approval
5. THE Platform SHALL display shift schedule in calendar view
6. THE Platform SHALL alert when a shift has insufficient staff coverage
7. THE Platform SHALL track overtime when staff works beyond assigned shift

---

### Requirement 6.6: Leave Management

**User Story:** As a staff member, I want to apply for leave, so that I can take time off when needed.

#### Acceptance Criteria

1. THE Platform SHALL support leave types: Casual Leave, Sick Leave, Earned Leave, Unpaid Leave, Emergency Leave
2. THE Platform SHALL track leave balance per staff per leave type
3. THE Platform SHALL allow configuring annual leave entitlement based on employment type
4. THE Platform SHALL allow staff to submit leave requests with date range and reason
5. THE Platform SHALL notify Branch_Manager of pending leave requests
6. THE Platform SHALL allow Branch_Manager to approve or reject leave with optional comment
7. THE Platform SHALL notify staff of leave decision
8. WHEN leave is approved, THE Platform SHALL deduct from leave balance
9. THE Platform SHALL allow Branch_Manager to mark leave directly (post-facto for emergencies)
10. THE Platform SHALL block appointments for staff on approved leave

---

### Requirement 6.7: Weekly Off Management

**User Story:** As a branch manager, I want to configure weekly offs for staff, so that rest days are scheduled properly.

#### Acceptance Criteria

1. THE Platform SHALL allow configuring weekly off days per staff
2. THE Platform SHALL support fixed weekly off (same day every week) or rotating weekly off
3. THE Platform SHALL display weekly offs in staff calendar
4. THE Platform SHALL block appointments for staff on weekly off
5. THE Platform SHALL track if staff works on weekly off (for overtime/compensation)

---

### Requirement 6.8: Attendance Locking

**User Story:** As a salon owner, I want to lock attendance after payroll processing, so that historical records cannot be tampered.

#### Acceptance Criteria

1. THE Platform SHALL allow configuring attendance lock date (e.g., 5th of next month)
2. THE Platform SHALL auto-lock attendance for previous month after lock date
3. WHEN attendance is locked, THE Platform SHALL prevent any modifications
4. THE Platform SHALL allow Super_Owner to unlock attendance with mandatory reason (exceptional cases)
5. THE Platform SHALL log all unlock actions in audit trail
6. THE Platform SHALL display lock status on attendance records

---

### Requirement 6.9: Commission Structure

**User Story:** As a salon owner, I want to define commission structures, so that staff are compensated based on performance.

#### Acceptance Criteria

1. THE Platform SHALL support commission types: Percentage-based, Fixed amount, Hybrid (base + percentage)
2. THE Platform SHALL support slab-based commission (tiered rates based on targets)
3. THE Platform SHALL allow setting commission at service level (default)
4. THE Platform SHALL allow overriding commission for individual staff members
5. THE Platform SHALL allow branch-level commission overrides
6. THE Platform SHALL support commission on product sales (configurable)
7. THE Platform SHALL support commission on package/membership sales (optional, configurable)
8. THE Platform SHALL resolve commission at bill completion time (not later)

---

### Requirement 6.10: Multi-Staff Commission Split

**User Story:** As a branch manager, I want to split commission when multiple staff work on a service, so that everyone is compensated fairly.

#### Acceptance Criteria

1. THE Platform SHALL allow assigning primary stylist and assistant(s) to a service
2. THE Platform SHALL allow configuring default commission split per service (e.g., 70-30)
3. THE Platform SHALL allow manager to override split at billing time
4. THE Platform SHALL calculate and attribute commission to each staff based on split
5. THE Platform SHALL display commission breakdown per staff on bill
6. THE Platform SHALL track assistant commissions separately in reports

---

### Requirement 6.11: Attendance-Commission Correlation

**User Story:** As a salon owner, I want commission to be linked to attendance, so that only present staff earn commission.

#### Acceptance Criteria

1. THE Platform SHALL allow commission only for staff marked present on that day
2. THE Platform SHALL allow configuring late arrival penalty on commission (e.g., 10% reduction if late)
3. THE Platform SHALL allow configuring half-day commission adjustment (e.g., 50% commission for half-day)
4. THE Platform SHALL allow configuring overtime incentive (extra commission for overtime hours)
5. THE Platform SHALL make attendance-commission rules configurable per branch

---

### Requirement 6.12: Incentives & Bonuses

**User Story:** As a salon owner, I want to set targets and bonuses, so that staff are motivated to perform better.

#### Acceptance Criteria

1. THE Platform SHALL allow setting monthly revenue targets per staff
2. THE Platform SHALL allow setting service count targets per staff
3. THE Platform SHALL allow setting product sales targets per staff
4. THE Platform SHALL track progress against targets in real-time
5. THE Platform SHALL allow configuring bonus amount/percentage for achieving targets
6. THE Platform SHALL auto-calculate bonus when targets are met
7. THE Platform SHALL support tiered bonuses (different bonus for 100%, 120%, 150% achievement)
8. THE Platform SHALL display target progress on staff dashboard

---

### Requirement 6.13: Salary & Payroll

**User Story:** As a salon owner, I want to manage staff salaries, so that payroll is processed accurately.

#### Acceptance Criteria

1. THE Platform SHALL track base salary per staff
2. THE Platform SHALL calculate total earnings: Base salary + Commission + Incentives + Overtime
3. THE Platform SHALL calculate deductions: Advances, Loans EMI, Late penalties, Unpaid leave
4. THE Platform SHALL calculate net payable: Total earnings - Deductions
5. THE Platform SHALL generate monthly payslip with full breakdown
6. THE Platform SHALL allow Branch_Manager or higher roles to review and approve payroll
7. THE Platform SHALL track payroll status: Draft, Approved, Paid
8. THE Platform SHALL support payroll hold for specific staff (with reason)

---

### Requirement 6.14: Advances & Loans

**User Story:** As a branch manager, I want to track staff advances and loans, so that deductions are managed properly.

#### Acceptance Criteria

1. THE Platform SHALL allow recording advance/loan disbursement to staff
2. THE Platform SHALL store loan amount, disbursement date, EMI amount, tenure
3. THE Platform SHALL auto-calculate EMI deduction for monthly payroll
4. THE Platform SHALL track remaining loan balance
5. THE Platform SHALL mark loan as "Cleared" when fully repaid
6. THE Platform SHALL display loan history on staff profile
7. THE Platform SHALL prevent loan disbursement exceeding configurable limit
8. THE Platform SHALL require Branch_Manager or higher approval for loans

---

### Requirement 6.15: Commission Disputes

**User Story:** As a branch manager, I want to handle commission disputes, so that staff concerns are addressed fairly.

#### Acceptance Criteria

1. THE Platform SHALL allow staff to raise commission dispute with description
2. THE Platform SHALL notify Branch_Manager of pending disputes
3. THE Platform SHALL allow Branch_Manager to review disputed commission with bill details
4. THE Platform SHALL allow resolution: Approve adjustment, Reject with reason
5. THE Platform SHALL allow manual commission adjustment with mandatory reason
6. THE Platform SHALL log all dispute resolutions with user and timestamp
7. THE Platform SHALL preserve dispute history (never delete)

---

### Requirement 6.16: Staff Earnings Dashboard

**User Story:** As a staff member, I want to see my earnings, so that I know how much I've earned.

#### Acceptance Criteria

1. THE Platform SHALL display daily earnings for staff (services performed, commission earned)
2. THE Platform SHALL display monthly earnings summary (commission + incentives + overtime)
3. THE Platform SHALL display service-wise commission breakdown
4. THE Platform SHALL display target progress and bonus eligibility
5. THE Platform SHALL display upcoming payroll estimate
6. THE Platform SHALL restrict staff to viewing only their own earnings
7. THE Platform SHALL allow Branch_Manager to view earnings of branch staff
8. THE Platform SHALL allow Super_Owner to view earnings of all staff

---

### Requirement 6.17: Performance Reports

**User Story:** As a salon owner, I want to see staff performance reports, so that I can make informed HR decisions.

#### Acceptance Criteria

1. THE Platform SHALL report attendance consistency (present days, late count, leave count)
2. THE Platform SHALL report revenue generated per staff
3. THE Platform SHALL report services performed per staff
4. THE Platform SHALL report average service time vs expected duration
5. THE Platform SHALL report customer ratings per staff
6. THE Platform SHALL report rebooking rate per staff (customers who return)
7. THE Platform SHALL allow filtering reports by date range, branch, staff
8. THE Platform SHALL highlight top performers and underperformers

---

### Requirement 6.18: Staff Access Control

**User Story:** As a salon owner, I want to control access to staff data, so that sensitive information is protected.

#### Acceptance Criteria

1. THE Platform SHALL allow staff to view only their own profile, attendance, and earnings
2. THE Platform SHALL allow Branch_Manager to view and edit staff data for their branch only
3. THE Platform SHALL allow Regional_Manager to view staff data across assigned branches
4. THE Platform SHALL allow Super_Owner to view and edit all staff data
5. THE Platform SHALL mask salary information from unauthorized roles
6. THE Platform SHALL mask earnings of other staff from Stylist role
7. THE Platform SHALL log all access to sensitive staff data

---

### Requirement 6.19: Staff Audit Logs

**User Story:** As a salon owner, I want all staff-related changes logged, so that I can investigate disputes.

#### Acceptance Criteria

1. THE Platform SHALL log all attendance edits with old value, new value, user, timestamp
2. THE Platform SHALL log all commission rule changes
3. THE Platform SHALL log all manual commission adjustments with reason
4. THE Platform SHALL log all loan disbursements and adjustments
5. THE Platform SHALL log all payroll approvals
6. THE Platform SHALL log all leave approvals and rejections
7. THE Platform SHALL retain staff audit logs for minimum 7 years

---

### Requirement 6.20: Bulk Staff Operations

**User Story:** As a salon owner, I want to import staff data in bulk, so that onboarding is efficient.

#### Acceptance Criteria

1. THE Platform SHALL support bulk staff import via CSV or Excel
2. THE Platform SHALL provide template file for bulk import
3. THE Platform SHALL validate imported data and display errors before committing
4. THE Platform SHALL support bulk attendance import (for migration)
5. THE Platform SHALL support bulk leave balance setup
6. THE Platform SHALL allow Super_Owner or Regional_Manager to perform bulk operations

---

## Module 7: Inventory Management

### Requirement 7.1: Inventory Configuration

**User Story:** As a branch manager, I want to configure inventory settings, so that stock management matches our operational needs.

#### Acceptance Criteria

1. THE Platform SHALL support branch-wise inventory by default (each branch tracks its own stock)
2. THE Platform SHALL optionally support central warehouse for bulk storage and distribution
3. THE Platform SHALL use FIFO (First In First Out) for stock valuation and consumption
4. THE Platform SHALL allow configuring low-stock threshold per product per branch
5. THE Platform SHALL allow enabling/disabling expiry tracking per product category
6. THE Platform SHALL allow enabling/disabling auto stock deduction per service
7. THE Platform SHALL allow Branch_Manager or higher roles to modify inventory configuration

---

### Requirement 7.2: Product Master

**User Story:** As a salon owner, I want to maintain a product catalog, so that I can track all inventory items.

#### Acceptance Criteria

1. THE Platform SHALL store product details: name, SKU, brand, category, description
2. THE Platform SHALL store unit of measure (ml, gm, pieces, bottles)
3. THE Platform SHALL classify products by usage type: Consumable (used in services) or Retail (sold to customers)
4. THE Platform SHALL allow uploading product images
5. THE Platform SHALL optionally support barcode/SKU scanning
6. THE Platform SHALL store purchase price (cost) and selling price (MRP)
7. THE Platform SHALL store GST rate and HSN code for products
8. THE Platform SHALL allow marking products as active or inactive
9. THE Platform SHALL support product categories and sub-categories

---

### Requirement 7.3: Branch-Level Product Availability

**User Story:** As a branch manager, I want to control which products are available at my branch, so that I can manage local inventory.

#### Acceptance Criteria

1. THE Platform SHALL allow enabling/disabling products per branch
2. THE Platform SHALL allow setting branch-specific reorder levels
3. THE Platform SHALL allow temporarily disabling a product (out of circulation)
4. THE Platform SHALL allow mapping substitute products (when Product A is out, suggest Product B)
5. WHEN a product is disabled at a branch, THE Platform SHALL not show it for consumption or sale at that branch

---

### Requirement 7.4: Vendor Management

**User Story:** As a branch manager, I want to manage vendors, so that I can track where I purchase products from.

#### Acceptance Criteria

1. THE Platform SHALL store vendor details: name, contact person, phone, email, address
2. THE Platform SHALL store vendor GST number for purchase invoices
3. THE Platform SHALL allow mapping preferred vendor per product
4. THE Platform SHALL allow multiple vendors per product
5. THE Platform SHALL track last purchase price per vendor per product
6. THE Platform SHALL track lead time (days to deliver) per vendor
7. THE Platform SHALL allow marking vendors as active or inactive

---

### Requirement 7.5: Purchase Orders

**User Story:** As a branch manager, I want to create purchase orders, so that I can formally request stock from vendors.

#### Acceptance Criteria

1. THE Platform SHALL allow creating purchase orders with vendor, products, quantities, and expected prices
2. THE Platform SHALL auto-suggest reorder quantities based on low stock and consumption trends
3. THE Platform SHALL allow saving purchase orders as draft before sending
4. THE Platform SHALL track purchase order status: Draft, Sent, Partially Received, Fully Received, Cancelled
5. THE Platform SHALL allow printing or emailing purchase orders to vendors
6. THE Platform SHALL link purchase orders to goods receipts
7. THE Platform SHALL allow Branch_Manager or higher roles to create purchase orders

---

### Requirement 7.6: Goods Receipt (Stock In)

**User Story:** As a branch manager, I want to record stock received from vendors, so that inventory is updated accurately.

#### Acceptance Criteria

1. THE Platform SHALL allow creating goods receipt against a purchase order or as direct receipt
2. THE Platform SHALL record: products received, quantities, batch/lot number (optional), expiry date, purchase price
3. THE Platform SHALL allow recording free quantity (FOC - Free of Cost) separately
4. THE Platform SHALL allow partial receipt (receive less than ordered)
5. THE Platform SHALL allow quality check flag (accept/reject with reason)
6. WHEN goods are rejected, THE Platform SHALL not add them to stock
7. THE Platform SHALL link goods receipt to vendor invoice number
8. THE Platform SHALL update stock levels immediately upon receipt confirmation
9. THE Platform SHALL calculate and store cost per unit including FOC adjustment

---

### Requirement 7.7: Expiry Management

**User Story:** As a branch manager, I want to track product expiry dates, so that I can avoid using expired products.

#### Acceptance Criteria

1. THE Platform SHALL store expiry date for each stock entry
2. THE Platform SHALL auto-consume oldest stock first (FIFO)
3. THE Platform SHALL alert when products are approaching expiry (configurable days, default: 30 days)
4. THE Platform SHALL generate near-expiry reports
5. THE Platform SHALL allow marking expired stock for write-off
6. THE Platform SHALL prevent consumption of expired stock (with manager override option)
7. THE Platform SHALL track expired stock value for loss reporting

---

### Requirement 7.8: Stock Consumption

**User Story:** As a salon owner, I want stock to be deducted when services are performed, so that inventory is always accurate.

#### Acceptance Criteria

1. THE Platform SHALL auto-deduct mapped consumables when a service is completed (if enabled)
2. THE Platform SHALL deduct stock at bill completion, not at appointment creation
3. THE Platform SHALL allow manual consumption entry for spillage, wastage, or unmapped usage
4. THE Platform SHALL allow recording sample/demo consumption separately
5. THE Platform SHALL require a reason for all manual consumption entries
6. THE Platform SHALL deduct retail products from stock when sold
7. THE Platform SHALL prevent consumption if stock is insufficient (with manager override)

---

### Requirement 7.9: Inter-Branch Stock Transfer

**User Story:** As a regional manager, I want to transfer stock between branches, so that I can balance inventory across locations.

#### Acceptance Criteria

1. THE Platform SHALL allow creating stock transfer requests from one branch to another
2. THE Platform SHALL require approval from receiving branch manager
3. THE Platform SHALL track transfer status: Requested, Approved, In Transit, Received, Rejected
4. WHEN transfer is approved, THE Platform SHALL deduct stock from source branch and mark as "In Transit"
5. WHEN receiving branch confirms receipt, THE Platform SHALL add stock to receiving branch
6. THE Platform SHALL allow recording discrepancies (received less than sent)
7. THE Platform SHALL track lost-in-transit quantities
8. THE Platform SHALL maintain transfer history with all status changes

---

### Requirement 7.10: Wastage & Adjustment

**User Story:** As a branch manager, I want to record stock wastage and adjustments, so that inventory matches physical reality.

#### Acceptance Criteria

1. THE Platform SHALL allow recording wastage with reason (spillage, damage, breakage)
2. THE Platform SHALL allow recording theft/loss adjustments
3. THE Platform SHALL allow recording expired stock write-offs
4. THE Platform SHALL require mandatory reason code for all adjustments
5. THE Platform SHALL require Branch_Manager or higher approval for adjustments
6. THE Platform SHALL track adjustment value for loss reporting
7. THE Platform SHALL log all adjustments with user, timestamp, and reason

---

### Requirement 7.11: Physical Stock Audit

**User Story:** As a branch manager, I want to conduct physical stock counts, so that I can verify system accuracy.

#### Acceptance Criteria

1. THE Platform SHALL allow initiating a stock audit for a branch
2. THE Platform SHALL allow entering physical count for each product
3. THE Platform SHALL calculate variance (system stock vs physical count)
4. THE Platform SHALL calculate shrinkage value (negative variance)
5. THE Platform SHALL allow posting adjustment to reconcile system with physical count
6. THE Platform SHALL require mandatory reason for variance adjustments
7. THE Platform SHALL lock audit after posting (no further edits)
8. THE Platform SHALL maintain audit history with all counts and adjustments

---

### Requirement 7.12: Low Stock Alerts & Reordering

**User Story:** As a branch manager, I want to be alerted when stock is low, so that I can reorder in time.

#### Acceptance Criteria

1. THE Platform SHALL alert when stock falls below configured reorder level
2. THE Platform SHALL display low stock items on dashboard
3. THE Platform SHALL send notifications for critical low stock (configurable)
4. THE Platform SHALL suggest reorder quantities based on consumption trends
5. THE Platform SHALL allow generating draft purchase order from low stock list
6. THE Platform SHALL show preferred vendor for each low stock item
7. THE Platform SHALL track consumption trend for demand forecasting

---

### Requirement 7.13: Inventory Costing & Valuation

**User Story:** As a salon owner, I want to track inventory costs, so that I can understand profitability.

#### Acceptance Criteria

1. THE Platform SHALL calculate consumption cost per service based on mapped products
2. THE Platform SHALL track retail margin (selling price - cost price)
3. THE Platform SHALL identify dead stock (not consumed/sold in X days)
4. THE Platform SHALL calculate inventory turnover ratio
5. THE Platform SHALL report total inventory value at cost
6. THE Platform SHALL report potential loss from near-expiry and expired stock

---

### Requirement 7.14: Retail Product Sales

**User Story:** As a receptionist, I want to sell products to customers, so that they can purchase items for home use.

#### Acceptance Criteria

1. THE Platform SHALL allow adding retail products to customer bills
2. THE Platform SHALL apply product selling price (with optional discount)
3. THE Platform SHALL calculate GST on product sales
4. THE Platform SHALL deduct sold quantity from branch stock
5. THE Platform SHALL track staff commission on product sales (if configured)
6. THE Platform SHALL report retail sales separately from service revenue

---

### Requirement 7.15: Inventory Access Control

**User Story:** As a salon owner, I want to control who can modify inventory, so that stock data is protected.

#### Acceptance Criteria

1. THE Platform SHALL allow only Branch_Manager or higher roles to receive stock
2. THE Platform SHALL allow only Branch_Manager or higher roles to adjust stock
3. THE Platform SHALL allow only Regional_Manager or higher roles to approve inter-branch transfers
4. THE Platform SHALL allow Receptionist to record consumption (service-linked only)
5. THE Platform SHALL provide read-only inventory view for Stylist role
6. THE Platform SHALL hide cost prices from Receptionist and Stylist roles

---

### Requirement 7.16: Inventory Reports

**User Story:** As a salon owner, I want inventory reports, so that I can monitor stock health.

#### Acceptance Criteria

1. THE Platform SHALL report current stock on hand per branch
2. THE Platform SHALL report stock consumption by service
3. THE Platform SHALL report stock consumption by product
4. THE Platform SHALL report vendor-wise purchase spend
5. THE Platform SHALL report wastage and adjustment summary
6. THE Platform SHALL report expiry risk (near-expiry and expired stock)
7. THE Platform SHALL report dead stock (slow-moving items)
8. THE Platform SHALL report inventory valuation summary

---

### Requirement 7.17: Inventory Audit Logs

**User Story:** As a salon owner, I want all inventory changes logged, so that I can investigate discrepancies.

#### Acceptance Criteria

1. THE Platform SHALL log all stock-in entries with user, timestamp, and quantities
2. THE Platform SHALL log all stock-out entries with reason and user
3. THE Platform SHALL log all adjustments with reason, user, and approval
4. THE Platform SHALL log all transfers with status changes
5. THE Platform SHALL log all price changes for products
6. THE Platform SHALL prevent back-dated entries after month-end lock
7. THE Platform SHALL retain inventory audit logs for minimum 7 years

---

### Requirement 7.18: Bulk Inventory Operations

**User Story:** As a salon owner, I want to import inventory data in bulk, so that setup is efficient.

#### Acceptance Criteria

1. THE Platform SHALL support bulk product import via CSV or Excel
2. THE Platform SHALL support opening stock upload for new branches
3. THE Platform SHALL support bulk vendor import
4. THE Platform SHALL provide template files for all bulk imports
5. THE Platform SHALL validate imported data and display errors before committing
6. THE Platform SHALL allow Super_Owner or Regional_Manager to perform bulk operations

---

## Module 8: Memberships & Packages

### Requirement 8.1: Membership & Package Configuration

**User Story:** As a salon owner, I want to configure membership and package settings, so that I can customize offerings for my business.

#### Acceptance Criteria

1. THE Platform SHALL allow enabling/disabling memberships at tenant level
2. THE Platform SHALL allow enabling/disabling packages at tenant level
3. THE Platform SHALL allow configuring default validity units (days, months, years)
4. THE Platform SHALL allow configuring refund policy (refundable, non-refundable, partial)
5. THE Platform SHALL allow configuring whether memberships/packages are valid across all branches or specific branches
6. THE Platform SHALL keep memberships and packages as separate entities (not mixed)
7. THE Platform SHALL allow Branch_Manager or higher roles to modify configuration

---

### Requirement 8.2: Membership Plan Master

**User Story:** As a salon owner, I want to create membership plans, so that I can offer long-term benefits to loyal customers.

#### Acceptance Criteria

1. THE Platform SHALL allow creating membership plans with: name, description, price, validity period
2. THE Platform SHALL allow configuring applicable branches for each plan
3. THE Platform SHALL allow setting plan as active or inactive
4. THE Platform SHALL allow creating multiple membership tiers (optional - Silver, Gold, Platinum)
5. THE Platform SHALL store plan terms and conditions
6. THE Platform SHALL allow Super_Owner or Regional_Manager to create/edit membership plans

---

### Requirement 8.3: Membership Benefits Configuration

**User Story:** As a salon owner, I want to define membership benefits flexibly, so that I can create unique offerings.

#### Acceptance Criteria

1. THE Platform SHALL allow configuring flat discount percentage on all services
2. THE Platform SHALL allow configuring service-wise discount rules (different discounts for different services)
3. THE Platform SHALL allow configuring product discount percentage (optional)
4. THE Platform SHALL allow configuring complimentary services (e.g., 1 free facial per month)
5. THE Platform SHALL allow configuring priority booking flag for members
6. THE Platform SHALL allow configuring maximum services per visit limit
7. THE Platform SHALL allow configuring cooldown period between visits (e.g., 5 days)
8. THE Platform SHALL allow configuring maximum benefit cap per month/year (prevents abuse)
9. THE Platform SHALL allow configuring fallback benefit (e.g., 10% off if preferred service unavailable)

---

### Requirement 8.4: Package Master

**User Story:** As a salon owner, I want to create prepaid packages, so that customers can buy services in advance at discounted rates.

#### Acceptance Criteria

1. THE Platform SHALL support three package types: Service Package (count-based), Value Package (amount-based), Combo Package (bundle)
2. THE Platform SHALL allow creating packages with: name, description, price, validity period
3. THE Platform SHALL allow selecting included services for service packages
4. THE Platform SHALL allow setting service credits/counts for each included service
5. THE Platform SHALL allow setting package value for value packages (credits to wallet)
6. THE Platform SHALL allow configuring applicable branches
7. THE Platform SHALL allow setting package as active or inactive
8. THE Platform SHALL lock service prices at package purchase time

---

### Requirement 8.5: Package Credit Management

**User Story:** As a receptionist, I want to track package credits, so that I can accurately redeem services.

#### Acceptance Criteria

1. THE Platform SHALL track remaining credits per service for each customer's package
2. THE Platform SHALL allow partial redemption (use some credits, keep rest)
3. THE Platform SHALL prevent negative credit balance
4. THE Platform SHALL allow configuring rollover rules (credits roll over or expire)
5. THE Platform SHALL display credit balance during billing
6. THE Platform SHALL alert when credits are running low (configurable threshold)

---

### Requirement 8.6: Membership/Package Sales

**User Story:** As a receptionist, I want to sell memberships and packages, so that customers can purchase them easily.

#### Acceptance Criteria

1. THE Platform SHALL allow selling memberships and packages from billing screen
2. THE Platform SHALL generate invoice for membership/package purchase
3. THE Platform SHALL calculate and apply GST on sale
4. THE Platform SHALL require full payment to activate (no EMI for MVP)
5. THE Platform SHALL allow setting activation date (immediate or future date)
6. THE Platform SHALL send purchase confirmation via WhatsApp
7. THE Platform SHALL link membership/package to customer profile immediately

---

### Requirement 8.7: Validity & Expiry Management

**User Story:** As a salon owner, I want to manage validity and expiry, so that memberships and packages are time-bound.

#### Acceptance Criteria

1. THE Platform SHALL track validity period for each membership/package
2. THE Platform SHALL send expiry reminder 7 days before expiry (configurable)
3. THE Platform SHALL send reminder on expiry day
4. THE Platform SHALL allow configuring grace period after expiry (default: 7 days)
5. DURING grace period, THE Platform SHALL allow usage with warning
6. AFTER grace period, THE Platform SHALL block usage and mark as expired
7. THE Platform SHALL report unused credits/benefits at expiry

---

### Requirement 8.8: Membership Freeze

**User Story:** As a customer, I want to freeze my membership temporarily, so that I don't lose validity during travel or illness.

#### Acceptance Criteria

1. THE Platform SHALL allow freezing membership for a specified period
2. WHEN membership is frozen, THE Platform SHALL extend validity by freeze duration
3. THE Platform SHALL allow configuring maximum freeze duration (e.g., 30 days per year)
4. THE Platform SHALL require reason for freeze (travel, medical, etc.)
5. THE Platform SHALL block membership benefits during freeze period
6. THE Platform SHALL allow Branch_Manager or higher to approve freeze requests
7. THE Platform SHALL log all freeze actions with reason and approver

---

### Requirement 8.9: Redemption Engine

**User Story:** As a receptionist, I want to redeem membership benefits and package credits during billing, so that customers get their entitled benefits.

#### Acceptance Criteria

1. THE Platform SHALL check membership/package validity before redemption
2. THE Platform SHALL check branch eligibility before redemption
3. THE Platform SHALL check service availability in package before redemption
4. THE Platform SHALL apply membership discount automatically during billing
5. THE Platform SHALL allow selecting package credits to redeem
6. THE Platform SHALL deduct credits atomically (all or nothing)
7. THE Platform SHALL lock redemption snapshot (no recalculation later)
8. THE Platform SHALL NOT apply additional discount on package redemption (already discounted)

---

### Requirement 8.10: Membership vs Package Precedence

**User Story:** As a salon owner, I want clear rules when customer has both membership and package, so that billing is consistent.

#### Acceptance Criteria

1. THE Platform SHALL define precedence rules for membership vs package
2. THE Platform SHALL allow configuring: Package redemption first, then membership discount on remaining
3. THE Platform SHALL allow configuring: Membership discount only (no package stacking)
4. THE Platform SHALL allow configuring: Customer chooses which to use
5. THE Platform SHALL display applied benefits clearly on bill
6. THE Platform SHALL allow manager override with reason

---

### Requirement 8.11: Refund & Transfer

**User Story:** As a branch manager, I want to handle refunds and transfers, so that customer requests are addressed fairly.

#### Acceptance Criteria

1. THE Platform SHALL allow refunding unused membership/package balance
2. THE Platform SHALL calculate refund based on: paid amount - used value - cancellation fee (if any)
3. THE Platform SHALL refund to customer wallet by default
4. THE Platform SHALL allow cash refund with manager approval
5. THE Platform SHALL allow transferring membership/package to another customer (family)
6. THE Platform SHALL require verification for transfer (OTP or physical card)
7. THE Platform SHALL log all refunds and transfers with reason and approver

---

### Requirement 8.12: Multi-Branch Usage Tracking

**User Story:** As a salon owner, I want to track cross-branch usage, so that I can understand usage patterns and settle accounts.

#### Acceptance Criteria

1. THE Platform SHALL track which branch sold the membership/package
2. THE Platform SHALL track which branch redeemed each usage
3. THE Platform SHALL report cross-branch usage summary
4. THE Platform SHALL calculate liability per branch (sold vs redeemed)
5. THE Platform SHALL allow owners to view consolidated cross-branch report
6. THE Platform SHALL NOT auto-settle between branches (manual settlement based on report)

---

### Requirement 8.13: Usage History & Transparency

**User Story:** As a customer, I want to see my membership/package usage history, so that I know my remaining benefits.

#### Acceptance Criteria

1. THE Platform SHALL display full usage history for each membership/package
2. THE Platform SHALL display remaining balance/credits
3. THE Platform SHALL display expiry date and days remaining
4. THE Platform SHALL display past redemptions with dates and services
5. THE Platform SHALL allow staff to show usage summary to customer
6. THE Platform SHALL send usage summary via WhatsApp on request

---

### Requirement 8.14: Commission on Memberships & Packages

**User Story:** As a salon owner, I want to configure commission on membership/package sales, so that staff are incentivized to sell.

#### Acceptance Criteria

1. THE Platform SHALL allow configuring commission on membership/package sale (% or flat)
2. THE Platform SHALL attribute sale commission to staff who sold
3. THE Platform SHALL allow configuring commission on redemption (service provider)
4. THE Platform SHALL handle commission reversal on refund
5. THE Platform SHALL track sale commission and redemption commission separately
6. THE Platform SHALL make commission configurable per plan/package

---

### Requirement 8.15: Notifications

**User Story:** As a salon owner, I want automated notifications for memberships and packages, so that customers stay informed.

#### Acceptance Criteria

1. THE Platform SHALL send purchase confirmation via WhatsApp
2. THE Platform SHALL send usage alert after each redemption
3. THE Platform SHALL send expiry reminder 7 days before
4. THE Platform SHALL send low balance alert when credits fall below threshold
5. THE Platform SHALL send renewal reminder after expiry
6. THE Platform SHALL allow configuring notification preferences

---

### Requirement 8.16: Membership & Package Reports

**User Story:** As a salon owner, I want reports on memberships and packages, so that I can track performance and liability.

#### Acceptance Criteria

1. THE Platform SHALL report total memberships/packages sold (count and value)
2. THE Platform SHALL report active vs expired memberships/packages
3. THE Platform SHALL report total redeemed value
4. THE Platform SHALL report outstanding balance (sold - redeemed)
5. THE Platform SHALL report usage vs expiry losses (unused credits that expired)
6. THE Platform SHALL report cross-branch usage summary
7. THE Platform SHALL report membership/package ROI (revenue generated from members)

---

### Requirement 8.17: Access Control

**User Story:** As a salon owner, I want to control who can manage memberships and packages, so that pricing and refunds are protected.

#### Acceptance Criteria

1. THE Platform SHALL allow only Super_Owner or Regional_Manager to create/edit plans
2. THE Platform SHALL allow Receptionist to sell memberships/packages
3. THE Platform SHALL allow only Branch_Manager or higher to process refunds
4. THE Platform SHALL allow only Branch_Manager or higher to approve transfers
5. THE Platform SHALL allow only Branch_Manager or higher to override redemption rules
6. THE Platform SHALL log all sensitive actions

---

### Requirement 8.18: Audit Logs

**User Story:** As a salon owner, I want all membership/package actions logged, so that I can investigate disputes.

#### Acceptance Criteria

1. THE Platform SHALL log all plan/package creation and edits
2. THE Platform SHALL log all sales with customer, amount, and staff
3. THE Platform SHALL log all redemptions with services and credits used
4. THE Platform SHALL log all refunds with reason and approver
5. THE Platform SHALL log all transfers with from/to customer
6. THE Platform SHALL log all freeze actions
7. THE Platform SHALL retain logs for minimum 7 years

---

### Requirement 8.19: Bulk Operations

**User Story:** As a salon owner, I want to import membership/package data in bulk, so that migration is efficient.

#### Acceptance Criteria

1. THE Platform SHALL support bulk membership import via CSV/Excel
2. THE Platform SHALL support bulk package balance upload for existing customers
3. THE Platform SHALL validate imported data before committing
4. THE Platform SHALL allow mass expiry operations (extend all expiring packages)
5. THE Platform SHALL allow Super_Owner to perform bulk operations

---

## Module 9: Expenses & Finance

### Requirement 9.1: Financial Year Configuration

**User Story:** As a salon owner, I want to configure the financial year, so that all financial reports align with Indian tax requirements.

#### Acceptance Criteria

1. THE Platform SHALL default to Indian financial year (April 1 to March 31)
2. THE Platform SHALL allow Super_Owner to configure financial year start month
3. THE Platform SHALL track all financial data by financial year
4. THE Platform SHALL auto-create new financial year on April 1 (or configured start date)
5. THE Platform SHALL carry forward relevant balances to new financial year
6. THE Platform SHALL display current financial year prominently in finance module
7. THE Platform SHALL allow viewing historical data by financial year

---

### Requirement 9.2: Expense Categories

**User Story:** As a branch manager, I want to categorize expenses, so that I can track and analyze spending patterns.

#### Acceptance Criteria

1. THE Platform SHALL provide pre-defined expense categories: Rent, Utilities (Electricity, Water, Internet), Salaries & Wages, Consumables, Equipment & Maintenance, Marketing & Advertising, Professional Services, Insurance, Taxes & Licenses, Miscellaneous
2. THE Platform SHALL allow creating custom expense categories at tenant level
3. THE Platform SHALL allow creating sub-categories under main categories
4. THE Platform SHALL classify expenses as Direct (service-related) or Indirect (overhead)
5. THE Platform SHALL classify expenses as Capital (assets) or Operational (recurring)
6. THE Platform SHALL allow marking categories as active or inactive
7. THE Platform SHALL allow Branch_Manager or higher roles to manage expense categories

---

### Requirement 9.3: Expense Entry

**User Story:** As a branch manager, I want to record expenses, so that I can track all business spending.

#### Acceptance Criteria

1. WHEN creating an expense, THE Platform SHALL collect: date, category, amount, description, branch, payment method
2. THE Platform SHALL allow attaching receipt/invoice image or PDF
3. THE Platform SHALL allow selecting vendor from vendor master (optional)
4. THE Platform SHALL allow entering vendor invoice number for reference
5. THE Platform SHALL capture GST amount paid on expense (for input tracking)
6. THE Platform SHALL allow tagging expense as recurring or one-time
7. THE Platform SHALL allow adding internal notes
8. THE Platform SHALL default expense date to current date
9. THE Platform SHALL allow Receptionist or higher roles to create expense entries

---

### Requirement 9.4: Back-Date Controls

**User Story:** As a salon owner, I want to control back-dated expense entries, so that financial records remain accurate.

#### Acceptance Criteria

1. THE Platform SHALL allow configuring maximum back-date limit (default: 7 days)
2. WHEN expense date is beyond back-date limit, THE Platform SHALL require Branch_Manager or higher approval
3. THE Platform SHALL NOT allow expenses in closed/locked periods
4. THE Platform SHALL NOT allow expenses in previous financial year after year closure
5. THE Platform SHALL log all back-dated entries with approval details

---

### Requirement 9.5: Expense Approval Workflow

**User Story:** As a salon owner, I want approval for large expenses, so that spending is controlled.

#### Acceptance Criteria

1. THE Platform SHALL allow configuring expense approval threshold per branch (e.g., expenses > ₹5,000 need approval)
2. WHEN expense exceeds threshold, THE Platform SHALL create pending approval request
3. THE Platform SHALL notify Branch_Manager or higher of pending approvals
4. THE Platform SHALL allow approving or rejecting with comments
5. THE Platform SHALL track expense status: Draft, Pending Approval, Approved, Rejected, Paid
6. THE Platform SHALL allow configuring approval hierarchy (Branch_Manager → Regional_Manager → Super_Owner)
7. THE Platform SHALL log all approval actions with user and timestamp

---

### Requirement 9.6: Recurring Expenses

**User Story:** As a branch manager, I want to set up recurring expenses, so that regular payments are tracked automatically.

#### Acceptance Criteria

1. THE Platform SHALL allow marking an expense as recurring
2. THE Platform SHALL support recurrence patterns: Daily, Weekly, Monthly, Quarterly, Yearly
3. THE Platform SHALL auto-generate expense entries based on recurrence schedule
4. THE Platform SHALL send reminder before recurring expense is due
5. THE Platform SHALL allow pausing or stopping recurring expenses
6. THE Platform SHALL allow editing future occurrences without affecting past entries
7. THE Platform SHALL track recurring expense history

---

### Requirement 9.7: Branch-Wise Expense Allocation

**User Story:** As a salon owner, I want to allocate shared expenses across branches, so that branch-level P&L is accurate.

#### Acceptance Criteria

1. THE Platform SHALL allow marking expense as single-branch or multi-branch
2. WHEN expense is multi-branch, THE Platform SHALL allow manual allocation percentages
3. THE Platform SHALL allow saving allocation rules for recurring shared expenses
4. THE Platform SHALL validate that allocation percentages sum to 100%
5. THE Platform SHALL track allocated amount per branch for reporting
6. THE Platform SHALL allow Regional_Manager or higher to allocate shared expenses
7. THE Platform SHALL display shared expense indicator in branch reports

---

### Requirement 9.8: Petty Cash Management

**User Story:** As a branch manager, I want to manage petty cash, so that small daily expenses are tracked properly.

#### Acceptance Criteria

1. THE Platform SHALL allow setting petty cash float amount per branch
2. THE Platform SHALL track petty cash balance (float - expenses + replenishments)
3. THE Platform SHALL allow recording petty cash expenses with receipt
4. THE Platform SHALL require daily petty cash reconciliation
5. THE Platform SHALL alert when petty cash balance falls below threshold
6. THE Platform SHALL allow recording petty cash replenishment
7. THE Platform SHALL require Branch_Manager approval for petty cash variances
8. THE Platform SHALL generate petty cash register report

---

### Requirement 9.9: Vendor Payment Tracking

**User Story:** As a branch manager, I want to track vendor payments, so that I know what's paid and what's pending.

#### Acceptance Criteria

1. THE Platform SHALL allow marking expense as Paid or Unpaid
2. THE Platform SHALL track payment date separately from expense date
3. THE Platform SHALL allow recording payment reference (cheque number, transaction ID)
4. THE Platform SHALL display pending payments summary on dashboard
5. THE Platform SHALL allow filtering expenses by payment status
6. THE Platform SHALL send reminder for overdue payments (optional)
7. THE Platform SHALL NOT maintain full accounts payable ledger (simple tracking only)

---

### Requirement 9.10: Salary Integration

**User Story:** As a salon owner, I want salary expenses pulled from staff management, so that there's no double entry.

#### Acceptance Criteria

1. THE Platform SHALL auto-create salary expense entries from approved payroll (Module 6)
2. THE Platform SHALL categorize salary expenses under "Salaries & Wages" category
3. THE Platform SHALL link salary expense to payroll record
4. THE Platform SHALL allocate salary to staff's assigned branch
5. THE Platform SHALL NOT allow manual salary expense entry (must come from payroll)
6. THE Platform SHALL include commission and incentives in salary expense
7. THE Platform SHALL reverse salary expense if payroll is reversed

---

### Requirement 9.11: GST Input Tracking

**User Story:** As a salon owner, I want to track GST paid on expenses, so that I can claim input credit.

#### Acceptance Criteria

1. THE Platform SHALL allow capturing GST amount on expense entries
2. THE Platform SHALL allow specifying GST type: CGST+SGST or IGST
3. THE Platform SHALL store vendor GSTIN for GST-applicable expenses
4. THE Platform SHALL generate GST input summary report by period
5. THE Platform SHALL NOT maintain full GST ledger (simple tracking for reporting)
6. THE Platform SHALL export GST input data for external accounting software
7. THE Platform SHALL flag expenses without GST details for review (when vendor has GSTIN)

---

### Requirement 9.12: Period Close & Lock

**User Story:** As a salon owner, I want to close and lock financial periods, so that historical data cannot be modified.

#### Acceptance Criteria

1. THE Platform SHALL support monthly period close
2. THE Platform SHALL allow Branch_Manager to initiate period close for their branch
3. THE Platform SHALL require all pending approvals to be resolved before close
4. THE Platform SHALL require petty cash reconciliation before close
5. WHEN period is closed, THE Platform SHALL lock all expense entries for that period
6. THE Platform SHALL allow Super_Owner to reopen a closed period (exceptional cases)
7. THE Platform SHALL log all period close and reopen actions
8. THE Platform SHALL display period status (Open, Closed) clearly

---

### Requirement 9.13: Opening Balance Entry

**User Story:** As a salon owner, I want to enter opening balances when starting the system, so that financial tracking is complete.

#### Acceptance Criteria

1. THE Platform SHALL allow entering opening cash balance per branch
2. THE Platform SHALL allow entering opening petty cash balance
3. THE Platform SHALL allow entering outstanding vendor payments (payables)
4. THE Platform SHALL allow entering opening balances only during initial setup or new financial year
5. THE Platform SHALL lock opening balances after first transaction
6. THE Platform SHALL require Super_Owner approval for opening balance entry
7. THE Platform SHALL log all opening balance entries

---

### Requirement 9.14: Cash Flow Tracking

**User Story:** As a salon owner, I want to see cash flow, so that I understand money movement in my business.

#### Acceptance Criteria

1. THE Platform SHALL track cash inflows: Sales revenue, Wallet top-ups, Membership/Package sales
2. THE Platform SHALL track cash outflows: Expenses, Refunds, Vendor payments
3. THE Platform SHALL display daily cash position per branch
4. THE Platform SHALL display weekly/monthly cash flow summary
5. THE Platform SHALL NOT perform bank reconciliation (simple tracking only)
6. THE Platform SHALL highlight days with negative cash flow
7. THE Platform SHALL allow Branch_Manager or higher to view cash flow reports

---

### Requirement 9.15: Operational P&L

**User Story:** As a salon owner, I want to see profit and loss, so that I know if my business is profitable.

#### Acceptance Criteria

1. THE Platform SHALL calculate Revenue: Service sales + Product sales + Membership/Package sales
2. THE Platform SHALL calculate Direct Costs: Consumables used, Staff commissions
3. THE Platform SHALL calculate Gross Profit: Revenue - Direct Costs
4. THE Platform SHALL calculate Operating Expenses: All indirect expenses
5. THE Platform SHALL calculate Net Operating Profit: Gross Profit - Operating Expenses
6. THE Platform SHALL generate P&L by branch and consolidated
7. THE Platform SHALL generate P&L by period (monthly, quarterly, yearly)
8. THE Platform SHALL NOT include depreciation or complex accounting adjustments (operational P&L only)
9. THE Platform SHALL allow comparison with previous periods

---

### Requirement 9.16: Budget Management (Optional)

**User Story:** As a salon owner, I want to set budgets, so that I can control spending.

#### Acceptance Criteria

1. THE Platform SHALL allow setting monthly budget per expense category per branch
2. THE Platform SHALL track actual vs budget spending
3. THE Platform SHALL alert when spending exceeds budget threshold (e.g., 80%, 100%)
4. THE Platform SHALL display budget utilization on dashboard
5. THE Platform SHALL generate budget variance report
6. THE Platform SHALL allow copying previous period budget as template
7. THE Platform SHALL make budget feature optional (can be disabled)
8. THE Platform SHALL allow Branch_Manager or higher to set budgets

---

### Requirement 9.17: Expense Reports

**User Story:** As a salon owner, I want expense reports, so that I can analyze spending patterns.

#### Acceptance Criteria

1. THE Platform SHALL report expenses by category
2. THE Platform SHALL report expenses by branch
3. THE Platform SHALL report expenses by vendor
4. THE Platform SHALL report expenses by payment method
5. THE Platform SHALL report recurring vs one-time expenses
6. THE Platform SHALL report month-over-month expense trends
7. THE Platform SHALL report top expense categories
8. THE Platform SHALL allow exporting reports to Excel/PDF

---

### Requirement 9.18: Finance Access Control

**User Story:** As a salon owner, I want to control who can access financial data, so that sensitive information is protected.

#### Acceptance Criteria

1. THE Platform SHALL allow Receptionist to create expense entries (within limits)
2. THE Platform SHALL allow Branch_Manager to approve expenses and view branch financials
3. THE Platform SHALL allow Accountant to view all financial data and reports
4. THE Platform SHALL allow Regional_Manager to view financials for assigned branches
5. THE Platform SHALL allow Super_Owner full access to all financial data
6. THE Platform SHALL hide P&L and cash flow from Receptionist and Stylist roles
7. THE Platform SHALL restrict period close to Branch_Manager or higher

---

### Requirement 9.19: Finance Audit Logs

**User Story:** As a salon owner, I want all financial actions logged, so that I can investigate discrepancies.

#### Acceptance Criteria

1. THE Platform SHALL log all expense creation with user, timestamp, and amount
2. THE Platform SHALL log all expense edits with old value, new value, and user
3. THE Platform SHALL log all approval actions with decision and user
4. THE Platform SHALL log all period close and reopen actions
5. THE Platform SHALL log all opening balance entries
6. THE Platform SHALL log all petty cash transactions
7. THE Platform SHALL retain finance audit logs for minimum 7 years

---

### Requirement 9.20: Bulk Expense Operations

**User Story:** As a salon owner, I want to import expenses in bulk, so that data entry is efficient.

#### Acceptance Criteria

1. THE Platform SHALL support bulk expense import via CSV or Excel
2. THE Platform SHALL provide template file for bulk import
3. THE Platform SHALL validate imported data and display errors before committing
4. THE Platform SHALL support bulk categorization of uncategorized expenses
5. THE Platform SHALL allow Super_Owner or Accountant to perform bulk operations

---

## Module 10: Reports & Analytics

### Requirement 10.1: Reporting Configuration

**User Story:** As a salon owner, I want to configure reporting settings, so that reports are accurate and consistent.

#### Acceptance Criteria

1. THE Platform SHALL use Indian financial year (April-March) as default reporting calendar
2. THE Platform SHALL only generate reports from locked/closed period data for financial reports
3. THE Platform SHALL allow configuring report refresh frequency (real-time for dashboards, daily for heavy reports)
4. THE Platform SHALL allow configuring branch inclusion rules (active branches only, or include inactive)
5. THE Platform SHALL apply consistent currency and rounding rules across all reports
6. THE Platform SHALL display data freshness timestamp on all reports
7. THE Platform SHALL allow Super_Owner to configure reporting settings

---

### Requirement 10.2: Data Snapshot Engine

**User Story:** As a salon owner, I want historical report data preserved accurately, so that past reports don't change when current data changes.

#### Acceptance Criteria

1. THE Platform SHALL create daily snapshots of key metrics (revenue, expenses, inventory)
2. THE Platform SHALL store snapshots immutably (no modification after creation)
3. THE Platform SHALL use snapshots for historical reports (not recalculate from live data)
4. THE Platform SHALL maintain snapshot history for minimum 7 years
5. THE Platform SHALL optimize report queries using pre-aggregated snapshot data
6. THE Platform SHALL allow rebuilding snapshots from source data if needed (admin only)
7. THE Platform SHALL version snapshots to track any rebuilds

---

### Requirement 10.3: Executive Dashboard

**User Story:** As a salon owner, I want a simple dashboard showing key business metrics, so that I can quickly understand business health.

#### Acceptance Criteria

1. THE Platform SHALL display total revenue for selected period (today, this week, this month)
2. THE Platform SHALL display estimated profit (revenue - direct costs - expenses)
3. THE Platform SHALL display cash in hand across all branches
4. THE Platform SHALL display outstanding dues (pending vendor payments + package liability)
5. THE Platform SHALL display top performing branch by revenue
6. THE Platform SHALL display red flag alerts (declining sales, rising costs, high wastage)
7. THE Platform SHALL keep the dashboard brutally simple (max 6-8 key metrics)
8. THE Platform SHALL auto-refresh dashboard data in real-time
9. THE Platform SHALL allow drilling down from any metric to detailed report

---

### Requirement 10.4: Role-Based Dashboards

**User Story:** As a platform user, I want to see a dashboard relevant to my role, so that I can focus on what matters to me.

#### Acceptance Criteria

1. WHEN Super_Owner logs in, THE Platform SHALL display business-wide KPIs, multi-branch comparison, and alerts
2. WHEN Regional_Manager logs in, THE Platform SHALL display assigned branches summary and comparative performance
3. WHEN Branch_Manager logs in, THE Platform SHALL display branch KPIs, today's appointments, staff attendance, and cash position
4. WHEN Receptionist logs in, THE Platform SHALL display today's appointments, walk-in queue, and pending bills
5. WHEN Stylist logs in, THE Platform SHALL display their appointments, earnings summary, and target progress
6. WHEN Accountant logs in, THE Platform SHALL display financial summaries, pending approvals, and GST reports
7. THE Platform SHALL hide sensitive metrics (profit, margins) from unauthorized roles

---

### Requirement 10.5: Revenue & Sales Reports

**User Story:** As a salon owner, I want detailed revenue reports, so that I can understand sales performance.

#### Acceptance Criteria

1. THE Platform SHALL report daily, weekly, and monthly revenue
2. THE Platform SHALL report branch-wise revenue with comparison
3. THE Platform SHALL report service-wise revenue breakdown
4. THE Platform SHALL report product vs service revenue split
5. THE Platform SHALL report average bill value (total revenue / bill count)
6. THE Platform SHALL report payment method breakdown (Cash, UPI, Card, Wallet)
7. THE Platform SHALL report discount impact (total discounts given, % of revenue)
8. THE Platform SHALL report growth comparison (MoM, YoY)
9. THE Platform SHALL ensure revenue reports match billing data exactly (reconcilable)
10. THE Platform SHALL allow filtering by date range, branch, service category

---

### Requirement 10.6: Appointment & Utilization Reports

**User Story:** As a branch manager, I want appointment analytics, so that I can optimize operations and staffing.

#### Acceptance Criteria

1. THE Platform SHALL report total appointment count by type (Online, Phone, Walk-in)
2. THE Platform SHALL report appointment status breakdown (Completed, Cancelled, No-show)
3. THE Platform SHALL report no-show rate (no-shows / total bookings)
4. THE Platform SHALL report cancellation rate and reasons
5. THE Platform SHALL report peak hours analysis (busiest times of day/week)
6. THE Platform SHALL report average wait time for walk-ins
7. THE Platform SHALL report staff utilization percentage (booked hours / available hours)
8. THE Platform SHALL report slot utilization (booked slots / available slots)
9. THE Platform SHALL identify underutilized time slots for optimization
10. THE Platform SHALL allow filtering by date range, branch, stylist

---

### Requirement 10.7: Staff Performance Reports

**User Story:** As a salon owner, I want staff performance analytics, so that I can identify top performers and areas for improvement.

#### Acceptance Criteria

1. THE Platform SHALL report revenue generated per staff member
2. THE Platform SHALL report services performed count per staff
3. THE Platform SHALL report average service time vs expected duration
4. THE Platform SHALL report commission earned per staff
5. THE Platform SHALL report attendance consistency (present days, late count, leave count)
6. THE Platform SHALL report customer ratings per staff (average rating)
7. THE Platform SHALL report rebooking rate (customers who return to same stylist)
8. THE Platform SHALL report target achievement percentage
9. THE Platform SHALL display staff leaderboard (top performers)
10. THE Platform SHALL pull data from billing and attendance only (single source of truth)
11. THE Platform SHALL allow filtering by date range, branch, staff

---

### Requirement 10.8: Customer Analytics Reports

**User Story:** As a salon owner, I want customer analytics, so that I can understand customer behavior and improve retention.

#### Acceptance Criteria

1. THE Platform SHALL report new vs repeat customer ratio
2. THE Platform SHALL report customer acquisition by source (walk-in, online, referral)
3. THE Platform SHALL report customer lifetime value (total spend per customer)
4. THE Platform SHALL report visit frequency distribution
5. THE Platform SHALL report average days between visits
6. THE Platform SHALL report inactive customers (no visit in X days)
7. THE Platform SHALL report churn risk (customers likely to leave)
8. THE Platform SHALL report membership penetration (members / total customers)
9. THE Platform SHALL report loyalty points liability (unredeemed points value)
10. THE Platform SHALL report top customers by spend
11. THE Platform SHALL allow filtering by date range, branch, customer segment

---

### Requirement 10.9: Inventory Reports

**User Story:** As a branch manager, I want inventory analytics, so that I can control costs and prevent wastage.

#### Acceptance Criteria

1. THE Platform SHALL report current stock levels per branch
2. THE Platform SHALL report inventory consumption by service
3. THE Platform SHALL report inventory consumption by product
4. THE Platform SHALL report wastage percentage and value
5. THE Platform SHALL report dead stock (items not used in X days)
6. THE Platform SHALL report inventory turnover ratio
7. THE Platform SHALL report cost of service (consumables used per service)
8. THE Platform SHALL report near-expiry and expired stock value
9. THE Platform SHALL report vendor-wise purchase summary
10. THE Platform SHALL report stock variance (audit discrepancies)
11. THE Platform SHALL allow filtering by date range, branch, product category

---

### Requirement 10.10: Membership & Package Reports

**User Story:** As a salon owner, I want membership and package analytics, so that I can track prepaid revenue and liability.

#### Acceptance Criteria

1. THE Platform SHALL report active memberships count and value
2. THE Platform SHALL report active packages count and value
3. THE Platform SHALL report package liability (sold value - redeemed value)
4. THE Platform SHALL report usage vs expiry loss (credits that expired unused)
5. THE Platform SHALL report membership ROI (revenue from members vs membership cost)
6. THE Platform SHALL report branch-wise membership/package sales
7. THE Platform SHALL report renewal rate (memberships renewed / expired)
8. THE Platform SHALL report redemption patterns (services most redeemed)
9. THE Platform SHALL report cross-branch usage summary
10. THE Platform SHALL allow filtering by date range, branch, plan type

---

### Requirement 10.11: Expense & Finance Reports

**User Story:** As a salon owner, I want expense analytics, so that I can control costs and improve profitability.

#### Acceptance Criteria

1. THE Platform SHALL report total expenses by period
2. THE Platform SHALL report category-wise expense breakdown
3. THE Platform SHALL report branch-wise expense allocation
4. THE Platform SHALL report budget vs actual spending
5. THE Platform SHALL report expense trends (MoM comparison)
6. THE Platform SHALL report top expense categories
7. THE Platform SHALL report recurring vs one-time expenses
8. THE Platform SHALL report vendor-wise payment summary
9. THE Platform SHALL report petty cash utilization
10. THE Platform SHALL NOT allow manual edits to report data (read-only from source)
11. THE Platform SHALL allow filtering by date range, branch, category

---

### Requirement 10.12: Profit & Loss Reports

**User Story:** As a salon owner, I want P&L reports, so that I know if my business is profitable.

#### Acceptance Criteria

1. THE Platform SHALL report gross revenue (services + products + memberships/packages)
2. THE Platform SHALL report cost of services (consumables, commissions)
3. THE Platform SHALL report gross profit (revenue - cost of services)
4. THE Platform SHALL report staff costs (salaries, incentives)
5. THE Platform SHALL report operating expenses (rent, utilities, marketing, etc.)
6. THE Platform SHALL report net operating profit (gross profit - staff costs - operating expenses)
7. THE Platform SHALL generate P&L per branch
8. THE Platform SHALL generate consolidated P&L across all branches
9. THE Platform SHALL generate P&L by period (monthly, quarterly, yearly)
10. THE Platform SHALL allow comparison with previous periods
11. THE Platform SHALL restrict P&L access to Super_Owner and Accountant only

---

### Requirement 10.13: GST & Tax Reports

**User Story:** As a salon owner, I want GST reports, so that I can file accurate tax returns.

#### Acceptance Criteria

1. THE Platform SHALL report GST collected on sales (output tax)
2. THE Platform SHALL report GST paid on purchases (input tax)
3. THE Platform SHALL report net GST liability (output - input)
4. THE Platform SHALL report branch-wise GST liability (for businesses with multiple GSTINs)
5. THE Platform SHALL report CGST, SGST, IGST breakup
6. THE Platform SHALL report GST by SAC/HSN code
7. THE Platform SHALL report credit notes and their GST impact
8. THE Platform SHALL report refund adjustments
9. THE Platform SHALL generate GST summary in format compatible with GSTR filing
10. THE Platform SHALL allow filtering by date range, branch, tax type
11. THE Platform SHALL ensure GST reports are 100% accurate (no estimation)

---

### Requirement 10.14: Comparison & Trend Reports

**User Story:** As a salon owner, I want comparison reports, so that I can make data-driven decisions.

#### Acceptance Criteria

1. THE Platform SHALL support period comparison (this month vs last month, this year vs last year)
2. THE Platform SHALL support branch comparison (side-by-side metrics)
3. THE Platform SHALL support staff comparison (leaderboards, rankings)
4. THE Platform SHALL support service comparison (growth trends by service)
5. THE Platform SHALL visualize trends with charts and graphs
6. THE Platform SHALL highlight significant changes (>10% variance)
7. THE Platform SHALL allow custom period selection for comparison
8. THE Platform SHALL export comparison reports with visualizations

---

### Requirement 10.15: Report Filters & Drill-Down

**User Story:** As a report user, I want to filter and drill down into reports, so that I can analyze specific data.

#### Acceptance Criteria

1. THE Platform SHALL provide date range filter on all reports
2. THE Platform SHALL provide branch filter on all reports (for multi-branch users)
3. THE Platform SHALL provide staff filter where applicable
4. THE Platform SHALL provide service/category filter where applicable
5. THE Platform SHALL provide customer segment filter where applicable
6. THE Platform SHALL allow saving filter presets for quick access
7. THE Platform SHALL allow drilling down from summary to detail (click on metric to see breakdown)
8. THE Platform SHALL maintain filter context when drilling down
9. THE Platform SHALL display applied filters clearly on report

---

### Requirement 10.16: Alerts & Anomaly Detection

**User Story:** As a salon owner, I want automated alerts for business anomalies, so that I can act on problems quickly.

#### Acceptance Criteria

1. THE Platform SHALL alert when revenue drops more than configurable threshold (default: 20%) vs previous period
2. THE Platform SHALL alert when wastage exceeds configurable threshold
3. THE Platform SHALL alert when discount percentage exceeds configurable limit
4. THE Platform SHALL alert when staff performance drops significantly
5. THE Platform SHALL alert when inventory variance is detected (audit mismatch)
6. THE Platform SHALL alert when no-show rate exceeds threshold
7. THE Platform SHALL allow configuring alert thresholds per metric
8. THE Platform SHALL allow enabling/disabling individual alerts
9. THE Platform SHALL send alerts via WhatsApp and in-app notification
10. THE Platform SHALL display active alerts on dashboard
11. THE Platform SHALL make alerts feature optional (can be disabled)

---

### Requirement 10.17: Report Export & Sharing

**User Story:** As a salon owner, I want to export and share reports, so that I can use them outside the platform.

#### Acceptance Criteria

1. THE Platform SHALL support Excel export for all reports
2. THE Platform SHALL support PDF export for all reports
3. THE Platform SHALL support CSV export for data-heavy reports
4. THE Platform SHALL include applied filters in exported report header
5. THE Platform SHALL include generation timestamp in exported reports
6. THE Platform SHALL allow sharing reports via WhatsApp
7. THE Platform SHALL allow sharing reports via Email
8. THE Platform SHALL allow downloading reports directly
9. THE Platform SHALL lock data before export (ensure consistency)
10. THE Platform SHALL log all report exports with user and timestamp

---

### Requirement 10.18: Scheduled Reports

**User Story:** As a salon owner, I want reports sent to me automatically, so that I don't have to generate them manually.

#### Acceptance Criteria

1. THE Platform SHALL allow scheduling reports for automatic generation
2. THE Platform SHALL support daily, weekly, and monthly schedules
3. THE Platform SHALL allow selecting report type and filters for scheduled reports
4. THE Platform SHALL allow selecting delivery method (Email, WhatsApp)
5. THE Platform SHALL allow selecting recipients (multiple email addresses)
6. THE Platform SHALL send scheduled reports at configured time
7. THE Platform SHALL log scheduled report delivery status
8. THE Platform SHALL allow pausing or deleting scheduled reports
9. THE Platform SHALL allow Super_Owner and Branch_Manager to configure scheduled reports

---

### Requirement 10.19: Report Audit & Reconciliation

**User Story:** As a salon owner, I want to verify report accuracy, so that I can trust the numbers.

#### Acceptance Criteria

1. THE Platform SHALL provide source traceability for all report metrics (click to see source transactions)
2. THE Platform SHALL allow comparing report totals with source module totals
3. THE Platform SHALL flag discrepancies between report and source data
4. THE Platform SHALL display calculation methodology for complex metrics
5. THE Platform SHALL allow rebuilding reports from source data (admin function)
6. THE Platform SHALL allow rebuilding reports from source data (admin function)
7. THE Platform SHALL maintain audit trail of report generation
8. THE Platform SHALL answer "ye number kaha se aaya?" for any metric

---

### Requirement 10.20: Report Access Control

**User Story:** As a salon owner, I want to control who can access which reports, so that sensitive data is protected.

#### Acceptance Criteria

1. THE Platform SHALL allow Stylist to view only their own performance reports
2. THE Platform SHALL allow Receptionist to view operational reports (appointments, daily sales)
3. THE Platform SHALL allow Branch_Manager to view all reports for their branch
4. THE Platform SHALL allow Regional_Manager to view reports for assigned branches
5. THE Platform SHALL allow Accountant to view all financial and tax reports
6. THE Platform SHALL allow Super_Owner to view all reports across all branches
7. THE Platform SHALL hide profit margins and P&L from non-owner roles
8. THE Platform SHALL hide staff salary details from unauthorized roles
9. THE Platform SHALL log access to sensitive reports

---

## Module 11: Marketing & Engagement

### Requirement 11.1: Marketing Configuration

**User Story:** As a salon owner, I want to configure marketing settings, so that I can control how marketing operates for my business.

#### Acceptance Criteria

1. THE Platform SHALL allow enabling/disabling marketing module at tenant level
2. THE Platform SHALL allow enabling/disabling marketing at branch level
3. THE Platform SHALL allow configuring channel preferences (WhatsApp, SMS, Email)
4. THE Platform SHALL allow setting default sender ID for SMS
5. THE Platform SHALL allow configuring WhatsApp Business account details
6. THE Platform SHALL allow setting marketing budget limits per branch
7. THE Platform SHALL allow configuring send time windows (e.g., 9 AM - 9 PM only)
8. THE Platform SHALL allow Super_Owner to modify marketing configuration

---

### Requirement 11.2: Consent & Compliance Management

**User Story:** As a salon owner, I want to manage customer consent for marketing, so that I comply with regulations and respect customer preferences.

#### Acceptance Criteria

1. THE Platform SHALL track marketing consent status per customer (opted-in, opted-out)
2. THE Platform SHALL track consent per channel (WhatsApp, SMS, Email separately)
3. THE Platform SHALL record consent history with timestamp and source
4. THE Platform SHALL support DND (Do Not Disturb) compliance flags
5. THE Platform SHALL NEVER send marketing messages to customers who have opted out
6. THE Platform SHALL always allow transactional messages (appointment reminders, bills) regardless of marketing consent
7. THE Platform SHALL provide easy opt-out mechanism in all marketing messages
8. THE Platform SHALL allow Branch_Manager or higher to manually update consent with reason
9. THE Platform SHALL log all consent changes in audit trail

---

### Requirement 11.3: Audience Segmentation

**User Story:** As a salon owner, I want to segment customers for targeted marketing, so that I can send relevant messages to the right people.

#### Acceptance Criteria

1. THE Platform SHALL support dynamic segments that auto-update based on rules
2. THE Platform SHALL provide pre-built segments: New Customers, Repeat Customers, Inactive Customers, High-Value Customers, Package Holders, Birthday This Month, Anniversary This Month
3. THE Platform SHALL allow creating custom segments with rule builder
4. THE Platform SHALL support segment rules based on: last visit date, visit count, total spend, services availed, membership status, tags, branch
5. THE Platform SHALL allow combining multiple rules with AND/OR logic
6. THE Platform SHALL display segment size (customer count) before campaign send
7. THE Platform SHALL refresh segment membership automatically (not manual lists)
8. THE Platform SHALL allow saving segments for reuse
9. THE Platform SHALL allow Branch_Manager or higher to create and manage segments

---

### Requirement 11.4: Campaign Management

**User Story:** As a branch manager, I want to create and manage marketing campaigns, so that I can engage customers effectively.

#### Acceptance Criteria

1. THE Platform SHALL support one-time campaigns (send once)
2. THE Platform SHALL support recurring campaigns (weekly, monthly)
3. THE Platform SHALL support automated trigger campaigns (event-based)
4. THE Platform SHALL support campaign workflow: Draft → Pending Approval → Approved → Scheduled → Sent
5. THE Platform SHALL allow creating branch-specific campaigns
6. THE Platform SHALL allow creating business-wide campaigns (all branches)
7. THE Platform SHALL allow previewing campaign before sending
8. THE Platform SHALL allow testing campaign with sample send
9. THE Platform SHALL allow pausing or cancelling scheduled campaigns
10. THE Platform SHALL track campaign status and history

---

### Requirement 11.5: WhatsApp Marketing

**User Story:** As a salon owner, I want to send marketing messages via WhatsApp, so that I can reach customers on their preferred channel.

#### Acceptance Criteria

1. THE Platform SHALL support WhatsApp Business API integration (provider-agnostic)
2. THE Platform SHALL manage approved WhatsApp message templates
3. THE Platform SHALL support personalization tokens in templates ({{customer_name}}, {{offer_details}}, etc.)
4. THE Platform SHALL schedule WhatsApp campaigns for specific date/time
5. THE Platform SHALL track delivery status (sent, delivered, read, failed)
6. THE Platform SHALL track cost per message and per campaign
7. THE Platform SHALL handle WhatsApp template approval workflow
8. THE Platform SHALL retry failed messages with configurable logic
9. THE Platform SHALL respect WhatsApp rate limits and best practices

---

### Requirement 11.6: SMS & Email Campaigns

**User Story:** As a salon owner, I want to send SMS and email campaigns, so that I can reach customers who prefer these channels.

#### Acceptance Criteria

1. THE Platform SHALL support bulk SMS campaigns
2. THE Platform SHALL distinguish transactional SMS (appointment reminders) from promotional SMS
3. THE Platform SHALL preview character count and SMS cost before sending
4. THE Platform SHALL manage sender ID for SMS
5. THE Platform SHALL support email campaigns with HTML templates
6. THE Platform SHALL track email delivery, open, and click rates
7. THE Platform SHALL handle bounce and unsubscribe for emails
8. THE Platform SHALL use SMS as fallback when WhatsApp fails (configurable)

---

### Requirement 11.7: Automated Lifecycle Campaigns

**User Story:** As a salon owner, I want automated campaigns triggered by customer actions, so that I can engage customers without manual effort.

#### Acceptance Criteria

1. THE Platform SHALL support trigger: Post-visit thank you (after appointment completion)
2. THE Platform SHALL support trigger: Rebooking reminder (X days after last visit, configurable: 30, 45, 60 days)
3. THE Platform SHALL support trigger: Package/membership expiry reminder (X days before expiry)
4. THE Platform SHALL support trigger: Miss-you campaign (inactive for X days)
5. THE Platform SHALL support trigger: First-visit follow-up (after first appointment)
6. THE Platform SHALL support trigger: Birthday wishes (on birthday or X days before)
7. THE Platform SHALL support trigger: Anniversary wishes (on anniversary or X days before)
8. THE Platform SHALL allow configuring message template for each trigger
9. THE Platform SHALL allow enabling/disabling individual triggers
10. THE Platform SHALL allow configuring trigger timing (e.g., send 2 hours after visit)
11. THE Platform SHALL prevent duplicate triggers (don't send same trigger twice)

---

### Requirement 11.8: Offers & Coupon Management

**User Story:** As a salon owner, I want to create and manage promotional offers, so that I can incentivize customers.

#### Acceptance Criteria

1. THE Platform SHALL allow creating coupon codes (auto-generated or custom)
2. THE Platform SHALL support discount types: percentage off, flat amount off, free service
3. THE Platform SHALL allow setting coupon validity period (start and end date)
4. THE Platform SHALL allow setting usage limits: total uses, uses per customer
5. THE Platform SHALL allow restricting coupons to specific branches
6. THE Platform SHALL allow restricting coupons to specific services or categories
7. THE Platform SHALL allow restricting coupons to specific customer segments
8. THE Platform SHALL validate coupon at billing time
9. THE Platform SHALL track coupon redemption with customer and bill details
10. THE Platform SHALL prevent coupon stacking unless explicitly allowed
11. THE Platform SHALL allow Branch_Manager or higher to create coupons

---

### Requirement 11.9: Referral Program

**User Story:** As a salon owner, I want a referral program, so that existing customers bring new customers.

#### Acceptance Criteria

1. THE Platform SHALL generate unique referral codes per customer
2. THE Platform SHALL allow customers to share referral code/link
3. THE Platform SHALL track when new customer uses referral code
4. THE Platform SHALL configure referrer reward (points, discount, or free service)
5. THE Platform SHALL configure referred customer reward (first-visit discount)
6. THE Platform SHALL credit rewards after referred customer completes first paid visit
7. THE Platform SHALL implement anti-fraud controls (prevent self-referral, limit referrals per period)
8. THE Platform SHALL track referral statistics per customer
9. THE Platform SHALL send notification to referrer when reward is credited
10. THE Platform SHALL display referral leaderboard (top referrers)

---

### Requirement 11.10: Loyalty Points Communication

**User Story:** As a salon owner, I want to communicate loyalty points status to customers, so that they stay engaged with the program.

#### Acceptance Criteria

1. THE Platform SHALL send notification when points are earned (after bill payment)
2. THE Platform SHALL send reminder when points are about to expire
3. THE Platform SHALL send periodic balance summary (monthly or on-demand)
4. THE Platform SHALL include points balance in post-visit messages
5. THE Platform SHALL send notification when points are redeemed
6. THE Platform SHALL allow configuring loyalty communication preferences
7. THE Platform SHALL integrate with loyalty system from Module 3

---

### Requirement 11.11: Feedback Request Automation

**User Story:** As a salon owner, I want automated feedback requests, so that I can collect customer opinions consistently.

#### Acceptance Criteria

1. THE Platform SHALL send feedback request after appointment completion (configurable delay)
2. THE Platform SHALL collect star rating (1-5) for overall experience
3. THE Platform SHALL collect star rating for specific stylist
4. THE Platform SHALL allow text feedback/comments
5. THE Platform SHALL route low ratings (1-2 stars) to manager for internal review
6. THE Platform SHALL NOT publish low ratings publicly without review
7. THE Platform SHALL tag feedback by issue type (service quality, wait time, staff behavior, etc.)
8. THE Platform SHALL thank customers for positive feedback
9. THE Platform SHALL integrate with feedback system from Module 3

---

### Requirement 11.12: Customer Engagement Timeline

**User Story:** As a receptionist, I want to see all communications sent to a customer, so that I can provide context-aware service.

#### Acceptance Criteria

1. THE Platform SHALL display all marketing messages sent to customer
2. THE Platform SHALL display all campaigns customer was part of
3. THE Platform SHALL display all offers/coupons sent and redemption status
4. THE Platform SHALL display all feedback given by customer
5. THE Platform SHALL display all transactional messages (reminders, confirmations)
6. THE Platform SHALL show timeline in chronological order
7. THE Platform SHALL allow filtering timeline by message type
8. THE Platform SHALL display engagement timeline on customer profile

---

### Requirement 11.13: Message Templates

**User Story:** As a salon owner, I want to manage message templates, so that communications are consistent and professional.

#### Acceptance Criteria

1. THE Platform SHALL provide pre-built templates for common campaigns (birthday, re-engagement, offers)
2. THE Platform SHALL allow creating custom templates
3. THE Platform SHALL support personalization placeholders: {{customer_name}}, {{branch_name}}, {{offer_details}}, {{expiry_date}}, {{points_balance}}
4. THE Platform SHALL support templates in Hindi and English
5. THE Platform SHALL allow setting default language per customer
6. THE Platform SHALL preview template with sample data before saving
7. THE Platform SHALL version templates (track changes)
8. THE Platform SHALL allow Branch_Manager or higher to manage templates

---

### Requirement 11.14: Scheduling & Throttling

**User Story:** As a salon owner, I want to control when and how often messages are sent, so that I don't spam customers.

#### Acceptance Criteria

1. THE Platform SHALL enforce send time windows (configurable, default: 9 AM - 9 PM)
2. THE Platform SHALL NOT send marketing messages outside configured hours
3. THE Platform SHALL enforce daily message limit per customer (configurable, default: 2)
4. THE Platform SHALL enforce frequency cap (max messages per week per customer)
5. THE Platform SHALL queue messages that exceed limits for later sending
6. THE Platform SHALL implement retry logic for failed messages (max 3 retries)
7. THE Platform SHALL allow pausing all campaigns (emergency stop)
8. THE Platform SHALL alert when approaching daily/monthly message limits

---

### Requirement 11.15: Staff Engagement Tools

**User Story:** As a stylist, I want tools to personally engage with my customers, so that I can build relationships.

#### Acceptance Criteria

1. THE Platform SHALL allow staff to set follow-up reminders for specific customers
2. THE Platform SHALL allow staff to add notes about customer outreach
3. THE Platform SHALL allow sending personalized messages to VIP customers (with approval)
4. THE Platform SHALL suggest rebooking nudges for staff's regular customers
5. THE Platform SHALL show staff their customers who haven't visited recently
6. THE Platform SHALL allow Branch_Manager to review staff-initiated messages
7. THE Platform SHALL track staff engagement activities

---

### Requirement 11.16: Branch Marketing Controls

**User Story:** As a salon owner with multiple branches, I want to control marketing at branch level, so that each location can run appropriate campaigns.

#### Acceptance Criteria

1. THE Platform SHALL allow Super_Owner to create business-wide campaigns
2. THE Platform SHALL allow Branch_Manager to create branch-specific campaigns
3. THE Platform SHALL allow allocating marketing budget per branch
4. THE Platform SHALL track spending against budget per branch
5. THE Platform SHALL require approval for branch campaigns exceeding budget
6. THE Platform SHALL allow configuring campaign approval hierarchy
7. THE Platform SHALL prevent brand inconsistency (template approval for branch campaigns)
8. THE Platform SHALL report marketing performance per branch

---

### Requirement 11.17: Campaign Analytics

**User Story:** As a salon owner, I want to see campaign performance, so that I can measure marketing ROI.

#### Acceptance Criteria

1. THE Platform SHALL report messages sent, delivered, read, failed per campaign
2. THE Platform SHALL report delivery rate percentage
3. THE Platform SHALL report coupon redemption count and rate
4. THE Platform SHALL report revenue generated from campaign (attributed sales)
5. THE Platform SHALL report cost per campaign (message costs)
6. THE Platform SHALL calculate ROI (revenue generated / cost)
7. THE Platform SHALL compare campaign performance over time
8. THE Platform SHALL identify best performing campaigns and segments
9. THE Platform SHALL allow filtering analytics by date range, branch, campaign type

---

### Requirement 11.18: Marketing Access Control

**User Story:** As a salon owner, I want to control who can create and send campaigns, so that marketing is managed responsibly.

#### Acceptance Criteria

1. THE Platform SHALL allow Receptionist to view campaign history only
2. THE Platform SHALL allow Branch_Manager to create and send branch campaigns
3. THE Platform SHALL allow Regional_Manager to create campaigns for assigned branches
4. THE Platform SHALL allow Super_Owner to create and send all campaigns
5. THE Platform SHALL require approval for campaigns above configured thresholds
6. THE Platform SHALL log all campaign creation, approval, and send actions
7. THE Platform SHALL restrict template editing to Branch_Manager or higher
8. THE Platform SHALL restrict budget configuration to Super_Owner

---

### Requirement 11.19: Marketing Audit Logs

**User Story:** As a salon owner, I want all marketing actions logged, so that I can investigate issues and ensure compliance.

#### Acceptance Criteria

1. THE Platform SHALL log all consent changes with old value, new value, user, timestamp
2. THE Platform SHALL log all campaign creation and edits
3. THE Platform SHALL log all campaign approvals and rejections
4. THE Platform SHALL log all message sends with recipient and status
5. THE Platform SHALL log all coupon creation and redemption
6. THE Platform SHALL log all template changes
7. THE Platform SHALL retain marketing audit logs for minimum 2 years
8. THE Platform SHALL allow Super_Owner and Accountant to view audit logs

---

### Requirement 11.20: Future Enhancements (Not in MVP)

**User Story:** As a salon owner, I want advanced marketing features in the future, so that I can grow my marketing capabilities.

#### Acceptance Criteria

1. THE Platform MAY support Google Reviews integration for reputation management in future
2. THE Platform MAY support A/B testing for campaigns in future
3. THE Platform MAY support external marketing tool integrations (webhooks, APIs) in future
4. THE Platform MAY support additional languages beyond Hindi and English in future
5. THE Platform MAY support advanced analytics with ML-based recommendations in future

---

## Module 12: Online Booking

### Requirement 12.1: Online Booking Configuration

**User Story:** As a salon owner, I want to configure online booking settings, so that I can control how customers book appointments online.

#### Acceptance Criteria

1. THE Platform SHALL allow enabling/disabling online booking at tenant level
2. THE Platform SHALL allow enabling/disabling online booking per branch
3. THE Platform SHALL allow configuring which services are available for online booking
4. THE Platform SHALL allow configuring advance booking window (e.g., book up to 30 days ahead)
5. THE Platform SHALL allow configuring minimum advance booking time (e.g., at least 2 hours before)
6. THE Platform SHALL allow configuring same-day booking cutoff time (e.g., no same-day bookings after 6 PM)
7. THE Platform SHALL enforce buffer time between appointments as configured in branch settings
8. THE Platform SHALL NOT allow overbooking through online channel
9. THE Platform SHALL allow Branch_Manager or higher to modify online booking configuration

---

### Requirement 12.2: Public Booking Page

**User Story:** As a salon owner, I want a branded booking page, so that customers can book appointments online with a professional experience.

#### Acceptance Criteria

1. THE Platform SHALL provide a unique booking URL per business (e.g., book.platform.com/salon-name)
2. THE Platform SHALL display salon logo and branding colors on booking page
3. THE Platform SHALL display salon description and welcome message
4. THE Platform SHALL display branch selector for multi-branch businesses
5. THE Platform SHALL display branch address, contact, and working hours
6. THE Platform SHALL be mobile-first and responsive (works on all devices)
7. THE Platform SHALL load quickly (under 3 seconds on mobile)
8. THE Platform SHALL allow customizing booking page content
9. THE Platform SHALL provide shareable link for WhatsApp/social media

---

### Requirement 12.3: Service Selection

**User Story:** As a customer, I want to easily find and select services, so that I can book what I need.

#### Acceptance Criteria

1. THE Platform SHALL display services organized by category
2. THE Platform SHALL allow filtering services by gender (Men's, Women's, Unisex)
3. THE Platform SHALL display service name, description, duration, and price
4. THE Platform SHALL display service images if available
5. THE Platform SHALL show "Popular" or "Recommended" tags on selected services
6. THE Platform SHALL allow selecting multiple services in one booking
7. THE Platform SHALL suggest relevant add-on services after primary service selection
8. THE Platform SHALL NOT display services marked as unavailable for online booking
9. THE Platform SHALL NOT display services that are temporarily unavailable
10. THE Platform SHALL calculate and display total duration and price for selected services

---

### Requirement 12.4: Real-Time Availability Engine

**User Story:** As a customer, I want to see only available time slots, so that I can book without conflicts.

#### Acceptance Criteria

1. THE Platform SHALL calculate available slots in real-time based on staff availability
2. THE Platform SHALL sync with staff schedules, breaks, and leave from Module 2
3. THE Platform SHALL respect branch working hours and holidays
4. THE Platform SHALL account for service duration when showing available slots
5. THE Platform SHALL enforce buffer time between appointments
6. THE Platform SHALL handle parallel service logic if enabled
7. THE Platform SHALL prevent double-booking (slot conflict prevention)
8. THE Platform SHALL reuse core appointment logic from Module 2 (no duplicate engine)
9. THE Platform SHALL refresh availability when customer changes date or services
10. THE Platform SHALL lock slot temporarily while customer completes booking (5 minutes)

---

### Requirement 12.5: Stylist Selection

**User Story:** As a customer, I want to optionally select my preferred stylist, so that I can book with someone I trust.

#### Acceptance Criteria

1. THE Platform SHALL default to "Any Available Stylist" (auto-assign)
2. THE Platform SHALL allow salon to enable/disable stylist selection for online booking
3. WHEN stylist selection is enabled, THE Platform SHALL display available stylists with photos
4. THE Platform SHALL display stylist specializations and skill level if configured
5. THE Platform SHALL respect gender preference when showing stylists
6. THE Platform SHALL show only stylists available for selected date/time
7. THE Platform SHALL allow hiding specific stylists from online display
8. THE Platform SHALL apply staff-level pricing if configured (senior stylist premium)
9. THE Platform SHALL allow salon to make stylist selection mandatory or optional

---

### Requirement 12.6: Customer Identification

**User Story:** As a customer, I want to quickly identify myself, so that I can complete my booking without friction.

#### Acceptance Criteria

1. THE Platform SHALL ask for customer phone number first
2. WHEN phone number matches existing customer, THE Platform SHALL retrieve their profile
3. WHEN phone number is new, THE Platform SHALL create a new customer profile
4. THE Platform SHALL detect potential duplicates and handle gracefully
5. THE Platform SHALL NOT require OTP verification for MVP (phone-only identification)
6. THE Platform SHALL map online booking to existing CRM profile
7. THE Platform SHALL pre-fill known customer details for returning customers
8. THE Platform MAY support OTP verification as optional premium feature in future

---

### Requirement 12.7: Customer Details Capture

**User Story:** As a salon, I want to capture essential customer details during booking, so that I can serve them better.

#### Acceptance Criteria

1. THE Platform SHALL collect customer name (required for new customers)
2. THE Platform SHALL collect customer phone number (required)
3. THE Platform SHALL collect customer gender (required for gender-based services)
4. THE Platform SHALL allow adding booking notes/special requests (optional)
5. THE Platform SHALL allow capturing allergy information (optional)
6. THE Platform SHALL keep the form short to prevent drop-off
7. THE Platform SHALL validate phone number format
8. THE Platform SHALL save customer details to CRM profile

---

### Requirement 12.8: Pricing Transparency

**User Story:** As a customer, I want to see clear pricing before booking, so that I know what to expect.

#### Acceptance Criteria

1. THE Platform SHALL display service prices clearly during selection
2. THE Platform SHALL display tax/GST information (inclusive or added)
3. THE Platform SHALL show total amount before confirmation
4. THE Platform SHALL preview membership discount if customer has active membership
5. THE Platform SHALL preview package credit availability if customer has active package
6. THE Platform SHALL lock prices at booking time (price shown = price charged)
7. THE Platform SHALL ensure price shown online matches final bill exactly
8. THE Platform SHALL display branch-specific pricing for selected branch

---

### Requirement 12.9: Prepayment & Deposits

**User Story:** As a salon owner, I want to collect advance payment for online bookings, so that I can reduce no-shows.

#### Acceptance Criteria

1. THE Platform SHALL support three prepayment modes: No payment, Optional payment, Required payment
2. THE Platform SHALL require prepayment for customers flagged as "Prepaid Only" (no-show policy)
3. THE Platform SHALL allow optional prepayment for all other customers
4. THE Platform SHALL support full payment or partial deposit (configurable)
5. THE Platform SHALL integrate with payment gateway (Razorpay/PayU/Cashfree - provider agnostic)
6. THE Platform SHALL support UPI, cards, and net banking
7. THE Platform SHALL allow using wallet balance for prepayment
8. THE Platform SHALL allow using package credits for prepayment
9. THE Platform SHALL define refund rules for cancellations (full refund if cancelled X hours before)
10. THE Platform SHALL handle payment failures gracefully with retry option
11. THE Platform SHALL send payment confirmation via WhatsApp

---

### Requirement 12.10: Booking Confirmation Flow

**User Story:** As a customer, I want to confirm my booking and receive confirmation, so that I know my appointment is secured.

#### Acceptance Criteria

1. THE Platform SHALL display booking summary before final confirmation
2. THE Platform SHALL show selected services, date, time, stylist, branch, and total amount
3. THE Platform SHALL require customer to confirm booking explicitly
4. THE Platform SHALL create appointment in system immediately upon confirmation
5. THE Platform SHALL generate unique booking reference number
6. THE Platform SHALL display confirmation page with booking details
7. THE Platform SHALL send booking confirmation via WhatsApp immediately
8. THE Platform SHALL provide booking details page URL for customer reference
9. THE Platform SHALL sync booking to appointment calendar in real-time

---

### Requirement 12.11: Booking Modification & Cancellation

**User Story:** As a customer, I want to reschedule or cancel my booking online, so that I can manage changes without calling the salon.

#### Acceptance Criteria

1. THE Platform SHALL allow customers to view their booking details via unique link
2. THE Platform SHALL allow rescheduling within configured limits (max 3 times as per Module 2)
3. THE Platform SHALL show available slots for rescheduling
4. THE Platform SHALL allow cancellation within cancellation window
5. THE Platform SHALL enforce cancellation policy (e.g., no cancellation within 2 hours)
6. THE Platform SHALL flag late cancellations for tracking
7. THE Platform SHALL process refund according to refund rules if prepaid
8. THE Platform SHALL send notification for reschedule/cancellation via WhatsApp
9. THE Platform SHALL sync all changes to appointment module immediately
10. THE Platform SHALL NOT allow changing services (must cancel and rebook)

---

### Requirement 12.12: Walk-In Conflict Prevention

**User Story:** As a salon owner, I want online bookings to not disrupt walk-in flow, so that both channels work smoothly.

#### Acceptance Criteria

1. THE Platform SHALL lock slot immediately when online booking is confirmed
2. THE Platform SHALL prevent walk-in booking for locked slots
3. THE Platform SHALL enforce grace buffer between online and walk-in slots
4. THE Platform SHALL define priority rules (online booking has slot priority once confirmed)
5. THE Platform SHALL alert receptionist when online booking is made
6. THE Platform SHALL allow manager to override conflicts with reason (exceptional cases)
7. THE Platform SHALL never break walk-in flow due to online booking issues

---

### Requirement 12.13: Multi-Branch Booking

**User Story:** As a customer, I want to book at any branch of the salon, so that I can choose the most convenient location.

#### Acceptance Criteria

1. THE Platform SHALL display all active branches on booking page
2. THE Platform SHALL allow customer to select preferred branch
3. THE Platform SHALL display branch-specific details (address, hours, contact)
4. THE Platform SHALL show branch-specific service availability
5. THE Platform SHALL apply branch-specific pricing
6. THE Platform SHALL optionally suggest nearest branch based on customer location (if location shared)
7. THE Platform SHALL share customer profile across branches (no re-registration)
8. THE Platform SHALL allow comparing service availability across branches

---

### Requirement 12.14: Offers & Promo Integration

**User Story:** As a customer, I want to apply promo codes during booking, so that I can avail discounts.

#### Acceptance Criteria

1. THE Platform SHALL allow entering promo code during booking
2. THE Platform SHALL validate promo code eligibility (validity, usage limits, customer eligibility)
3. THE Platform SHALL display discount amount after valid promo code
4. THE Platform SHALL preview membership discount for members
5. THE Platform SHALL show package credit availability for package holders
6. THE Platform SHALL allow selecting package credits for redemption
7. THE Platform SHALL NOT apply discounts blindly (validate all rules)
8. THE Platform SHALL display final amount after all discounts

---

### Requirement 12.15: Notifications & Reminders

**User Story:** As a customer, I want to receive booking notifications, so that I don't forget my appointment.

#### Acceptance Criteria

1. THE Platform SHALL send booking confirmation via WhatsApp immediately after booking
2. THE Platform SHALL send reminder 24 hours before appointment
3. THE Platform SHALL send reminder 1-2 hours before appointment (configurable)
4. THE Platform SHALL send notification when booking is rescheduled
5. THE Platform SHALL send notification when booking is cancelled
6. THE Platform SHALL include booking details and salon contact in all notifications
7. THE Platform SHALL use WhatsApp as primary channel (SMS as fallback)
8. THE Platform SHALL integrate with notification system from Module 2

---

### Requirement 12.16: Lead Capture & Abandonment Tracking

**User Story:** As a salon owner, I want to track incomplete bookings, so that I can follow up and improve conversion.

#### Acceptance Criteria

1. THE Platform SHALL capture incomplete booking attempts (abandoned at any step)
2. THE Platform SHALL store customer phone if entered before abandonment
3. THE Platform SHALL track abandonment point in booking flow
4. THE Platform SHALL trigger follow-up campaign for abandoned bookings (via Module 11)
5. THE Platform SHALL report conversion funnel metrics (views → started → completed)
6. THE Platform SHALL identify common drop-off points
7. THE Platform SHALL allow configuring follow-up timing (e.g., 2 hours after abandonment)

---

### Requirement 12.17: Fraud & Abuse Protection

**User Story:** As a salon owner, I want to prevent fake bookings, so that my staff time is not wasted.

#### Acceptance Criteria

1. THE Platform SHALL limit active bookings per customer (configurable, default: 3)
2. THE Platform SHALL throttle booking attempts per IP/device
3. THE Platform SHALL detect and flag suspicious booking patterns
4. THE Platform SHALL block customers who are blacklisted from online booking
5. THE Platform SHALL enforce "Prepaid Only" for customers with no-show history
6. THE Platform SHALL log all booking attempts for fraud investigation
7. THE Platform SHALL allow Branch_Manager to review and block suspicious users

---

### Requirement 12.18: Manager Controls & Overrides

**User Story:** As a salon owner, I want control over online bookings, so that I can manage exceptions and emergencies.

#### Acceptance Criteria

1. THE Platform SHALL allow configuring manual confirmation requirement (bookings need approval)
2. WHEN manual confirmation is enabled, THE Platform SHALL hold bookings in pending queue
3. THE Platform SHALL notify manager of pending bookings for approval
4. THE Platform SHALL allow blacklisting specific customers from online booking
5. THE Platform SHALL provide emergency shutdown (disable all online booking instantly)
6. THE Platform SHALL allow manager to override booking rules with reason
7. THE Platform SHALL log all manager overrides and actions

---

### Requirement 12.19: Online Booking Analytics

**User Story:** As a salon owner, I want to see online booking performance, so that I can measure channel effectiveness.

#### Acceptance Criteria

1. THE Platform SHALL report online vs offline booking ratio
2. THE Platform SHALL report booking page views and unique visitors
3. THE Platform SHALL report conversion rate (views → completed bookings)
4. THE Platform SHALL report abandonment rate and drop-off points
5. THE Platform SHALL report no-show rate for online bookings specifically
6. THE Platform SHALL report revenue generated from online bookings
7. THE Platform SHALL report staff load from online bookings
8. THE Platform SHALL compare online booking trends over time
9. THE Platform SHALL allow filtering by date range, branch

---

### Requirement 12.20: Fail-Safe & Recovery

**User Story:** As a platform operator, I want robust error handling, so that booking failures don't damage customer trust.

#### Acceptance Criteria

1. THE Platform SHALL implement retry logic for transient failures
2. THE Platform SHALL recover partial bookings if customer returns within session
3. THE Platform SHALL handle payment mismatches gracefully (payment received but booking failed)
4. THE Platform SHALL validate appointment sync after every booking
5. THE Platform SHALL alert operations team for critical failures
6. THE Platform SHALL provide customer support contact on error pages
7. THE Platform SHALL log all failures with details for debugging
8. THE Platform SHALL never lose a confirmed booking due to system error

---

### Requirement 12.21: Future Enhancements (Not in MVP)

**User Story:** As a salon owner, I want advanced online booking features in the future, so that I can expand my online presence.

#### Acceptance Criteria

1. THE Platform MAY support WhatsApp booking chatbot in future
2. THE Platform MAY support website embed widget in future
3. THE Platform MAY support Google Reserve integration in future
4. THE Platform MAY support Instagram booking link in future
5. THE Platform MAY support OTP verification as optional feature in future
6. THE Platform MAY support customer mobile app in future

---

## Cross-Cutting Concerns

### Multi-Language Support (i18n)

The platform supports English and Hindi out of the box with architecture to add more languages.

#### Acceptance Criteria

1. THE Platform SHALL support English (en) and Hindi (hi) for the user interface
2. THE Platform SHALL store language preference at user level (staff)
3. THE Platform SHALL store language preference at customer level
4. THE Platform SHALL display the staff interface in user's preferred language
5. THE Platform SHALL display the online booking page in customer's selected language
6. THE Platform SHALL send WhatsApp/SMS notifications in customer's preferred language
7. THE Platform SHALL support message templates in multiple languages (Module 11)
8. THE Platform SHALL format dates as DD/MM/YYYY (Indian format)
9. THE Platform SHALL format currency as ₹X,XX,XXX (Indian numbering - lakhs, crores)
10. THE Platform SHALL format times in 12-hour format with AM/PM
11. THE Platform SHALL allow adding new languages without code changes (translation files only)
12. THE Platform SHALL NOT translate service names, category names, or business-specific content (entered by salon owner)

---

## Document Complete

This requirements document covers all 12 modules of the Salon Management SaaS Platform:

1. **Module 1: Tenant/Salon Management** - Business registration, authentication, branches, roles, subscriptions
2. **Module 2: Appointment Management** - Booking, calendar, availability, no-show policy, queue management
3. **Module 3: Customer Management (CRM)** - Profiles, preferences, loyalty, referrals, wallet
4. **Module 4: Services & Pricing** - Catalog, pricing variants, combos, commissions
5. **Module 5: Billing & Invoicing** - Bills, payments, GST, refunds, day closure
6. **Module 6: Staff Management** - Attendance, shifts, leave, commissions, payroll
7. **Module 7: Inventory Management** - Products, stock, vendors, transfers, expiry
8. **Module 8: Memberships & Packages** - Plans, benefits, redemption, cross-branch usage
9. **Module 9: Expenses & Finance** - Expense tracking, petty cash, P&L, budgets
10. **Module 10: Reports & Analytics** - Dashboards, reports, alerts, exports
11. **Module 11: Marketing & Engagement** - Campaigns, segments, offers, referrals, notifications
12. **Module 12: Online Booking** - Public booking page, availability, payments, confirmations
