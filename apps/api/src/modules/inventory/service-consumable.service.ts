/**
 * Service Consumable Service
 * Business logic for mapping services to consumable products
 * Requirements: 15.1-15.5
 */

import { prisma, serializeDecimals } from '../../lib/prisma';

import type {
  ServiceConsumableMapping,
  ServiceConsumableMappingWithProduct,
  CreateMappingInput,
  UpdateMappingInput,
} from './inventory.types';

export class ServiceConsumableService {
  // ============================================
  // CRUD Operations
  // Requirements: 15.1, 15.2
  // ============================================

  /**
   * Create a new service-product mapping
   * Requirement 15.1: Map services to consumable products
   */
  async create(
    tenantId: string,
    data: CreateMappingInput,
    _userId: string
  ): Promise<ServiceConsumableMappingWithProduct> {
    // Verify service exists
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, tenantId, deletedAt: null },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Verify product exists and is consumable
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        tenantId,
        deletedAt: null,
        productType: { in: ['consumable', 'both'] },
      },
    });

    if (!product) {
      throw new Error('Product not found or is not a consumable product');
    }

    // Check for existing mapping
    const existing = await prisma.serviceConsumableMapping.findFirst({
      where: {
        tenantId,
        serviceId: data.serviceId,
        productId: data.productId,
      },
    });

    if (existing) {
      throw new Error('Mapping already exists for this service and product');
    }

    const mapping = await prisma.serviceConsumableMapping.create({
      data: {
        tenantId,
        serviceId: data.serviceId,
        productId: data.productId,
        quantityPerService: data.quantityPerService,
        isActive: data.isActive ?? true,
      },
      include: {
        product: true,
      },
    });

    return serializeDecimals(mapping) as unknown as ServiceConsumableMappingWithProduct;
  }

  /**
   * Update a service-product mapping
   * Requirement 15.2: Update quantity per service
   */
  async update(
    tenantId: string,
    id: string,
    data: UpdateMappingInput,
    _userId: string
  ): Promise<ServiceConsumableMappingWithProduct> {
    const existing = await prisma.serviceConsumableMapping.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Mapping not found');
    }

    const mapping = await prisma.serviceConsumableMapping.update({
      where: { id },
      data: {
        quantityPerService: data.quantityPerService,
        isActive: data.isActive,
      },
      include: {
        product: true,
      },
    });

    return serializeDecimals(mapping) as unknown as ServiceConsumableMappingWithProduct;
  }

  /**
   * Delete a service-product mapping
   */
  async delete(tenantId: string, id: string): Promise<void> {
    const existing = await prisma.serviceConsumableMapping.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Mapping not found');
    }

    await prisma.serviceConsumableMapping.delete({
      where: { id },
    });
  }

  /**
   * Get all mappings for a service
   */
  async getForService(
    tenantId: string,
    serviceId: string
  ): Promise<ServiceConsumableMappingWithProduct[]> {
    const mappings = await prisma.serviceConsumableMapping.findMany({
      where: {
        tenantId,
        serviceId,
      },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return serializeDecimals(mappings) as unknown as ServiceConsumableMappingWithProduct[];
  }

  /**
   * Get all mappings for a product
   */
  async getForProduct(tenantId: string, productId: string): Promise<ServiceConsumableMapping[]> {
    const mappings = await prisma.serviceConsumableMapping.findMany({
      where: {
        tenantId,
        productId,
      },
      orderBy: { createdAt: 'asc' },
    });

    return serializeDecimals(mappings) as unknown as ServiceConsumableMapping[];
  }

  /**
   * Get a single mapping by ID
   */
  async get(tenantId: string, id: string): Promise<ServiceConsumableMappingWithProduct | null> {
    const mapping = await prisma.serviceConsumableMapping.findFirst({
      where: { id, tenantId },
      include: {
        product: true,
      },
    });

    return mapping
      ? (serializeDecimals(mapping) as unknown as ServiceConsumableMappingWithProduct)
      : null;
  }
}

export const serviceConsumableService = new ServiceConsumableService();
