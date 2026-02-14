---
inclusion: always
---

# Development Workflow Guidelines

## Module Implementation Process

When implementing any module in this Salon Management SaaS project:

1. **Before Starting**: Check `#[[file:.kiro/steering/module-pending-tracker.md]]` to see current status
2. **During Development**: Follow the design docs in `.cursor/docs/design/`
3. **After Completing**: Update the tracker with completed items

## Key Patterns to Follow

### Backend (Fastify + Prisma)

- Routes use Zod type provider with inline schema definitions
- Use `authenticate` middleware from `@/middleware`
- JWT token uses `sub` for user ID, not `userId`
- Unused function parameters should be prefixed with underscore (e.g., `_createdBy`)
- Services return `PaginatedResult<T>` with `{ data: T[], meta: PaginationMeta }`

### Frontend (Next.js + TanStack Query)

- Use `api` from `@/lib/api/client` for API calls
- Use `format(date, 'yyyy-MM-dd')` from date-fns for date formatting
- Hooks return `PaginatedResult<T>` with `{ data: T[], meta: PaginationMeta }`
- Prefix hook names to avoid conflicts (e.g., `useStaffCheckIn` not `useCheckIn`)

### Database

- All models need `tenant_id` for multi-tenancy
- Branch-scoped models also need `branch_id`
- Use soft deletes with `deleted_at` column
- Include audit columns: `created_at`, `updated_at`, `created_by`, `updated_by`

## Module Dependencies

```
Module 1 (Tenant) ─────────────────────────────────────────────┐
    │                                                          │
    ├── Module 2 (Appointments) ──┬── Module 5 (Billing) ──────┤
    │                             │                            │
    ├── Module 3 (Customers) ─────┼── Module 8 (Memberships) ──┤
    │                             │                            │
    ├── Module 4 (Services) ──────┼── Module 7 (Inventory) ────┤
    │                             │                            │
    └── Module 6 (Staff) ─────────┴── Module 9 (Expenses) ─────┤
                                                               │
                                  Module 10 (Reports) ─────────┤
                                                               │
                                  Module 11 (Marketing) ───────┤
                                                               │
                                  Module 12 (Online Booking) ──┘
```

## Quick Reference

- Design docs: `.cursor/docs/design/XX-module-name.md`
- Requirements: `.cursor/docs/requirements.md`
- Prisma schema: `apps/api/prisma/schema.prisma`
- API modules: `apps/api/src/modules/`
- Frontend pages: `apps/web/src/app/(protected)/`
- Frontend hooks: `apps/web/src/hooks/queries/`
