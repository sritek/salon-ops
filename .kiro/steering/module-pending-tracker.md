---
inclusion: manual
---

# Module Implementation Tracker

This document tracks the implementation status of all 12 modules in the Salon Management SaaS Platform.

## Status Legend

- ✅ **Complete** - Fully implemented (backend + frontend)
- 🟡 **Partial** - Backend done, frontend pending or vice versa
- 🔴 **Not Started** - Not implemented yet
- 🟠 **In Progress** - Currently being worked on

---

## Module 1: Tenant/Salon Management

**Status**: 🟡 Partial (~30%)

### Implemented

- [x] Tenant model (Prisma)
- [x] Branch model (Prisma)
- [x] User model with roles (Prisma)
- [x] UserBranch assignment (Prisma)
- [x] RefreshToken for auth (Prisma)
- [x] Auth module (login, refresh, logout)
- [x] JWT authentication middleware
- [x] Permission guard middleware
- [x] Branch guard middleware

### Pending Backend

- [ ] Tenant registration endpoint
- [ ] Branch CRUD endpoints
- [ ] User CRUD endpoints
- [ ] Subscription management
- [ ] Theme settings storage
- [ ] Branch holidays table
- [ ] Subscription history tracking
- [ ] Trial management logic

### Pending Frontend

- [ ] Tenant registration page
- [ ] Branch management page
- [ ] User management page
- [ ] Role assignment UI
- [ ] Theme customization settings
- [ ] Subscription management UI

---

## Module 2: Appointment Management

**Status**: 🟡 Partial (~75%)

### Implemented

- [x] Appointment model (Prisma)
- [x] AppointmentService model (Prisma)
- [x] AppointmentStatusHistory model (Prisma)
- [x] StylistBreak model (Prisma)
- [x] StylistBlockedSlot model (Prisma)
- [x] WalkInQueue model (Prisma)
- [x] Appointments service (CRUD, conflict detection)
- [x] Availability service
- [x] Walk-in queue service
- [x] Stylist schedule service
- [x] Appointments routes
- [x] Appointments list page (frontend)
- [x] Appointment detail page (frontend)
- [x] New appointment page (frontend)
- [x] Reschedule page (frontend)
- [x] Calendar view page (frontend)
- [x] Walk-in queue page (frontend)

### Pending Backend

- [ ] AppointmentReminder table for scheduled reminders
- [ ] Reminder job (1 day, 1 hour, 30 min before)
- [ ] No-show policy enforcement (warning, prepaid-only, blocked)
- [ ] Auto-assign stylist based on availability + gender preference
- [ ] Prepayment integration with payment gateway

### Pending Frontend

- [ ] Stylist schedule management UI improvements
- [ ] Walk-in display board improvements
- [ ] Appointment reminder settings

---

## Module 3: Customer Management (CRM)

**Status**: 🟡 Partial (~70%)

### Implemented

- [x] Customer model (Prisma)
- [x] CustomerNote model (Prisma)
- [x] LoyaltyConfig model (Prisma)
- [x] LoyaltyTransaction model (Prisma)
- [x] WalletTransaction model (Prisma)
- [x] CustomTag model (Prisma)
- [x] Customers service (CRUD)
- [x] Loyalty service
- [x] Tags service
- [x] Wallet service
- [x] Customers routes
- [x] Customers list page (frontend)
- [x] Customer detail page with tabs (frontend)
- [x] New customer page (frontend)
- [x] Loyalty tab (frontend)
- [x] Wallet tab (frontend)
- [x] Notes tab (frontend)
- [x] Tags management (frontend)

### Pending Backend

- [ ] Customer segments table
- [ ] Referral tracking table
- [ ] Customer preferences table
- [ ] Auto-tagging job (New, Regular, Inactive, VIP)
- [ ] Loyalty points expiry job
- [ ] Referral reward on first visit completion

### Pending Frontend

- [ ] Customer segments UI
- [ ] Referral tracking UI
- [ ] Customer merge functionality
- [ ] Bulk import customers

---

## Module 4: Services & Pricing

**Status**: 🟡 Partial (~80%)

### Implemented

