# refer

Before implementing any feature or making code changes, follow this workflow:

## 1. Identify the Relevant Module
Determine which module(s) the task relates to from our documentation:
- Module 1: Tenant/Salon Management
- Module 2: Appointments
- Module 3: Customers (CRM)
- Module 4: Services & Pricing
- Module 5: Billing & Invoicing
- Module 6: Staff Management
- Module 7: Inventory
- Module 8: Memberships & Packages
- Module 9: Expenses & Finance
- Module 10: Reports & Analytics
- Module 11: Marketing & Engagement
- Module 12: Online Booking

## 2. Review Design Documentation
Read the corresponding design document(s) from `.cursor/docs/design/`:
- `00-architecture.md` - System architecture (always review for new features)
- `01-tenant-management.md` through `12-online-booking.md` - Module-specific designs

Also review `.cursor/docs/requirements.md` for detailed business requirements.

## 3. Before Writing Code
- Summarize the relevant requirements and design decisions
- Identify any gaps, conflicts, or areas needing clarification
- If you see improvements or better approaches, **suggest them first and wait for confirmation**
- Do NOT proceed with implementation until the approach is confirmed

## 4. During Implementation
- Follow the patterns and conventions defined in the design docs
- Reference the coding standards in `.cursor/rules/18-coding-standards.mdc`
- Ensure multi-tenancy, RLS, and audit logging requirements are met

## Behavior
- **Always ask before deviating** from documented designs
- **Propose updates** to design docs if requirements change during implementation
- **Confirm scope** before starting work on ambiguous requests
