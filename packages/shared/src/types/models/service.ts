/**
 * Service & Pricing Types
 * Based on: .cursor/rules/04-services-pricing.mdc
 */

export interface ServiceCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Service {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  price: number;
  gstRate: number;
  isActive: boolean;
  hasVariants: boolean;
  imageUrl?: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ServiceVariant {
  id: string;
  serviceId: string;
  name: string;
  duration: number;
  price: number;
  isActive: boolean;
  displayOrder: number;
}

export interface ServiceWithCategory extends Service {
  category?: ServiceCategory;
  variants?: ServiceVariant[];
}

export interface BranchService {
  id: string;
  branchId: string;
  serviceId: string;
  price?: number; // Override price for this branch
  isActive: boolean;
}
