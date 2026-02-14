# UI Component Guidelines

This document provides guidelines for using common UI components consistently across the Salon Management SaaS application.

## Import Pattern

All common components should be imported from `@/components/common`:

```typescript
import {
  ConfirmDialog,
  SearchInput,
  StatusBadge,
  ActionMenu,
  DatePicker,
  TimePicker,
  DataTable,
  PageHeader,
  EmptyState,
} from '@/components/common';
```

---

## ConfirmDialog

Use `ConfirmDialog` for all destructive actions instead of browser `confirm()`.

### When to Use

- Deleting records (services, customers, appointments, etc.)
- Cancelling operations that cannot be undone
- Any action requiring user confirmation

### Props

| Prop           | Type                          | Default     | Description                      |
| -------------- | ----------------------------- | ----------- | -------------------------------- |
| `open`         | `boolean`                     | required    | Controls dialog visibility       |
| `onOpenChange` | `(open: boolean) => void`     | required    | Callback when open state changes |
| `title`        | `string`                      | required    | Dialog title                     |
| `description`  | `string`                      | required    | Dialog description               |
| `confirmText`  | `string`                      | `'Confirm'` | Confirm button text              |
| `cancelText`   | `string`                      | `'Cancel'`  | Cancel button text               |
| `variant`      | `'default' \| 'destructive'`  | `'default'` | Button styling variant           |
| `onConfirm`    | `() => void \| Promise<void>` | required    | Callback when confirmed          |
| `isLoading`    | `boolean`                     | `false`     | Shows loading state              |

### Example: Delete Confirmation

```typescript
'use client';

import { useState, useCallback } from 'react';
import { ConfirmDialog } from '@/components/common';
import { useTranslations } from 'next-intl';

export function ServiceList() {
  const t = useTranslations('services');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteService();

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteMutation]);

  return (
    <>
      {/* Your list/table with delete buttons */}
      <button onClick={() => handleDelete('service-123')}>Delete</button>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('confirmDelete.title')}
        description={t('confirmDelete.description')}
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
```

### Migration from browser confirm()

```typescript
// ❌ Before (browser confirm)
const handleDelete = async (id: string) => {
  if (confirm('Are you sure you want to delete this?')) {
    await deleteItem(id);
  }
};

// ✅ After (ConfirmDialog)
const [deleteId, setDeleteId] = useState<string | null>(null);

const handleDelete = (id: string) => setDeleteId(id);

const confirmDelete = async () => {
  if (deleteId) {
    await deleteItem(deleteId);
    setDeleteId(null);
  }
};
```

---

## SearchInput

Use `SearchInput` for all search functionality with built-in debouncing.

### When to Use

- List page search filters
- Any text-based filtering
- Anywhere you need debounced search input

### Props

| Prop          | Type                      | Default       | Description                    |
| ------------- | ------------------------- | ------------- | ------------------------------ |
| `value`       | `string`                  | required      | Current search value           |
| `onChange`    | `(value: string) => void` | required      | Callback with debounced value  |
| `placeholder` | `string`                  | `'Search...'` | Input placeholder              |
| `debounceMs`  | `number`                  | `300`         | Debounce delay in milliseconds |
| `className`   | `string`                  | -             | Additional CSS classes         |

### Example: List Page Search

```typescript
'use client';

import { useState } from 'react';
import { SearchInput } from '@/components/common';
import { useTranslations } from 'next-intl';

export function CustomersPage() {
  const t = useTranslations('customers');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // SearchInput handles debouncing internally
  const { data, isLoading } = useCustomers({ search, page });

  return (
    <div>
      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1); // Reset to first page on search
        }}
        placeholder={t('searchPlaceholder')}
        className="w-64"
      />
      {/* Table content */}
    </div>
  );
}
```

### Migration from Inline Search

```typescript
// ❌ Before (inline search with manual debounce)
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
  <Input
    placeholder="Search..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="pl-9"
  />
</div>

// ✅ After (SearchInput - debouncing handled internally)
const [search, setSearch] = useState('');

<SearchInput
  value={search}
  onChange={setSearch}
  placeholder="Search..."
/>
```

---

## StatusBadge

Use `StatusBadge` for all status indicators with consistent styling.

