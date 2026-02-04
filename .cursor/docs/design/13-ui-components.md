# UI Components Design Document

This document specifies the common wrapper components that provide consistent patterns across the Salon Ops application. These components are built on top of shadcn/ui and provide app-specific functionality.

## Component Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Foundation Layer                         │
│  shadcn/ui + Radix UI Primitives + Tailwind CSS            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Common Wrappers Layer                      │
│  PageHeader, DataTable, FormField, StatusBadge, etc.       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Layout Layer                            │
│  Sidebar, Header, MobileNav, Breadcrumbs                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Page Layer                             │
│  List Pages, Detail Pages, Form Pages, Dashboard           │
└─────────────────────────────────────────────────────────────┘
```

---

## Page Components

### PageContainer

Provides consistent page wrapper with max-width and padding.

```typescript
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

// Usage
<PageContainer>
  <PageHeader title="Customers" />
  <PageContent>{children}</PageContent>
</PageContainer>
```

**Implementation Notes:**
- Max width: 1400px (7xl)
- Padding: 16px mobile, 24px desktop
- Background: transparent (inherits from layout)

---

### PageHeader

Consistent page header with title, description, and action buttons.

```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;           // Shows back button if provided
  breadcrumbs?: BreadcrumbItem[];
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Usage
<PageHeader
  title="Add Customer"
  description="Create a new customer profile"
  backHref="/customers"
  actions={
    <Button variant="outline">Cancel</Button>
  }
/>
```

**Implementation Notes:**
- Title: text-2xl font-bold
- Description: text-muted-foreground
- Actions: right-aligned on desktop, below title on mobile
- Back button: uses ArrowLeft icon

---

### PageContent

Wrapper for main page content with consistent spacing.

```typescript
interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

// Usage
<PageContent>
  <DataTable ... />
</PageContent>
```

---

## Data Display Components

### DataTable

Wrapper around TanStack Table with built-in features.

```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  
  // Search
  searchKey?: keyof T;
  searchPlaceholder?: string;
  
  // Filtering
  filterOptions?: FilterOption[];
  
  // Pagination
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  
  // Selection
  selectable?: boolean;
  onSelectionChange?: (rows: T[]) => void;
  bulkActions?: BulkAction[];
  
  // Row interaction
  onRowClick?: (row: T) => void;
  
  // States
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

interface FilterOption {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface BulkAction {
  label: string;
  icon?: LucideIcon;
  onClick: (selectedRows: T[]) => void;
  variant?: 'default' | 'destructive';
}

// Usage
<DataTable
  columns={customerColumns}
  data={customers}
  searchKey="name"
  searchPlaceholder="Search customers..."
  filterOptions={[
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ]}
  pagination={{
    page: 1,
    pageSize: 10,
    total: 100,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  }}
  onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
  isLoading={isLoading}
  emptyState={<EmptyState icon={Users} title="No customers" />}
/>
```

---

### StatCard

Dashboard statistics card with optional trend indicator.

```typescript
interface StatCardProps {
  title: string;
  value: number | string;
  format?: 'number' | 'currency' | 'percentage';
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  href?: string;              // Makes card clickable
  className?: string;
}

// Usage
<StatCard
  title="Today's Revenue"
  value={15000}
  format="currency"
  icon={IndianRupee}
  trend={{ value: 12, direction: 'up' }}
  href="/reports/revenue"
/>
```

**Visual Design:**
- Card with subtle border
- Icon in muted background circle
- Value in large bold text
- Trend with colored arrow (green up, red down)

---

### StatusBadge

Consistent status indicator across the app.

```typescript
interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'default';
  showDot?: boolean;          // Shows colored dot before text
}

type StatusType =
  // Appointment statuses
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'in_progress'
  // Payment statuses
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'refunded'
  // General statuses
  | 'active'
  | 'inactive'
  | 'draft'
  | 'published';

// Usage
<StatusBadge status="confirmed" />
<StatusBadge status="pending" showDot />
```

**Color Mapping:**
- confirmed, paid, active, completed: green
- pending, partial, draft: yellow/amber
- cancelled, unpaid, inactive: red
- no_show, refunded: gray
- in_progress, published: blue

---

### EmptyState

Friendly empty state for lists and tables.

```typescript
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Usage
<EmptyState
  icon={Calendar}
  title="No appointments today"
  description="Your schedule is clear. Add a new appointment or wait for online bookings."
  action={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      New Appointment
    </Button>
  }
/>
```

**Visual Design:**
- Centered layout
- Large muted icon (48x48)
- Title: text-lg font-medium
- Description: text-muted-foreground
- Action button below text

---

## Form Components

### FormField (Enhanced)

Wrapper for React Hook Form with consistent styling.

```typescript
interface FormFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  render: (props: { field: ControllerRenderProps }) => React.ReactNode;
}

// Usage
<FormField
  control={form.control}
  name="email"
  label="Email Address"
  description="We'll send appointment confirmations here"
  required
  render={({ field }) => <Input type="email" {...field} />}
/>
```

**Implementation Notes:**
- Automatically shows error messages from React Hook Form
- Required indicator (*) when required=true
- Description in muted text below input

---

### FormSection

Groups related form fields with a title.

```typescript
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

// Usage
<FormSection title="Contact Information" description="How we can reach this customer">
  <FormField name="phone" ... />
  <FormField name="email" ... />
</FormSection>
```

---

### FormActions

Consistent form action buttons layout.

```typescript
interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
}

// Usage
<FormActions>
  <Button type="button" variant="outline" onClick={onCancel}>
    Cancel
  </Button>
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Saving...' : 'Save'}
  </Button>