- [x] ServiceCategory model (Prisma)
- [x] Service model (Prisma)
- [x] ServiceVariant model (Prisma)
- [x] BranchServicePrice model (Prisma)
- [x] ServiceAddOn model (Prisma)
- [x] ServiceAddOnMapping model (Prisma)
- [x] ComboService model (Prisma)
- [x] ComboServiceItem model (Prisma)
- [x] ServicePriceHistory model (Prisma)
- [x] Services service (CRUD)
- [x] Categories service
- [x] Variants service
- [x] Addons service
- [x] Combos service
- [x] Branch pricing service
- [x] Price engine
- [x] Services routes
- [x] Services list page (frontend)
- [x] Service detail page (frontend)
- [x] Categories page (frontend)
- [x] Combos page (frontend)
- [x] Variants page (frontend)

### Pending Backend

- [ ] ServiceConsumables table (link to inventory)
- [ ] Commission rules per service
- [ ] Staff commission overrides

### Pending Frontend

- [ ] Service consumables mapping UI
- [ ] Commission configuration UI

---

## Module 5: Billing & Invoicing

**Status**: 🟡 Partial (~75%)

### Implemented - Backend

- [x] Invoice model (Prisma)
- [x] InvoiceItem model (Prisma)
- [x] InvoiceDiscount model (Prisma)
- [x] Payment model (Prisma)
- [x] CreditNote model (Prisma)
- [x] CreditNoteItem model (Prisma)
- [x] CashDrawerTransaction model (Prisma)
- [x] DayClosure model (Prisma)
- [x] Invoice CRUD operations
- [x] Add/remove items from invoice
- [x] Add payments (split payments supported)
- [x] Finalize invoice with invoice number generation
- [x] Cancel draft invoice
- [x] Quick bill (create + finalize in one step)
- [x] Calculate totals preview
- [x] GST calculation (CGST/SGST/IGST)
- [x] Loyalty points earning on finalize
- [x] Wallet deduction on finalize
- [x] Credit note creation with refund to wallet/cash
- [x] Day closure (open/close day)
- [x] Cash drawer balance tracking
- [x] Cash drawer adjustments

### Implemented - Frontend

- [x] Invoices list page
- [x] Invoice detail page
- [x] New invoice page with discount UI
- [x] Add payment dialog
- [x] Credit notes page
- [x] Day closure page

### Pending Backend (from design doc)

- [x] **Product item type** - Implemented: Products can be added to invoices with stock validation
- [ ] **Combo item type** - BLOCKED: Requires combo billing logic
- [ ] **Package item type** - BLOCKED: Requires Module 8 (Memberships)
- [ ] **Coupon/promo discount application** - BLOCKED: Requires Module 11 (Marketing)
- [ ] **Membership discount integration** - BLOCKED: Requires Module 8 (Memberships)
- [ ] **Package redemption integration** - BLOCKED: Requires Module 8 (Memberships)
- [ ] **Discount approval workflow** (requiresApproval field exists but no workflow)
- [ ] **Invoice PDF generation**
- [ ] **Email/WhatsApp invoice sharing**
- [ ] **GST report generation**
- [x] **Commission creation on finalize** (creates Commission records for stylist and assistant)
- [x] **Inventory deduction on finalize** - Implemented: FIFO stock deduction via stockService.consumeForSale

### Pending Frontend

- [x] Product billing UI - Implemented: Product picker in new invoice page with stock display
- [ ] Combo billing UI
- [ ] Package redemption UI
- [ ] Coupon application UI
- [ ] Membership discount UI
- [ ] Invoice PDF download
- [ ] GST reports page

---

## Module 6: Staff Management

**Status**: 🟡 Partial (~75%)

### Implemented - Backend

- [x] StaffProfile model (Prisma)
- [x] Shift model (Prisma)
- [x] StaffShiftAssignment model (Prisma)
- [x] Attendance model (Prisma)
- [x] Leave model (Prisma)
- [x] LeaveBalance model (Prisma)
- [x] Commission model (Prisma)
- [x] SalaryComponent model (Prisma)
- [x] StaffSalaryStructure model (Prisma)
- [x] StaffDeduction model (Prisma)
- [x] Payroll model (Prisma)
- [x] PayrollItem model (Prisma)
- [x] Payslip model (Prisma)
- [x] TenantLeavePolicy model (Prisma)
- [x] Staff CRUD operations
- [x] Shift CRUD operations
- [x] Shift assignment to staff
- [x] Attendance check-in/check-out
- [x] Manual attendance entry
- [x] Attendance listing and summary
- [x] Leave application
- [x] Leave approval/rejection/cancellation
- [x] Leave balance tracking
- [x] Commission listing and summary
- [x] Bulk commission approval
- [x] Deduction CRUD operations
- [x] Payroll generation
- [x] Payroll processing workflow (draft → processing → approved → paid)
- [x] Geo-location validation for attendance (Haversine formula)
- [x] Geo-config API endpoints (GET/PATCH branch geo settings)
- [x] Auto-absent job (BullMQ scheduled job)
- [x] Leave balance initialization job (April 1st annually)
- [x] Attendance locking after payroll processing
- [x] Attendance lock status API endpoint
- [x] Payslip service (list, get, download URL)
- [x] Payslip email/WhatsApp sending (status tracking)
- [x] Staff performance summary service
- [x] Performance API endpoint with date range and branch comparison

