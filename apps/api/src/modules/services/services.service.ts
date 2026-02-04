/**
 * Services Service
 * Business logic for service management
 */

import { prisma } from '../../lib/prisma';

import type { Prisma, Service } from '@prisma/client';
import type {
  CatalogQuery,
  CreateServiceBody,
  ServiceQuery,
  UpdateServiceBody,
} from './services.schema';

export class ServicesService {
  /**
   * Get all services with filtering and pagination
   */
  async getServices(
    tenantId: string,
    query: ServiceQuery
  ): Promise<{ data: Service[]; total: number; page: number; limit: number }> {
    const where: Prisma.ServiceWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Apply filters
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isPopular !== undefined) {
      where.isPopular = query.isPopular;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query.isOnlineBookable !== undefined) {
      where.isOnlineBookable = query.isOnlineBookable;
    }

    if (query.genderApplicable) {
      where.genderApplicable = query.genderApplicable;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.service.count({ where });

    // Get paginated data
    const data = await prisma.service.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        category: {
          select: { id: true, name: true, slug: true, color: true },
        },
        _count: {
          select: { variants: true },
        },
      },
    });

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Get a single service by ID
   */
  async getServiceById(
    tenantId: string,
    serviceId: string
  ): Promise<Service | null> {
    return prisma.service.findFirst({
      where: {
        id: serviceId,
        tenantId,
        deletedAt: null,
      },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        branchPrices: true,
        addOnMappings: {
          include: {
            addOn: true,
          },
        },
      },
    });
  }

  /**
   * Create a new service
   */
  async createService(
    tenantId: string,
    data: CreateServiceBody,
    createdBy?: string
  ): Promise<Service> {
    // Check for duplicate SKU
    const existingSku = await prisma.service.findUnique({
      where: { tenantId_sku: { tenantId, sku: data.sku } },
    });

    if (existingSku) {
      throw new Error('Service with this SKU already exists');
    }

    // Verify category exists
    const category = await prisma.serviceCategory.findFirst({
      where: { id: data.categoryId, tenantId, deletedAt: null },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Get next display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.service.aggregate({
        where: { tenantId, categoryId: data.categoryId },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    return prisma.service.create({
      data: {
        tenantId,
        categoryId: data.categoryId,
        sku: data.sku,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        taxRate: data.taxRate,
        hsnSacCode: data.hsnSacCode,
        isTaxInclusive: data.isTaxInclusive,
        durationMinutes: data.durationMinutes,
        activeTimeMinutes: data.activeTimeMinutes,
        processingTimeMinutes: data.processingTimeMinutes,
        genderApplicable: data.genderApplicable,
        skillLevelRequired: data.skillLevelRequired,
        commissionType: data.commissionType,
        commissionValue: data.commissionValue,
        assistantCommissionValue: data.assistantCommissionValue,
        displayOrder,
        isPopular: data.isPopular,
        isFeatured: data.isFeatured,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
        isOnlineBookable: data.isOnlineBookable,
        createdBy,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Update a service
   */
  async updateService(
    tenantId: string,
    serviceId: string,
    data: UpdateServiceBody,
    updatedBy?: string
  ): Promise<Service> {
    const existing = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Service not found');
    }

    // Check SKU uniqueness if changed
    if (data.sku && data.sku !== existing.sku) {
      const duplicate = await prisma.service.findFirst({
        where: {
          tenantId,
          sku: data.sku,
          id: { not: serviceId },
        },
      });
      if (duplicate) {
        throw new Error('Service with this SKU already exists');
      }
    }

    // Verify category if changed
    if (data.categoryId && data.categoryId !== existing.categoryId) {
      const category = await prisma.serviceCategory.findFirst({
        where: { id: data.categoryId, tenantId, deletedAt: null },
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Track price change
    if (data.basePrice !== undefined && data.basePrice !== Number(existing.basePrice)) {
      await prisma.servicePriceHistory.create({
        data: {
          tenantId,
          serviceId,
          oldPrice: existing.basePrice,
          newPrice: data.basePrice,
          changedBy: updatedBy,
        },
      });
    }

    return prisma.service.update({
      where: { id: serviceId },
      data,
      include: {
        category: true,
      },
    });
  }

  /**
   * Delete a service (soft delete)
   */
  async deleteService(tenantId: string, serviceId: string): Promise<void> {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      include: {
        appointmentServices: {
          take: 1,
        },
      },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Soft delete if has appointments
    if (service.appointmentServices.length > 0) {
      await prisma.service.update({
        where: { id: serviceId },
        data: { deletedAt: new Date(), isActive: false },
      });
    } else {
      // Hard delete if no appointments
      await prisma.$transaction([
        prisma.serviceVariant.deleteMany({ where: { serviceId } }),
        prisma.branchServicePrice.deleteMany({ where: { serviceId } }),
        prisma.serviceAddOnMapping.deleteMany({ where: { serviceId } }),
        prisma.servicePriceHistory.deleteMany({ where: { serviceId } }),
        prisma.service.delete({ where: { id: serviceId } }),
      ]);
    }
  }

  /**
   * Duplicate a service
   */
  async duplicateService(
    tenantId: string,
    serviceId: string,
    createdBy?: string
  ): Promise<Service> {
    const original = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      include: {
        variants: true,
      },
    });

    if (!original) {
      throw new Error('Service not found');
    }

    // Generate new SKU
    let newSku = `${original.sku}-COPY`;
    let counter = 1;
    while (true) {
      const exists = await prisma.service.findUnique({
        where: { tenantId_sku: { tenantId, sku: newSku } },
      });
      if (!exists) break;
      newSku = `${original.sku}-COPY-${counter++}`;
    }

    // Create duplicate
    const duplicate = await prisma.service.create({
      data: {
        tenantId,
        categoryId: original.categoryId,
        sku: newSku,
        name: `${original.name} (Copy)`,
        description: original.description,
        basePrice: original.basePrice,
        taxRate: original.taxRate,
        hsnSacCode: original.hsnSacCode,
        isTaxInclusive: original.isTaxInclusive,
        durationMinutes: original.durationMinutes,
        activeTimeMinutes: original.activeTimeMinutes,
        processingTimeMinutes: original.processingTimeMinutes,
        genderApplicable: original.genderApplicable,
        skillLevelRequired: original.skillLevelRequired,
        commissionType: original.commissionType,
        commissionValue: original.commissionValue,
        assistantCommissionValue: original.assistantCommissionValue,
        displayOrder: original.displayOrder + 1,
        isPopular: false,
        isFeatured: false,
        imageUrl: original.imageUrl,
        isActive: false, // Start as inactive
        isOnlineBookable: original.isOnlineBookable,
        createdBy,
      },
    });

    // Duplicate variants
    if (original.variants.length > 0) {
      await prisma.serviceVariant.createMany({
        data: original.variants.map((v) => ({
          tenantId,
          serviceId: duplicate.id,
          name: v.name,
          variantGroup: v.variantGroup,
          priceAdjustmentType: v.priceAdjustmentType,
          priceAdjustment: v.priceAdjustment,
          durationAdjustment: v.durationAdjustment,
          displayOrder: v.displayOrder,
          isActive: v.isActive,
        })),
      });
    }

    return duplicate;
  }

  /**
   * Get service catalog (hierarchical view for a branch)
   */
  async getServiceCatalog(
    tenantId: string,
    query: CatalogQuery
  ) {
    const categoryWhere: Prisma.ServiceCategoryWhereInput = {
      tenantId,
      deletedAt: null,
      parentId: null, // Top-level only
    };

    if (!query.includeInactive) {
      categoryWhere.isActive = true;
    }

    const serviceWhere: Prisma.ServiceWhereInput = {
      deletedAt: null,
    };

    if (!query.includeInactive) {
      serviceWhere.isActive = true;
    }

    const categories = await prisma.serviceCategory.findMany({
      where: categoryWhere,
      orderBy: { displayOrder: 'asc' },
      include: {
        services: {
          where: serviceWhere,
          orderBy: { displayOrder: 'asc' },
          include: {
            variants: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
            },
            ...(query.branchId && {
              branchPrices: {
                where: { branchId: query.branchId },
              },
            }),
          },
        },
        subCategories: {
          where: { deletedAt: null, ...(query.includeInactive ? {} : { isActive: true }) },
          orderBy: { displayOrder: 'asc' },
          include: {
            services: {
              where: serviceWhere,
              orderBy: { displayOrder: 'asc' },
              include: {
                variants: {
                  where: { isActive: true },
                  orderBy: { displayOrder: 'asc' },
                },
                ...(query.branchId && {
                  branchPrices: {
                    where: { branchId: query.branchId },
                  },
                }),
              },
            },
          },
        },
      },
    });

    // Calculate effective prices if branchId provided
    if (query.branchId) {
      return categories.map((category) => ({
        ...category,
        services: category.services.map((service) => {
          const branchPrice = (service as any).branchPrices?.[0];
          return {
            ...service,
            effectivePrice: branchPrice?.price ?? service.basePrice,
            isAvailable: branchPrice?.isAvailable ?? true,
          };
        }),
        subCategories: category.subCategories?.map((subCat) => ({
          ...subCat,
          services: subCat.services.map((service) => {
            const branchPrice = (service as any).branchPrices?.[0];
            return {
              ...service,
              effectivePrice: branchPrice?.price ?? service.basePrice,
              isAvailable: branchPrice?.isAvailable ?? true,
            };
          }),
        })),
      }));
    }

    return categories;
  }
}

export const servicesService = new ServicesService();