### When to Use

- Appointment status display
- Invoice/payment status
- Membership/package status
- Queue status
- Any status indicator

### Props

| Prop        | Type                | Default     | Description                      |
| ----------- | ------------------- | ----------- | -------------------------------- |
| `status`    | `StatusType`        | required    | Status type (see list below)     |
| `size`      | `'sm' \| 'default'` | `'default'` | Badge size                       |
| `showDot`   | `boolean`           | `false`     | Show colored dot indicator       |
| `label`     | `string`            | -           | Custom label (overrides default) |
| `className` | `string`            | -           | Additional CSS classes           |

### Supported Status Types

#### Appointment Statuses

| Status        | Color  | Label       |
| ------------- | ------ | ----------- |
| `booked`      | Blue   | Booked      |
| `confirmed`   | Green  | Confirmed   |
| `checked_in`  | Purple | Checked In  |
| `in_progress` | Purple | In Progress |
| `completed`   | Blue   | Completed   |
| `cancelled`   | Red    | Cancelled   |
| `no_show`     | Gray   | No Show     |
| `rescheduled` | Orange | Rescheduled |
| `scheduled`   | Blue   | Scheduled   |
| `pending`     | Yellow | Pending     |

#### Invoice Statuses

| Status      | Color  | Label     |
| ----------- | ------ | --------- |
| `draft`     | Yellow | Draft     |
| `finalized` | Green  | Finalized |
| `refunded`  | Gray   | Refunded  |

#### Payment Statuses

| Status    | Color  | Label   |
| --------- | ------ | ------- |
| `paid`    | Green  | Paid    |
| `partial` | Yellow | Partial |
| `unpaid`  | Red    | Unpaid  |

#### Membership Statuses

| Status        | Color  | Label       |
| ------------- | ------ | ----------- |
| `active`      | Green  | Active      |
| `inactive`    | Gray   | Inactive    |
| `frozen`      | Blue   | Frozen      |
| `expired`     | Red    | Expired     |
| `transferred` | Purple | Transferred |

#### Package Types

| Status            | Color   | Label           |
| ----------------- | ------- | --------------- |
| `value`           | Emerald | Value           |
| `service`         | Blue    | Service         |
| `combo`           | Purple  | Combo           |
| `value_package`   | Emerald | Value Package   |
| `service_package` | Blue    | Service Package |
| `combo_package`   | Purple  | Combo Package   |

#### Package Statuses

| Status      | Color | Label     |
| ----------- | ----- | --------- |
| `depleted`  | Gray  | Depleted  |
| `exhausted` | Blue  | Exhausted |

#### Queue Statuses

| Status    | Color  | Label   |
| --------- | ------ | ------- |
| `waiting` | Yellow | Waiting |
| `serving` | Green  | Serving |
| `called`  | Blue   | Called  |
| `left`    | Red    | Left    |

#### Other Statuses

| Status      | Color | Label     |
| ----------- | ----- | --------- |
| `posted`    | Green | Posted    |
| `published` | Blue  | Published |

### Example: Basic Usage

```typescript
import { StatusBadge } from '@/components/common';

// Basic usage
<StatusBadge status="active" />

// With dot indicator
<StatusBadge status="in_progress" showDot />

// Small size
<StatusBadge status="paid" size="sm" />

// Custom label for i18n
<StatusBadge status="confirmed" label={t('status.confirmed')} />
```

### Example: In DataTable Column

```typescript
import { StatusBadge } from '@/components/common';
import type { ColumnDef } from '@/components/common';

const columns: ColumnDef<Appointment>[] = [
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.original.status} showDot />
    ),
  },
];
```

---

## ActionMenu

Use `ActionMenu` for row/card action dropdowns.

### When to Use

- Row actions in lists (outside DataTable columns)
- Card action menus
- Any grouped action dropdown

### Props

| Prop      | Type               | Default        | Description            |
| --------- | ------------------ | -------------- | ---------------------- |
| `items`   | `ActionMenuItem[]` | required       | Array of menu items    |
| `trigger` | `React.ReactNode`  | Three-dot icon | Custom trigger element |

### ActionMenuItem Interface