### Implemented - Frontend

- [x] Staff list page
- [x] Attendance page (check-in/out, list)
- [x] Leaves page (apply, approve, list)
- [x] Payroll list page
- [x] Payroll detail page
- [x] Staff detail/edit page (implemented with tabs: profile, employment, salary, documents)
- [x] New staff page (comprehensive form with all fields)
- [x] Shift management page (create, edit, delete shifts)
- [x] Shift assignment dialog
- [x] Commission tracking page (filters, summary, bulk approval, CSV export)
- [x] Deduction management page (list, add, edit, cancel)
- [x] Payslip section in payroll detail (download, email, WhatsApp)

### Pending Backend

- [ ] Payslip PDF generation (actual PDF creation with pdfkit)
- [ ] S3 upload for payslip PDFs
- [ ] Actual email sending with AWS SES
- [ ] Actual WhatsApp sending integration

### Pending Frontend

- [ ] Staff performance dashboard

---

## Module 7: Inventory Management

**Status**: ✅ Complete (~95%)

### Implemented - Backend

- [x] ProductCategory model (Prisma)
- [x] Product model (Prisma)
- [x] BranchProductSettings model (Prisma)
- [x] Vendor model (Prisma)
- [x] VendorProductMapping model (Prisma)
- [x] PurchaseOrder model (Prisma)
- [x] PurchaseOrderItem model (Prisma)
- [x] GoodsReceiptNote model (Prisma)
- [x] GoodsReceiptItem model (Prisma)
- [x] StockBatch model (FIFO support)
- [x] StockMovement model (Prisma)
- [x] StockTransfer model (Prisma)
- [x] StockTransferItem model (Prisma)
- [x] StockAudit model (Prisma)
- [x] StockAuditItem model (Prisma)
- [x] ServiceConsumableMapping model (Prisma)
- [x] Product service (CRUD, categories, branch settings)
- [x] Vendor service (CRUD, product mappings)
- [x] Purchase order service (CRUD, workflow, reorder suggestions)
- [x] Goods receipt service (CRUD, confirmation, stock batch creation)
- [x] FIFO engine (consumption, weighted average cost)
- [x] Stock service (batches, summary, alerts, consumption, adjustments)
- [x] Transfer service (CRUD, workflow: approve/reject/dispatch/receive)
- [x] Audit service (CRUD, counting, completion, posting)
- [x] Service consumable service (CRUD, consumption on service completion)
- [x] All inventory routes registered
- [x] Permission-based access control
- [x] Branch-level data isolation

### Implemented - Frontend

- [x] Inventory hooks (use-inventory.ts)
- [x] Product categories page
- [x] Products list page
- [x] Branch product settings page
- [x] Vendors list page
- [x] Vendor-product mapping page
- [x] Purchase orders list page
- [x] New purchase order page
- [x] Reorder suggestions page
- [x] Goods receipts list page
- [x] New goods receipt page
- [x] Goods receipt detail page
- [x] Stock summary page
- [x] Stock detail page (batches)
- [x] Stock movements page
- [x] Stock alerts page
- [x] Manual consumption dialog
- [x] Stock adjustment dialog
- [x] Transfers list page
- [x] New transfer page
- [x] Transfer detail page
- [x] Audits list page
- [x] New audit page
- [x] Audit detail/counting page
- [x] Service consumables tab (in service detail)
- [x] Inventory reports page (valuation, movements, purchases, expiry)
- [x] Sidebar navigation with inventory sub-menu

### Pending (Optional)

- [ ] Property-based tests (optional for MVP)
- [ ] Export functionality for reports (placeholder implemented)

---

## Module 8: Memberships & Packages

