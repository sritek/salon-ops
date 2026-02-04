/**
 * Price Engine
 * Handles price calculation for services, variants, add-ons, and combos
 */

import { prisma } from '../../lib/prisma';

import type { CalculatePriceBody } from './services.schema';

interface ServicePriceBreakdown {
  serviceId: string;
  serviceName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  basePrice: number;
  variantAdjustment: number;
  branchAdjustment: number;
  effectiveUnitPrice: number;
  subtotal: number;
  addOns: Array<{
    addOnId: string;
    addOnName: string;
    price: number;
  }>;
  addOnsTotal: number;
  total: number;
}

interface ComboPriceBreakdown {
  comboId: string;
  comboName: string;
  originalPrice: number;
  comboPrice: number;
  savings: number;
  services: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
  }>;
}

interface PriceCalculationResult {
  services: ServicePriceBreakdown[];
  combos: ComboPriceBreakdown[];
  servicesSubtotal: number;
  combosSubtotal: number;
  subtotal: number;
  taxBreakdown: Array<{
    rate: number;
    taxableAmount: number;
    taxAmount: number;
  }>;
  totalTax: number;
  grandTotal: number;
}

export class PriceEngine {
  /**
   * Calculate total price for a set of services and combos
   */
  async calculatePrice(
    tenantId: string,
    data: CalculatePriceBody
  ): Promise<PriceCalculationResult> {
    const result: PriceCalculationResult = {
      services: [],
      combos: [],
      servicesSubtotal: 0,
      combosSubtotal: 0,
      subtotal: 0,
      taxBreakdown: [],
      totalTax: 0,
      grandTotal: 0,
    };

    // Tax collection map
    const taxMap = new Map<number, { taxableAmount: number; taxAmount: number }>();

    // Process individual services
    for (const item of data.services) {
      const breakdown = await this.calculateServicePrice(
        tenantId,
        data.branchId,
        item.serviceId,
        item.variantId,
        item.quantity,
        item.addOnIds || []
      );

      result.services.push(breakdown);
      result.servicesSubtotal += breakdown.total;

      // Accumulate tax
      const service = await prisma.service.findUnique({
        where: { id: item.serviceId },
        select: { taxRate: true, isTaxInclusive: true },
      });

      if (service) {
        const taxRate = Number(service.taxRate);
        let taxableAmount = breakdown.total;
        let taxAmount = 0;

        if (service.isTaxInclusive) {
          taxableAmount = breakdown.total / (1 + taxRate / 100);
          taxAmount = breakdown.total - taxableAmount;
        } else {
          taxAmount = taxableAmount * (taxRate / 100);
        }

        const existing = taxMap.get(taxRate) || { taxableAmount: 0, taxAmount: 0 };
        taxMap.set(taxRate, {
          taxableAmount: existing.taxableAmount + taxableAmount,
          taxAmount: existing.taxAmount + taxAmount,
        });
      }
    }

    // Process combos
    if (data.comboIds && data.comboIds.length > 0) {
      for (const comboId of data.comboIds) {
        const comboBreakdown = await this.calculateComboPrice(tenantId, comboId);
        if (comboBreakdown) {
          result.combos.push(comboBreakdown);
          result.combosSubtotal += comboBreakdown.comboPrice;

          // Accumulate tax for combo
          const combo = await prisma.comboService.findUnique({
            where: { id: comboId },
            select: { taxRate: true },
          });

          if (combo) {
            const taxRate = Number(combo.taxRate);
            const taxableAmount = comboBreakdown.comboPrice;
            const taxAmount = taxableAmount * (taxRate / 100);

            const existing = taxMap.get(taxRate) || { taxableAmount: 0, taxAmount: 0 };
            taxMap.set(taxRate, {
              taxableAmount: existing.taxableAmount + taxableAmount,
              taxAmount: existing.taxAmount + taxAmount,
            });
          }
        }
      }
    }

    // Calculate totals
    result.subtotal = result.servicesSubtotal + result.combosSubtotal;

    // Build tax breakdown
    for (const [rate, { taxableAmount, taxAmount }] of taxMap) {
      result.taxBreakdown.push({
        rate,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
      });
      result.totalTax += taxAmount;
    }

    result.totalTax = Math.round(result.totalTax * 100) / 100;
    result.grandTotal = Math.round((result.subtotal + result.totalTax) * 100) / 100;

    return result;
  }