```typescript
interface ActionMenuItem {
  label: string; // Menu item text
  icon?: LucideIcon; // Optional icon
  onClick: () => void; // Click handler
  variant?: 'default' | 'destructive'; // Styling variant
  disabled?: boolean; // Disabled state
  separator?: boolean; // Show separator before item
}
```

### Example: Basic Usage

```typescript
import { ActionMenu } from '@/components/common';
import { Edit, Trash, Eye } from 'lucide-react';

const items = [
  {
    label: 'View',
    icon: Eye,
    onClick: () => router.push(`/services/${id}`),
  },
  {
    label: 'Edit',
    icon: Edit,
    onClick: () => router.push(`/services/${id}/edit`),
  },
  {
    label: 'Delete',
    icon: Trash,
    onClick: () => setDeleteId(id),
    variant: 'destructive',
    separator: true,
  },
];

<ActionMenu items={items} />
```

### Example: With Custom Trigger

```typescript
import { ActionMenu } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

<ActionMenu
  items={items}
  trigger={
    <Button variant="outline" size="sm">
      <Settings className="h-4 w-4 mr-2" />
      Actions
    </Button>
  }
/>
```

### Example: Conditional Items

```typescript
const items = [
  {
    label: 'View',
    icon: Eye,
    onClick: handleView,
  },
  canEdit && {
    label: 'Edit',
    icon: Edit,
    onClick: handleEdit,
  },
  canDelete && {
    label: 'Delete',
    icon: Trash,
    onClick: handleDelete,
    variant: 'destructive',
    separator: true,
  },
].filter(Boolean) as ActionMenuItem[];
```

---

## DatePicker

Use `DatePicker` for date selection with calendar popup.

### When to Use

- Date filter inputs
- Form date fields
- Any single date selection

### Props

| Prop          | Type                                | Default         | Description            |
| ------------- | ----------------------------------- | --------------- | ---------------------- |
| `value`       | `Date \| undefined`                 | -               | Selected date          |
| `onChange`    | `(date: Date \| undefined) => void` | required        | Change handler         |
| `placeholder` | `string`                            | `'Select date'` | Placeholder text       |
| `disabled`    | `boolean`                           | `false`         | Disabled state         |
| `format`      | `string`                            | `'PPP'`         | date-fns format string |
| `className`   | `string`                            | -               | Additional CSS classes |
| `align`       | `'start' \| 'center' \| 'end'`      | `'start'`       | Popover alignment      |

### Format Options

The `format` prop uses date-fns format strings:

| Format           | Example Output      |
| ---------------- | ------------------- |
| `'PPP'`          | December 25th, 2024 |
| `'PP'`           | Dec 25, 2024        |
| `'P'`            | 12/25/2024          |
| `'yyyy-MM-dd'`   | 2024-12-25          |
| `'dd/MM/yyyy'`   | 25/12/2024          |
| `'MMMM d, yyyy'` | December 25, 2024   |

### Example: Basic Usage

```typescript
import { useState } from 'react';
import { DatePicker } from '@/components/common';

export function AppointmentFilter() {
  const [date, setDate] = useState<Date>();

  return (
    <DatePicker
      value={date}
      onChange={setDate}
      placeholder="Select appointment date"
    />
  );
}
```

### Example: With Custom Format

```typescript
<DatePicker
  value={date}
  onChange={setDate}
  format="dd/MM/yyyy"
  placeholder="DD/MM/YYYY"
/>
```

### Example: In Form

```typescript
import { DatePicker } from '@/components/common';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="start-date">Start Date</Label>
  <DatePicker
    value={startDate}
    onChange={setStartDate}
    placeholder="Select start date"
    disabled={isSubmitting}
  />
</div>
```

---

## TimePicker

Use `TimePicker` for time selection with native time input.

### When to Use

- Shift time inputs
- Appointment time selection
- Any time-only input

### Props

| Prop        | Type                      | Default  | Description                |
| ----------- | ------------------------- | -------- | -------------------------- |
| `value`     | `string`                  | required | Time value in HH:mm format |
| `onChange`  | `(value: string) => void` | required | Change handler             |
| `disabled`  | `boolean`                 | `false`  | Disabled state             |
| `className` | `string`                  | -        | Additional CSS classes     |
| `id`        | `string`                  | -        | Input ID for labels        |

