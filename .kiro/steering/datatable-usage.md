# DataTable Usage Guidelines

This document provides guidelines for using the common DataTable component consistently across all list pages in the Salon Management SaaS application.

## Overview

The DataTable component (`apps/web/src/components/common/data-table.tsx`) provides:

- Server-side pagination with rows-per-page selector
- Loading states with skeleton rows
- Empty states with customizable content
- Column definitions using TanStack Table

## Required Pattern

All list pages should follow this three-file pattern:

```
apps/web/src/app/(protected)/{module}/
├── page.tsx                    # Page component with filters and state
└── components/
    ├── {entity}-columns.tsx    # Column definitions
    └── {entity}-table.tsx      # Table component wrapper
```

## Column Definitions File

Create a `{entity}-columns.tsx` file that exports a function returning column definitions:

```typescript
// Example: invoice-columns.tsx
import type { ColumnDef } from '@/components/common';
import type { Invoice } from '@/types/billing';

interface GetColumnsOptions {
  canWrite: boolean;
  onView: (id: string) => void;
  // Add other action handlers as needed
}

export function getInvoiceColumns({
  canWrite,
  onView,
}: GetColumnsOptions): ColumnDef<Invoice>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    // ... more columns
    {
      id: 'actions',
      cell: ({ row }) => (
        <ActionsDropdown item={row.original} onView={onView} />
      ),
    },
  ];
}
```

## Table Component File

Create a `{entity}-table.tsx` file that wraps the DataTable:

```typescript
// Example: invoice-table.tsx
import { useMemo } from 'react';
import { DataTable, EmptyState } from '@/components/common';
import { getInvoiceColumns } from './invoice-columns';
import type { Invoice } from '@/types/billing';
import type { PaginationMeta } from '@/types/api';

interface InvoiceTableProps {
  data: Invoice[];
  meta?: PaginationMeta;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  // Action handlers
  onView: (id: string) => void;
  hasFilters: boolean;
}

export function InvoiceTable({
  data,
  meta,
  isLoading,
  page,
  onPageChange,
  onPageSizeChange,
  onView,
  hasFilters,
}: InvoiceTableProps) {
  const columns = useMemo(
    () => getInvoiceColumns({ onView }),
    [onView]
  );

  const emptyState = (
    <EmptyState
      icon={FileText}
      title="No invoices"
      description={hasFilters ? 'No invoices match your filters.' : 'Create your first invoice.'}
    />
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      loadingRows={5}
      emptyState={emptyState}
      pagination={
        meta
          ? {
              page,
              limit: meta.limit,
              total: meta.total,
              totalPages: meta.totalPages,
            }
          : undefined
      }
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}
```

## Page Component

The page component manages state and filters:

```typescript
// Example: page.tsx
export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useInvoices({ page, limit, search });

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing page size
  }, []);

  return (
    <PageContainer>
      {/* Filters */}
      <div className="mb-6">
        {/* Search and filter controls */}
      </div>

      {/* Table */}
      <InvoiceTable
        data={data?.data || []}
        meta={data?.meta}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onView={handleView}
        hasFilters={!!search}
      />
    </PageContainer>
  );
}
```

## Required Props for Server-Side Pagination

To enable the rows-per-page selector, you MUST provide:

1. `pagination` - Object with `page`, `limit`, `total`, `totalPages`
2. `onPageChange` - Callback for page navigation
3. `onPageSizeChange` - Callback for changing rows per page

The page size selector automatically appears when `onPageSizeChange` is provided.

## Reference Implementations

See these files for complete examples:

- `apps/web/src/app/(protected)/customers/components/customer-table.tsx`
- `apps/web/src/app/(protected)/customers/components/customer-columns.tsx`
- `apps/web/src/app/(protected)/billing/components/invoice-table.tsx`
- `apps/web/src/app/(protected)/billing/components/invoice-columns.tsx`

## Common Patterns

### Action Handlers with useCallback

Always wrap action handlers with `useCallback` to prevent unnecessary re-renders:

```typescript
const handleView = useCallback(
  (id: string) => {
    router.push(`/invoices/${id}`);
  },
  [router]
);

const handleDelete = useCallback(
  async (id: string) => {
    if (confirm('Are you sure?')) {
      await deleteMutation.mutateAsync(id);
    }
  },
  [deleteMutation]
);
```

### Memoizing Columns

Always memoize column definitions to prevent re-creation on every render:

```typescript
const columns = useMemo(
  () => getColumns({ canWrite, onView, onDelete }),
  [canWrite, onView, onDelete]
);
```

### Error Handling

Handle errors at the table component level:

```typescript
if (error) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Error loading data"
      description="Please try again."
    />
  );
}
```
