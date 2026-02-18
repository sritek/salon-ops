/**
 * Role-based dashboard type selector utility
 * Maps user roles to appropriate dashboard views
 */

export type DashboardRole = 'owner' | 'manager' | 'operational' | 'accountant';

/**
 * Get the dashboard type based on user role
 * - owner: super_owner, regional_manager - see business-wide metrics
 * - manager: branch_manager - see branch-specific metrics + staff
 * - operational: receptionist, stylist - see appointments and queue
 * - accountant: accountant - see billing and financial metrics
 */
export function getRoleDashboardType(role: string): DashboardRole {
  switch (role) {
    case 'super_owner':
    case 'regional_manager':
      return 'owner';
    case 'branch_manager':
      return 'manager';
    case 'accountant':
      return 'accountant';
    default: // receptionist, stylist
      return 'operational';
  }
}
