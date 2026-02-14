/**
 * Vendor Service
 * Business logic for vendor management and vendor-product mappings
 * Requirements: 4.1-4.5, 5.1-5.5
 */

import { prisma, serializeDecimals } from '../../lib/prisma';

import type { Prisma } from '@prisma/client';
import type {
  Vendor,
  VendorProductMapping,
  CreateVendorInput,
  UpdateVendorInput,
  VendorFilters,
  CreateVendorProductInput,
  UpdateVendorProductInput,
  VendorWithProducts,
} from './inventory.types';

export class VendorService {
  // ============================================
  // Vendor Management
  // Requirements: 4.1-4.5
  // ============================================

  /**
   * Create a new vendor
   * Requirement 4.1: Requires name, contactPerson, phone
   * Requirement 4.2: Optional email, address, GSTIN, payment terms, lead time
   */
  async createVendor(
    tenantId: string,
    data: CreateVendorInput,
    createdBy?: string
  ): Promise<Vendor> {
    // Validate required fields (Requirement 4.1)
    if (!data.name || !data.contactPerson || !data.phone) {
      throw new Error('Name, contact person, and phone are required');
    }

    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        gstin: data.gstin,
        paymentTermsDays: data.paymentTermsDays,
        leadTimeDays: data.leadTimeDays,
        isActive: data.isActive ?? true,
        createdBy,
      },
    });

    return serializeDecimals(vendor) as Vendor;
  }

  /**
   * Update an existing vendor
   * Requirement 4.3: Allow marking vendors as active/inactive
   */
  async updateVendor(
    tenantId: string,
    vendorId: string,
    data: UpdateVendorInput,
    _updatedBy?: string
  ): Promise<Vendor> {
    const existing = await prisma.vendor.findFirst({
      where: { id: vendorId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Vendor not found');
    }

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.pincode !== undefined && { pincode: data.pincode }),
        ...(data.gstin !== undefined && { gstin: data.gstin }),
        ...(data.paymentTermsDays !== undefined && { paymentTermsDays: data.paymentTermsDays }),
        ...(data.leadTimeDays !== undefined && { leadTimeDays: data.leadTimeDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return serializeDecimals(vendor) as Vendor;
  }

  /**
   * Get a single vendor by ID
   */
  async getVendor(tenantId: string, vendorId: string): Promise<VendorWithProducts | null> {
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        tenantId,
        deletedAt: null,
      },
      include: {
        productMappings: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                productType: true,
                unitOfMeasure: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!vendor) {
      return null;
    }

    return serializeDecimals(vendor) as VendorWithProducts;
  }

  /**
   * List vendors with filtering and pagination
   */
  async listVendors(
    tenantId: string,
    filters?: VendorFilters
  ): Promise<{ data: Vendor[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const where: Prisma.VendorWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Apply filters
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { contactPerson: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.vendor.count({ where });

    // Determine sort field and order
    const sortBy = filters?.sortBy ?? 'name';
    const sortOrder = filters?.sortOrder ?? 'asc';

    // Get paginated data
    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: serializeDecimals(vendors) as Vendor[],
      total,
      page,
      limit,
    };
  }

  /**
   * Delete a vendor (soft delete)
   * Requirement 4.4: Inactive vendors cannot have new purchase orders
   */
  async deleteVendor(tenantId: string, vendorId: string): Promise<void> {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, tenantId, deletedAt: null },
      include: {
        purchaseOrders: {
          where: {
            status: { in: ['draft', 'sent', 'partially_received'] },
          },
          take: 1,
        },
      },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Check if vendor has active purchase orders
    if (vendor.purchaseOrders.length > 0) {
      throw new Error('Cannot delete vendor with active purchase orders');
    }

    await prisma.vendor.update({
      where: { id: vendorId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /**
   * Update last purchase date for a vendor
   * Requirement 4.5: Track last purchase date
   */
  async updateLastPurchaseDate(
    _tenantId: string,
    vendorId: string,
    purchaseDate: Date
  ): Promise<void> {
    await prisma.vendor.update({
      where: { id: vendorId },
      data: { lastPurchaseDate: purchaseDate },
    });
  }

  // ============================================
  // Vendor-Product Mapping
  // Requirements: 5.1-5.5
  // ============================================

  /**
   * Map a product to a vendor
   * Requirement 5.1: Allow associating multiple vendors with a single product
   * Requirement 5.2: Allow marking one vendor as preferred for each product
   */
  async mapProductToVendor(
    tenantId: string,
    data: CreateVendorProductInput
  ): Promise<VendorProductMapping> {
    // Verify vendor exists and is active
    const vendor = await prisma.vendor.findFirst({
      where: { id: data.vendorId, tenantId, deletedAt: null },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { id: data.productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if mapping already exists
    const existingMapping = await prisma.vendorProductMapping.findUnique({
      where: {
        vendorId_productId: {
          vendorId: data.vendorId,
          productId: data.productId,
        },
      },
    });

    if (existingMapping) {
      throw new Error('Product is already mapped to this vendor');
    }

    // If this is marked as preferred, unset any existing preferred vendor for this product
    // Requirement 5.2: Only one vendor can be preferred per product
    if (data.isPreferred) {
      await prisma.vendorProductMapping.updateMany({
        where: {
          tenantId,
          productId: data.productId,
          isPreferred: true,
        },
        data: { isPreferred: false },
      });
    }

    const mapping = await prisma.vendorProductMapping.create({
      data: {
        tenantId,
        vendorId: data.vendorId,
        productId: data.productId,
        vendorSku: data.vendorSku,
        lastPurchasePrice: data.lastPurchasePrice,
        isPreferred: data.isPreferred ?? false,
      },
    });

    return serializeDecimals(mapping) as VendorProductMapping;
  }

  /**
   * Update a vendor-product mapping
   * Requirement 5.2: Handle preferred vendor flag (only one per product)
   * Requirement 5.5: Allow setting vendor-specific product codes
   */
  async updateVendorProduct(
    tenantId: string,
    mappingId: string,
    data: UpdateVendorProductInput
  ): Promise<VendorProductMapping> {
    const existing = await prisma.vendorProductMapping.findFirst({
      where: { id: mappingId, tenantId },
    });

    if (!existing) {
      throw new Error('Vendor-product mapping not found');
    }

    // If setting as preferred, unset any existing preferred vendor for this product
    // Requirement 5.2: Only one vendor can be preferred per product
    if (data.isPreferred === true) {
      await prisma.vendorProductMapping.updateMany({
        where: {
          tenantId,
          productId: existing.productId,
          isPreferred: true,
          id: { not: mappingId },
        },
        data: { isPreferred: false },
      });
    }

    const mapping = await prisma.vendorProductMapping.update({
      where: { id: mappingId },
      data: {
        ...(data.vendorSku !== undefined && { vendorSku: data.vendorSku }),
        ...(data.lastPurchasePrice !== undefined && { lastPurchasePrice: data.lastPurchasePrice }),
        ...(data.isPreferred !== undefined && { isPreferred: data.isPreferred }),
      },
    });

    return serializeDecimals(mapping) as VendorProductMapping;
  }

  /**
   * Delete a vendor-product mapping
   */
  async deleteVendorProduct(tenantId: string, mappingId: string): Promise<void> {
    const existing = await prisma.vendorProductMapping.findFirst({
      where: { id: mappingId, tenantId },
    });

    if (!existing) {
      throw new Error('Vendor-product mapping not found');
    }

    await prisma.vendorProductMapping.delete({
      where: { id: mappingId },
    });
  }

  /**
   * Get all vendors for a product
   * Requirement 5.1: Multiple vendors can be associated with a single product
   */
  async getVendorsForProduct(
    tenantId: string,
    productId: string
  ): Promise<Array<VendorProductMapping & { vendor: Vendor }>> {
    const mappings = await prisma.vendorProductMapping.findMany({
      where: {
        tenantId,
        productId,
        vendor: {
          deletedAt: null,
        },
      },
      include: {
        vendor: true,
      },
      orderBy: [{ isPreferred: 'desc' }, { vendor: { name: 'asc' } }],
    });

    return serializeDecimals(mappings) as Array<VendorProductMapping & { vendor: Vendor }>;
  }

  /**
   * Get all products for a vendor
   */
  async getProductsForVendor(
    tenantId: string,
    vendorId: string
  ): Promise<
    Array<
      VendorProductMapping & {
        product: {
          id: string;
          name: string;
          sku: string | null;
          productType: string;
          unitOfMeasure: string;
          isActive: boolean;
        };
      }
    >
  > {
    const mappings = await prisma.vendorProductMapping.findMany({
      where: {
        tenantId,
        vendorId,
        product: {
          deletedAt: null,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            productType: true,
            unitOfMeasure: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ isPreferred: 'desc' }, { product: { name: 'asc' } }],
    });

    return serializeDecimals(mappings) as Array<
      VendorProductMapping & {
        product: {
          id: string;
          name: string;
          sku: string | null;
          productType: string;
          unitOfMeasure: string;
          isActive: boolean;
        };
      }
    >;
  }

  /**
   * Get the preferred vendor for a product
   */
  async getPreferredVendorForProduct(
    tenantId: string,
    productId: string
  ): Promise<(VendorProductMapping & { vendor: Vendor }) | null> {
    const mapping = await prisma.vendorProductMapping.findFirst({
      where: {
        tenantId,
        productId,
        isPreferred: true,
        vendor: {
          deletedAt: null,
          isActive: true,
        },
      },
      include: {
        vendor: true,
      },
    });

    return mapping
      ? (serializeDecimals(mapping) as VendorProductMapping & { vendor: Vendor })
      : null;
  }

  /**
   * Update last purchase price for a vendor-product mapping
   * Requirement 5.3: Store last purchase price from each vendor
   * Requirement 5.4: Update on goods receipt confirmation
   */
  async updateLastPurchasePrice(
    _tenantId: string,
    vendorId: string,
    productId: string,
    price: number
  ): Promise<void> {
    await prisma.vendorProductMapping.updateMany({
      where: {
        vendorId,
        productId,
      },
      data: { lastPurchasePrice: price },
    });
  }

  /**
   * Check if a vendor is active
   * Requirement 4.4: Inactive vendors cannot have new purchase orders
   */
  async isVendorActive(tenantId: string, vendorId: string): Promise<boolean> {
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        tenantId,
        deletedAt: null,
        isActive: true,
      },
    });

    return vendor !== null;
  }
}

export const vendorService = new VendorService();