**Status**: 🟡 Partial (~80%)

### Implemented - Backend

- [x] MembershipConfig model (Prisma)
- [x] MembershipPlan model (Prisma)
- [x] MembershipPlanBranch model (Prisma)
- [x] MembershipBenefit model (Prisma)
- [x] CustomerMembership model (Prisma)
- [x] MembershipFreeze model (Prisma)
- [x] MembershipUsage model (Prisma)
- [x] Package model (Prisma)
- [x] PackageBranch model (Prisma)
- [x] PackageService model (Prisma)
- [x] CustomerPackage model (Prisma)
- [x] PackageCredit model (Prisma)
- [x] PackageRedemption model (Prisma)
- [x] Membership plan service (CRUD, benefits management)
- [x] Package service (CRUD, service/value packages)
- [x] Customer membership service (sell, freeze, unfreeze, cancel)
- [x] Customer package service (sell, credits, cancel)
- [x] Redemption service (check benefits, apply discounts, redeem credits)
- [x] Membership config service (tenant settings with defaults)
- [x] All membership routes registered

### Implemented - Frontend

- [x] Memberships types (`apps/web/src/types/memberships.ts`)
- [x] Memberships hooks (`apps/web/src/hooks/queries/use-memberships.ts`)
- [x] Customer memberships list page
- [x] Membership plans list page
- [x] Packages list page
- [x] Customer packages list page
- [x] Sidebar navigation for memberships

### Pending Backend

- [ ] Integration with billing module (auto-apply during invoice creation)
- [ ] Membership expiry notification job
- [ ] Low credit balance notification job

### Pending Frontend

- [ ] Membership plan detail page
- [ ] Membership plan create/edit form
- [ ] Package detail page
- [ ] Package create/edit form
- [ ] Customer membership detail page
- [ ] Customer package detail page
- [ ] Sell membership page
- [ ] Sell package page
- [ ] Redemption UI in billing
- [ ] Membership freeze dialog
- [ ] Membership config settings page

---

## Module 9: Expenses & Finance

**Status**: 🔴 Not Started (0%)

### Pending Backend

- [ ] FinancialYear model
- [ ] FinanceConfig model
- [ ] ExpenseCategory model
- [ ] Expense model
- [ ] ExpenseAllocation model
- [ ] ExpenseAttachment model
- [ ] RecurringExpense model
- [ ] RecurringExpenseAllocation model
- [ ] PettyCash model
- [ ] PettyCashBalance model
- [ ] PeriodClosure model
- [ ] OpeningBalance model
- [ ] Budget model
- [ ] Expense service
- [ ] Recurring expense service
- [ ] Petty cash service
- [ ] Period closure service
- [ ] Finance routes

### Pending Frontend

- [ ] Expenses list page
- [ ] Expense detail page
- [ ] New expense page
- [ ] Expense categories page
- [ ] Recurring expenses page
- [ ] Petty cash page
- [ ] Period closure page
- [ ] Budget management page
- [ ] P&L report page

---

## Module 10: Reports & Analytics

**Status**: 🔴 Not Started (0%)

### Pending Backend

- [ ] ReportConfig model
- [ ] DataSnapshot model
- [ ] SnapshotMetric model
- [ ] AlertConfig model
- [ ] AlertHistory model
- [ ] ScheduledReport model
- [ ] ReportExport model
- [ ] SavedFilter model
- [ ] DashboardWidget model
- [ ] Report service
- [ ] Snapshot service
- [ ] Alert service
- [ ] Dashboard service
- [ ] Report routes

### Pending Frontend

- [ ] Dashboard page (role-based)
- [ ] Revenue report page
- [ ] Appointments report page
- [ ] Staff performance report page
- [ ] Customer analytics page
- [ ] Inventory report page
- [ ] Membership/package report page
- [ ] Expense report page
- [ ] P&L report page
- [ ] GST report page
- [ ] Alert configuration page
- [ ] Scheduled reports page

---

## Module 11: Marketing & Engagement

**Status**: 🔴 Not Started (0%)

### Pending Backend

