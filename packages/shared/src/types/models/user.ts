/**
 * User (Staff) Types
 * Based on: .cursor/rules/00-architecture.mdc lines 192-220
 */

export interface User {
  id: string;
  tenantId: string;
  email?: string;
  phone: string;
  name: string;
  role: UserRole;
  gender?: Gender;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type UserRole =
  | 'super_owner'
  | 'regional_manager'
  | 'branch_manager'
  | 'receptionist'
  | 'stylist'
  | 'accountant';

export type Gender = 'male' | 'female' | 'other';

export interface UserSettings {
  preferredLanguage?: 'en' | 'hi';
  theme?: string;
  notifications?: NotificationPreferences;
  [key: string]: unknown;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
}

export interface UserBranch {
  id: string;
  userId: string;
  branchId: string;
  isPrimary: boolean;
  createdAt: Date;
}

/**
 * JWT Token payload
 * Based on: .cursor/rules/00-architecture.mdc lines 308-328
 */
export interface JwtPayload {
  sub: string; // user id
  tenantId: string;
  branchIds: string[];
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tenantId: string;
  type: 'refresh';
  iat: number;
  exp: number;
}