  /**
   * Calculate price for a single service
   */
  private async calculateServicePrice(
    tenantId: string,
    branchId: string,
    serviceId: string,
    variantId: string | undefined,
    quantity: number,
    addOnIds: string[]
  ): Promise<ServicePriceBreakdown> {
    // Get service with branch price override
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      include: {
        branchPrices: {
          where: { branchId },
        },
      },
    });

    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const branchPrice = service.branchPrices[0];

    // Check availability
    if (branchPrice && !branchPrice.isAvailable) {
      throw new Error(`Service ${service.name} is not available at this branch`);
    }

    const basePrice = Number(service.basePrice);
    const branchAdjustment = branchPrice?.price ? Number(branchPrice.price) - basePrice : 0;

    // Get variant adjustment
    let variantAdjustment = 0;
    let variantName: string | undefined;

    if (variantId) {
      const variant = await prisma.serviceVariant.findFirst({
        where: { id: variantId, serviceId, isActive: true },
      });

      if (!variant) {
        throw new Error(`Variant ${variantId} not found`);
      }

      variantName = variant.name;

      if (variant.priceAdjustmentType === 'percentage') {
        variantAdjustment =
          (basePrice + branchAdjustment) * (Number(variant.priceAdjustment) / 100);
      } else {
        variantAdjustment = Number(variant.priceAdjustment);
      }
    }

    const effectiveUnitPrice = basePrice + branchAdjustment + variantAdjustment;
    const subtotal = effectiveUnitPrice * quantity;

    // Get add-ons
    const addOns: ServicePriceBreakdown['addOns'] = [];
    let addOnsTotal = 0;

    if (addOnIds.length > 0) {
      const addOnRecords = await prisma.serviceAddOn.findMany({
        where: { id: { in: addOnIds }, tenantId, isActive: true },
      });

      for (const addOn of addOnRecords) {
        // Check for override price in mapping
        const mapping = await prisma.serviceAddOnMapping.findFirst({
          where: { serviceId, addOnId: addOn.id },
        });

        const price = mapping?.overridePrice ? Number(mapping.overridePrice) : Number(addOn.price);

        addOns.push({
          addOnId: addOn.id,
          addOnName: addOn.name,
          price,
        });

        addOnsTotal += price * quantity;
      }
    }

    return {
      serviceId,
      serviceName: service.name,
      variantId,
      variantName,
      quantity,
      basePrice,
      variantAdjustment,
      branchAdjustment,
      effectiveUnitPrice,
      subtotal,
      addOns,
      addOnsTotal,
      total: subtotal + addOnsTotal,
    };
  }

  /**
   * Calculate price for a combo
   */
  private async calculateComboPrice(
    tenantId: string,
    comboId: string
  ): Promise<ComboPriceBreakdown | null> {
    const combo = await prisma.comboService.findFirst({
      where: { id: comboId, tenantId, isActive: true },
      include: {
        items: {
          include: {
            service: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!combo) {
      throw new Error(`Combo ${comboId} not found`);
    }

    // Check validity dates
    const now = new Date();
    if (combo.validFrom && combo.validFrom > now) {
      throw new Error(`Combo ${combo.name} is not yet valid`);
    }
    if (combo.validUntil && combo.validUntil < now) {
      throw new Error(`Combo ${combo.name} has expired`);
    }

    return {
      comboId: combo.id,
      comboName: combo.name,
      originalPrice: Number(combo.originalPrice),
      comboPrice: Number(combo.comboPrice),
      savings: Number(combo.originalPrice) - Number(combo.comboPrice),
      services: combo.items.map((item) => ({
        serviceId: item.serviceId,
        serviceName: item.service.name,
        quantity: item.quantity,
      })),
    };
  }

  /**
   * Get effective price for a service at a branch
   */
  async getEffectivePrice(tenantId: string, branchId: string, serviceId: string): Promise<number> {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      include: {
        branchPrices: {
          where: { branchId },
        },
      },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    const branchPrice = service.branchPrices[0];
    return branchPrice?.price ? Number(branchPrice.price) : Number(service.basePrice);
  }
}

export const priceEngine = new PriceEngine();