### Controlled Component Behavior

TimePicker is a controlled component - the displayed value always reflects the `value` prop:

```typescript
// The component displays whatever is in `value`
// onChange is called with the new time string when user changes it
<TimePicker
  value={time}           // "09:00"
  onChange={setTime}     // Called with "09:30" when user changes
/>
```

### Example: Basic Usage

```typescript
import { useState } from 'react';
import { TimePicker } from '@/components/common';

export function ShiftForm() {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  return (
    <div className="flex gap-4">
      <div>
        <Label htmlFor="start-time">Start Time</Label>
        <TimePicker
          id="start-time"
          value={startTime}
          onChange={setStartTime}
        />
      </div>
      <div>
        <Label htmlFor="end-time">End Time</Label>
        <TimePicker
          id="end-time"
          value={endTime}
          onChange={setEndTime}
        />
      </div>
    </div>
  );
}
```

### Example: With Validation

```typescript
const [time, setTime] = useState('09:00');
const [error, setError] = useState('');

const handleTimeChange = (value: string) => {
  setTime(value);
  // Validate business hours
  const hour = parseInt(value.split(':')[0]);
  if (hour < 8 || hour > 20) {
    setError('Time must be between 8:00 and 20:00');
  } else {
    setError('');
  }
};

<TimePicker value={time} onChange={handleTimeChange} />
{error && <p className="text-sm text-red-500">{error}</p>}
```

---

## Available shadcn/ui Components

The following shadcn/ui primitives are installed and available at `@/components/ui/`:

### Layout & Structure

- `accordion` - Collapsible content sections
- `card` - Container with header, content, footer
- `separator` - Visual divider
- `tabs` - Tabbed content navigation

### Forms & Inputs

- `button` - Button with variants
- `checkbox` - Checkbox input
- `form` - Form with react-hook-form integration
- `input` - Text input
- `label` - Form label
- `radio-group` - Radio button group
- `select` - Dropdown select
- `switch` - Toggle switch
- `textarea` - Multi-line text input

### Overlays & Dialogs

- `alert-dialog` - Confirmation dialog (used by ConfirmDialog)
- `dialog` - Modal dialog
- `dropdown-menu` - Dropdown menu (used by ActionMenu)
- `popover` - Floating content (used by DatePicker)
- `sheet` - Slide-out panel
- `tooltip` - Hover tooltip

### Data Display

- `avatar` - User avatar
- `badge` - Status badge (used by StatusBadge)
- `calendar` - Date calendar (used by DatePicker)
- `progress` - Progress bar
- `skeleton` - Loading placeholder
- `table` - Data table

### Navigation

- `breadcrumb` - Breadcrumb navigation
- `command` - Command palette
- `scroll-area` - Scrollable container

### Import Pattern for shadcn/ui

```typescript
// Import from @/components/ui/
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
```

---

## Best Practices

### 1. Prefer Common Components

Always check if a common component exists before implementing inline:

```typescript
// ✅ Use common components
import { StatusBadge, SearchInput, ConfirmDialog } from '@/components/common';

// ❌ Don't implement inline
<Badge className="bg-green-100 text-green-800">Active</Badge>
```

### 2. Use i18n for User-Facing Text

```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('services');

<ConfirmDialog
  title={t('confirmDelete.title')}
  description={t('confirmDelete.description')}
  confirmText={t('confirmDelete.confirm')}
/>

<StatusBadge status="active" label={t('status.active')} />
```

### 3. Memoize Callbacks

```typescript
const handleDelete = useCallback((id: string) => {
  setDeleteId(id);
}, []);

const confirmDelete = useCallback(async () => {
  if (deleteId) {
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  }
}, [deleteId, deleteMutation]);
```

### 4. Reset Pagination on Filter Change

```typescript
const handleSearchChange = (value: string) => {
  setSearch(value);
  setPage(1); // Reset to first page
};
```

### 5. Handle Loading States

```typescript
<ConfirmDialog
  onConfirm={confirmDelete}
  isLoading={deleteMutation.isPending}
/>

<DatePicker
  disabled={isSubmitting}
/>
```