</FormActions>
```

**Implementation Notes:**
- Sticky to bottom on mobile
- Right-aligned on desktop
- Gap between buttons

---

### CurrencyInput

Indian Rupee input with formatting.

```typescript
interface CurrencyInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}

// Usage
<CurrencyInput
  value={price}
  onChange={setPrice}
  placeholder="0.00"
  min={0}
/>
// Displays: ₹ 1,500.00
```

**Implementation Notes:**
- Prefix: ₹ symbol
- Formats with Indian numbering (1,00,000)
- Stores raw number, displays formatted
- Allows decimal input

---

### PhoneInput

Indian phone number input with validation.

```typescript
interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showCountryCode?: boolean;  // Shows +91 prefix
}

// Usage
<PhoneInput
  value={phone}
  onChange={setPhone}
  showCountryCode
/>
// Validates: 10 digits starting with 6-9
```

**Implementation Notes:**
- Auto-formats as user types
- Validates Indian mobile format
- Optional +91 prefix display

---

### DateRangePicker

Date range selection with presets.

```typescript
interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  presets?: PresetKey[];
  placeholder?: string;
  disabled?: boolean;
}

type DateRange = {
  from: Date;
  to: Date;
};

type PresetKey =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth';

// Usage
<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  presets={['today', 'last7days', 'thisMonth']}
/>
```

---

## Interaction Components

### ConfirmDialog

Confirmation dialog for destructive actions.

```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;       // Default: "Confirm"
  cancelText?: string;        // Default: "Cancel"
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

// Usage
<ConfirmDialog
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  title="Delete Customer?"
  description="This will permanently delete the customer and all their appointment history. This action cannot be undone."
  confirmText="Delete Customer"
  variant="destructive"
  onConfirm={handleDelete}
  isLoading={isDeleting}
/>
```

---

### ActionMenu

Dropdown menu for row/card actions.

```typescript
interface ActionMenuProps {
  items: ActionMenuItem[];
  trigger?: React.ReactNode;  // Default: three-dot icon
}

interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

// Usage
<ActionMenu
  items={[
    { label: 'View Details', icon: Eye, onClick: handleView },
    { label: 'Edit', icon: Edit, onClick: handleEdit },
    { label: 'Delete', icon: Trash, onClick: handleDelete, variant: 'destructive' },
  ]}
/>
```

---

### SearchInput

Debounced search input with clear button.

```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;        // Default: 300
  className?: string;
}

// Usage
<SearchInput
  value={search}
  onChange={setSearch}
  placeholder="Search customers by name or phone..."
  debounceMs={300}
/>
```

**Implementation Notes:**
- Search icon prefix
- Clear button when value exists
- Debounces onChange callback

---

### FilterBar

Container for search and filter controls.

```typescript
interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

// Usage
<FilterBar>
  <SearchInput ... />
  <Select placeholder="Status" ... />
  <DateRangePicker ... />
  <Button variant="outline" onClick={clearFilters}>
    Clear Filters
  </Button>
</FilterBar>
```

---

## Feedback Components

### LoadingSpinner

Consistent loading indicator.

```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg';
  text?: string;
  className?: string;
}

// Usage
<LoadingSpinner />
<LoadingSpinner size="lg" text="Loading appointments..." />
```

---

### LoadingOverlay

Full section loading overlay.

```typescript
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
}

// Usage
<LoadingOverlay isLoading={isFetching} text="Refreshing...">
  <DataTable ... />
</LoadingOverlay>
```

---

### ErrorState

Error display with retry action.

```typescript
interface ErrorStateProps {
  title?: string;             // Default: "Something went wrong"
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Usage
<ErrorState
  title="Failed to load customers"
  description="Please check your connection and try again."
  action={<Button onClick={refetch}>Try Again</Button>}
/>
```

---

## Layout Components

### Collapsible Sidebar

Side navigation with collapse functionality.

```typescript
// Controlled by UIStore
interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
}

// Features:
// - Expanded: 256px width, full labels
// - Collapsed: 64px width, icons with tooltips
// - Mobile: Sheet drawer from left
// - Persisted in localStorage
```

**Navigation Items:**
1. Dashboard
2. Appointments
3. Customers
4. Services
5. Billing
6. Inventory
7. Reports
8. Marketing
9. Settings (bottom)
10. Help (bottom)

---

### Header

Top header with navigation and user controls.

```typescript
// Mobile features:
// - Hamburger menu button
// - Logo/brand
// - User avatar

// Desktop features:
// - Breadcrumbs
// - Global search (Cmd+K)
// - Notifications bell
// - Branch switcher
// - User dropdown (profile, settings, logout)
```

---

### MobileNav

Mobile navigation drawer.

```typescript
// Features:
// - Opens from left side
// - Same items as sidebar
// - Closes on route change
// - Closes on outside click
```

---

## File Structure

```
apps/web/src/components/
├── ui/                           # Raw shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ... (more shadcn)
│
├── common/                       # Wrapper components
│   ├── page-container.tsx
│   ├── page-header.tsx
│   ├── page-content.tsx
│   ├── data-table.tsx
│   ├── stat-card.tsx
│   ├── status-badge.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── form-section.tsx
│   ├── form-actions.tsx
│   ├── currency-input.tsx
│   ├── phone-input.tsx
│   ├── date-range-picker.tsx
│   ├── confirm-dialog.tsx
│   ├── action-menu.tsx
│   ├── search-input.tsx
│   ├── filter-bar.tsx
│   ├── loading-spinner.tsx
│   ├── loading-overlay.tsx
│   └── index.ts                  # Barrel export
│
├── layout/
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── mobile-nav.tsx
│   ├── breadcrumbs.tsx
│   └── footer.tsx
│
└── [module]/                     # Module-specific components
    ├── appointments/
    ├── customers/
    ├── services/
    └── ...
```