- [ ] MarketingConfig model
- [ ] BranchMarketingConfig model
- [ ] CustomerConsent model
- [ ] ConsentHistory model
- [ ] Segment model
- [ ] SegmentCustomer model
- [ ] MessageTemplate model
- [ ] Campaign model
- [ ] CampaignRecipient model
- [ ] MessageLog model
- [ ] TriggerConfig model
- [ ] TriggerHistory model
- [ ] Coupon model
- [ ] CouponRedemption model
- [ ] ReferralConfig model
- [ ] Referral model
- [ ] StaffFollowupReminder model
- [ ] Marketing service
- [ ] Campaign service
- [ ] Segment service
- [ ] Coupon service
- [ ] Referral service
- [ ] Marketing routes

### Pending Frontend

- [ ] Marketing config page
- [ ] Segments page
- [ ] Segment builder UI
- [ ] Message templates page
- [ ] Campaigns page
- [ ] Campaign detail page
- [ ] Coupons page
- [ ] Referral program page
- [ ] Campaign analytics page

---

## Module 12: Online Booking

**Status**: 🔴 Not Started (0%)

### Pending Backend

- [ ] OnlineBookingConfig model
- [ ] BranchBookingConfig model
- [ ] ServiceBookingConfig model
- [ ] StaffBookingConfig model
- [ ] OnlineBooking model
- [ ] OnlineBookingService model
- [ ] BookingPayment model
- [ ] SlotLock model
- [ ] AbandonedBooking model
- [ ] BlacklistedCustomer model
- [ ] BookingPageAnalytics model
- [ ] BookingAuditLog model
- [ ] Online booking service
- [ ] Slot lock service
- [ ] Payment gateway integration
- [ ] Online booking routes (public + admin)

### Pending Frontend

- [ ] Public booking page (separate app)
- [ ] Booking config page (admin)
- [ ] Online bookings list page
- [ ] Booking detail page
- [ ] Blacklist management page
- [ ] Booking analytics page
- [ ] Abandoned bookings page

---

## Summary

| Module                | Backend | Frontend | Overall |
| --------------------- | ------- | -------- | ------- |
| 1. Tenant Management  | 🟡 40%  | 🔴 0%    | 🟡 30%  |
| 2. Appointments       | 🟡 80%  | 🟡 75%   | 🟡 75%  |
| 3. Customers          | 🟡 70%  | 🟡 75%   | 🟡 70%  |
| 4. Services & Pricing | 🟡 85%  | 🟡 80%   | 🟡 80%  |
| 5. Billing            | 🟡 75%  | 🟡 75%   | 🟡 75%  |
| 6. Staff Management   | 🟡 85%  | 🟡 90%   | 🟡 85%  |
| 7. Inventory          | ✅ 95%  | ✅ 95%   | ✅ 95%  |
| 8. Memberships        | 🟡 90%  | 🟡 50%   | 🟡 80%  |
| 9. Expenses           | 🔴 0%   | 🔴 0%    | 🔴 0%   |
| 10. Reports           | 🔴 0%   | 🔴 0%    | 🔴 0%   |
| 11. Marketing         | 🔴 0%   | 🔴 0%    | 🔴 0%   |
| 12. Online Booking    | 🔴 0%   | 🔴 0%    | 🔴 0%   |

**Overall Progress**: ~55%

---

## Key Missing Features Summary

### Billing Module - Critical Gaps

1. ~~Only `service` item type works~~ - Products now supported with stock validation
2. ~~Inventory not deducted on billing~~ - FIFO stock deduction implemented
3. No coupon/promo validation
4. No membership/package redemption logic
5. No PDF generation or sharing
6. Combo and package item types not yet implemented

### Staff Module - Critical Gaps

1. No payslip PDF generation (actual PDF creation)
2. No S3 upload for payslip PDFs
3. No actual email/WhatsApp sending integration
4. Staff performance dashboard not implemented

### Integration Gaps

1. ~~Billing → Inventory: Stock not deducted~~ - FIFO stock deduction implemented
2. Billing → Memberships: No redemption logic
3. Appointments → Reminders: No reminder jobs

---

## Next Priority Order

1. **Module 8: Memberships & Packages** - Revenue feature, integrates with billing
2. **Module 9: Expenses & Finance** - Financial management, P&L
3. **Module 10: Reports & Analytics** - Business insights
4. **Module 11: Marketing & Engagement** - Customer engagement
5. **Module 12: Online Booking** - Public-facing booking
6. **Complete Tenant Management** - Branch/user CRUD UI

---

## Notes

- When implementing a new module, update this tracker before and after
- Mark items as complete only when both backend and frontend are done
- Use this document to track progress across sessions
- Percentages are based on comparing design doc requirements vs actual implementation
