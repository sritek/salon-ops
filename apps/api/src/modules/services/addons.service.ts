/**
 * Add-Ons Service
 * Business logic for service add-on management
 */

import { prisma } from '../../lib/prisma';

import type { ServiceAddOn } from '@prisma/client';
import type {
  CreateAddOnBody,
  MapAddOnsToServiceBody,
  UpdateAddOnBody,
} from './services.schema';

export class AddOnsService {
  /**
   * Get all add-ons for a tenant
   */
  async getAddOns(
    tenantId: string,
    includeInactive = false
  ): Promise<ServiceAddOn[]> {
    const where: Record<string, unknown> = { tenantId };

    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.serviceAddOn.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        applicableCategory: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { serviceMappings: true },
        },
      },
    });
  }

  /**
   * Create a new add-on
   */
  async createAddOn(
    tenantId: string,
    data: CreateAddOnBody
  ): Promise<ServiceAddOn> {
    // Verify category if specified
    if (data.applicableCategoryId) {
      const category = await prisma.serviceCategory.findFirst({
        where: { id: data.applicableCategoryId, tenantId, deletedAt: null },
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Get next display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.serviceAddOn.aggregate({
        where: { tenantId },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    return prisma.serviceAddOn.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        price: data.price,
        taxRate: data.taxRate,
        durationMinutes: data.durationMinutes,
        applicableTo: data.applicableTo,
        applicableCategoryId: data.applicableCategoryId,
        isActive: data.isActive,
        displayOrder,
      },
    });
  }

  /**
   * Update an add-on
   */
  async updateAddOn(
    tenantId: string,
    addOnId: string,
    data: UpdateAddOnBody
  ): Promise<ServiceAddOn> {
    const existing = await prisma.serviceAddOn.findFirst({
      where: { id: addOnId, tenantId },
    });

    if (!existing) {
      throw new Error('Add-on not found');
    }

    // Verify category if specified
    if (data.applicableCategoryId) {
      const category = await prisma.serviceCategory.findFirst({
        where: { id: data.applicableCategoryId, tenantId, deletedAt: null },
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    return prisma.serviceAddOn.update({
      where: { id: addOnId },
      data,
    });
  }

  /**
   * Delete an add-on
   */
  async deleteAddOn(tenantId: string, addOnId: string): Promise<void> {
    const addOn = await prisma.serviceAddOn.findFirst({
      where: { id: addOnId, tenantId },
    });

    if (!addOn) {
      throw new Error('Add-on not found');
    }

    // Delete mappings and add-on in transaction
    await prisma.$transaction([
      prisma.serviceAddOnMapping.deleteMany({ where: { addOnId } }),
      prisma.serviceAddOn.delete({ where: { id: addOnId } }),
    ]);
  }

  /**
   * Map add-ons to a service
   */
  async mapAddOnsToService(
    tenantId: string,
    serviceId: string,
    data: MapAddOnsToServiceBody
  ): Promise<{ mapped: number }> {
    // Verify service belongs to tenant
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Verify all add-ons belong to tenant
    const addOnIds = data.addOns.map((a) => a.addOnId);
    const addOns = await prisma.serviceAddOn.findMany({
      where: { id: { in: addOnIds }, tenantId },
    });

    if (addOns.length !== addOnIds.length) {
      throw new Error('Some add-ons not found');
    }

    // Delete existing mappings and create new ones
    await prisma.$transaction([
      prisma.serviceAddOnMapping.deleteMany({ where: { serviceId } }),
      prisma.serviceAddOnMapping.createMany({
        data: data.addOns.map((addOn) => ({
          tenantId,
          serviceId,
          addOnId: addOn.addOnId,
          overridePrice: addOn.overridePrice,
          isDefault: addOn.isDefault,
        })),
      }),
    ]);

    return { mapped: data.addOns.length };
  }

  /**
   * Get add-ons for a specific service
   */
  async getServiceAddOns(
    tenantId: string,
    serviceId: string
  ): Promise<
    Array<{
      addOn: ServiceAddOn;
      overridePrice: number | null;
      isDefault: boolean;
    }>
  > {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    const mappings = await prisma.serviceAddOnMapping.findMany({
      where: { serviceId },
      include: { addOn: true },
    });

    return mappings.map((m) => ({
      addOn: m.addOn,
      overridePrice: m.overridePrice ? Number(m.overridePrice) : null,
      isDefault: m.isDefault,
    }));
  }
}

export const addOnsService = new AddOnsService();
