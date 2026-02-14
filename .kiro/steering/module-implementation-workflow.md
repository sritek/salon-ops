---
inclusion: always
---

# Module Implementation Workflow

## Mandatory Process for Module Development

When working on any module in this Salon Management SaaS project, follow this strict workflow:

### Before Starting Work on a Module

1. **Read the tracker**: Check `.kiro/steering/module-pending-tracker.md` for current status
2. **Read the design doc**: Review `.cursor/docs/design/XX-module-name.md` for requirements
3. **Update pending list**: Add any newly discovered pending items to the tracker before starting

### During Development

1. **Work incrementally**: Implement one feature at a time
2. **Follow patterns**: Use existing code patterns from implemented modules
3. **Test as you go**: Verify each feature works before moving to the next

### After Completing a Feature

1. **Mark as complete**: Update the tracker - change `[ ]` to `[x]` for completed items
2. **Move to pending section**: If a feature is partially done, note what's remaining
3. **Update percentages**: Recalculate module completion percentage

### Before Moving to Next Module

1. **Final tracker update**: Ensure all completed work is marked in the tracker
2. **Document blockers**: Note any features that couldn't be completed and why
3. **Update summary table**: Adjust the percentage in the summary table
4. **Update seed data**: Add seed data for the completed module (see Seeding section below)
5. **Run seed**: Execute `pnpm --filter api db:seed` to verify seed works

## Database Seeding

### After Completing Each Module

1. **Update seed file**: Add seed data for the new module in `apps/api/prisma/seed.ts`
2. **Use batch inserts**: Use `createMany` or `createManyAndReturn` for performance
3. **Follow dependency order**: Seed data in correct order (parent tables first)
4. **Add realistic data**: Include 20-30 records per entity for proper testing
5. **Run and verify**: Execute seed and verify data appears correctly

### Seed File Structure

```typescript
// apps/api/prisma/seed.ts
async function main() {
  // 1. Clear existing data
  await clearDatabase();

  // 2. Seed in dependency order
  const { tenant, branches } = await seedTenantAndBranches();
  const users = await seedUsers(tenant.id, branches);
  // ... continue for each module
}
```

### Running Seeds

```bash
# From workspace root
pnpm --filter api db:seed

# Or from apps/api directory
cd apps/api && pnpm db:seed
```

### Seed Data Guidelines

- **Tenant**: 1 tenant with 2 branches
- **Users**: 10-15 users across all roles
- **Customers**: 25-30 customers with varied tags/loyalty
- **Services**: 25-30 services across 5 categories
- **Products**: 30+ products across 6 categories
- **Appointments**: 50+ appointments (past, today, future)
- **Invoices**: 30+ invoices with varied items
- **Staff Data**: Attendance for 30 days, leave balances, shifts

## Quick Reference

- **Tracker location**: `.kiro/steering/module-pending-tracker.md`
- **Design docs**: `.cursor/docs/design/XX-module-name.md`
- **Prisma schema**: `apps/api/prisma/schema.prisma`
- **API modules**: `apps/api/src/modules/`
- **Frontend pages**: `apps/web/src/app/(protected)/`
- **Frontend hooks**: `apps/web/src/hooks/queries/`

## Module Status Quick View

| Module          | Status | Tracker Section |
| --------------- | ------ | --------------- |
| 1. Tenant       | 30%    | Module 1        |
| 2. Appointments | 75%    | Module 2        |
| 3. Customers    | 70%    | Module 3        |
| 4. Services     | 80%    | Module 4        |
| 5. Billing      | 65%    | Module 5        |
| 6. Staff        | 60%    | Module 6        |
| 7-12            | 0%     | Not Started     |

## Integration Dependencies

When implementing features, be aware of these cross-module dependencies:

```
Billing → Staff: Create Commission records on invoice finalize
Billing → Inventory: Deduct stock on invoice finalize
Billing → Memberships: Apply membership discounts, redeem packages
Appointments → Reminders: Schedule reminder jobs
Customers → Marketing: Segment customers, track referrals
```

## Reminder

**Always update the tracker** - This is the source of truth for project progress.
