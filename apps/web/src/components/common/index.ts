/**
 * Common Components - Barrel Export
 * 
 * Import from this file for all common wrapper components.
 * Example: import { PageHeader, DataTable, StatusBadge } from '@/components/common';
 */

// Page components
export { PageContainer } from './page-container';
export { PageHeader } from './page-header';
export { PageContent } from './page-content';

// Data display
export { StatCard } from './stat-card';
export { StatusBadge } from './status-badge';
export { EmptyState } from './empty-state';
export { ErrorState } from './error-state';

// Form components
export { FormSection } from './form-section';
export { FormActions } from './form-actions';
export { CurrencyInput } from './currency-input';
export { PhoneInput } from './phone-input';

// Interaction components
export { ConfirmDialog } from './confirm-dialog';
export { ActionMenu } from './action-menu';
export { SearchInput } from './search-input';
export { FilterBar } from './filter-bar';

// Feedback components
export { LoadingSpinner } from './loading-spinner';
export { LoadingOverlay } from './loading-overlay';

// Access control components
export { PermissionGuard } from './permission-guard';
export { AccessDenied } from './access-denied';
