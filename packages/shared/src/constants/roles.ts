/**
 * Role-Permission Matrix
 * Based on: .cursor/rules/00-architecture.mdc lines 331-372
 */

import type { UserRole } from '../types/models/user';

/**
 * All available permissions in the system
 */
export const PERMISSIONS = {
  // Tenant
  TENANT_MANAGE: 'tenant:manage',

  // Branch
  BRANCH_READ: 'branch:read',
  BRANCH_WRITE: 'branch:write',
  BRANCH_MANAGE: 'branch:manage',

  // Users/Staff
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_MANAGE: 'users:manage',

  // Appointments
  APPOINTMENTS_READ: 'appointments:read',
  APPOINTMENTS_WRITE: 'appointments:write',
  APPOINTMENTS_READ_OWN: 'appointments:read:own',
  APPOINTMENTS_MANAGE: 'appointments:*',

  // Customers
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_WRITE: 'customers:write',
  CUSTOMERS_READ_LIMITED: 'customers:read:limited',
  CUSTOMERS_MANAGE: 'customers:*',

  // Services
  SERVICES_READ: 'services:read',
  SERVICES_WRITE: 'services:write',
  SERVICES_MANAGE: 'services:*',

  // Bills
  BILLS_READ: 'bills:read',
  BILLS_WRITE: 'bills:write',
  BILLS_READ_OWN: 'bills:read:own',
  BILLS_MANAGE: 'bills:*',

  // Reports
  REPORTS_READ: 'reports:read',
  REPORTS_READ_BRANCH: 'reports:read:branch',
  REPORTS_READ_FINANCIAL: 'reports:read:financial',
  REPORTS_MANAGE: 'reports:*',

  // Inventory
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  INVENTORY_MANAGE: 'inventory:*',

  // Expenses
  EXPENSES_READ: 'expenses:read',
  EXPENSES_WRITE: 'expenses:write',
  EXPENSES_MANAGE: 'expenses:*',

  // Marketing
  MARKETING_READ: 'marketing:read',
  MARKETING_WRITE: 'marketing:write',
  MARKETING_WRITE_BRANCH: 'marketing:write:branch',
  MARKETING_MANAGE: 'marketing:*',

  // Settings
  SETTINGS_MANAGE: 'settings:manage',

  // All permissions
  ALL: '*',
} as const;

/**
 * Role-Permission mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_owner: [PERMISSIONS.ALL],

  regional_manager: [
    PERMISSIONS.BRANCH_READ,
    PERMISSIONS.BRANCH_WRITE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.BILLS_MANAGE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.EXPENSES_MANAGE,
    PERMISSIONS.MARKETING_MANAGE,
  ],

  branch_manager: [
    PERMISSIONS.BRANCH_READ,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.BILLS_MANAGE,
    PERMISSIONS.REPORTS_READ_BRANCH,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.EXPENSES_WRITE,
    PERMISSIONS.MARKETING_WRITE_BRANCH,
  ],

  receptionist: [
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_WRITE,
    PERMISSIONS.BILLS_READ,
    PERMISSIONS.BILLS_WRITE,
    PERMISSIONS.SERVICES_READ,
  ],

  stylist: [
    PERMISSIONS.APPOINTMENTS_READ_OWN,
    PERMISSIONS.CUSTOMERS_READ_LIMITED,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.BILLS_READ_OWN,
  ],

  accountant: [
    PERMISSIONS.BILLS_READ,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_READ_FINANCIAL,
    PERMISSIONS.EXPENSES_READ,
    PERMISSIONS.INVENTORY_READ,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];

  // Super owner has all permissions
  if (permissions.includes(PERMISSIONS.ALL)) {
    return true;
  }

  // Check for wildcard permissions (e.g., 'appointments:*' includes 'appointments:read')
  const [resource] = permission.split(':');
  const wildcardPermission = `${resource}:*`;

  return permissions.includes(permission) || permissions.includes(wildcardPermission);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}
