/**
 * Redemption Service
 * Business logic for checking and applying membership/package benefits
 * Requirements: 5.1, 5.2, 5.3
 */

import { prisma, serializeDecimals } from '../../lib/prisma';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { format } from 'date-fns';
import type {
  CheckBenefitsBody,
  CheckBenefitsService,
  ApplyMembershipDiscountBody,
  RedeemPackageCreditsBody,
} from './redemption.schema';

interface ServiceBenefit {
  serviceId: string;
  serviceName?: string;
  originalPrice: number;
  // Membership benefits
  membershipId?: string;
  membershipName?: string;
  membershipBenefitType?: string;
  membershipDiscountAmount?: number;
  membershipFinalPrice?: number;
  isComplimentary?: boolean;
  complimentaryBenefitId?: string;
  // Package benefits
  packageId?: string;
  packageName?: string;
  packageType?: string;
  packageCreditsAvailable?: number;
  packageLockedPrice?: number;
  packageCreditId?: string;
  // Value package
  valuePackageId?: string;
  valuePackageName?: string;
  remainingValue?: number;
}

interface CheckBenefitsResult {
  customerId: string;
  branchId: string;
  services: ServiceBenefit[];
  activeMemberships: Array<{
    id: string;
    membershipNumber: string;
    planName: string;
    tier?: string;
    expiryDate: string;
  }>;
  activePackages: Array<{
    id: string;
    packageNumber: string;
    packageName: string;
    packageType: string;
    expiryDate: string;
    credits?: Array<{
      serviceId: string;
      remainingCredits: number;
      lockedPrice: number;
    }>;
    remainingValue?: number;
  }>;
  precedence: string;
}

export class RedemptionService {
  /**
   * Check available benefits for a customer's services
   * Returns membership discounts and package credits that can be applied
   */
  async checkBenefits(tenantId: string, data: CheckBenefitsBody): Promise<CheckBenefitsResult> {
    const { customerId, branchId, services } = data;

    // Get config for precedence rules
    const config = await prisma.membershipConfig.findUnique({
      where: { tenantId },
    });
    const precedence = config?.membershipPackagePrecedence || 'package_first';

    // Get customer's active memberships
    const memberships = await prisma.customerMembership.findMany({
      where: {
        tenantId,
        customerId,
        status: 'active',
        currentExpiryDate: { gte: new Date() },
      },
      include: {
        plan: {
          include: {
            benefits: { where: { isActive: true }, orderBy: { priorityLevel: 'desc' } },
            branches: true,
          },
        },
      },
    });

    // Filter memberships available at this branch
    const branchMemberships = memberships.filter((m) => {
      if (m.plan.branchScope === 'all_branches') return true;
      return m.plan.branches.some((b) => b.branchId === branchId);
    });

    // Get customer's active packages
    const packages = await prisma.customerPackage.findMany({
      where: {
        tenantId,
        customerId,
        status: 'active',
        expiryDate: { gte: new Date() },
      },
      include: {
        package: {
          include: {
            branches: true,
            services: true,
          },
        },
        credits: true,
      },
    });

    // Filter packages available at this branch
    const branchPackages = packages.filter((p) => {
      if (p.package.branchScope === 'all_branches') return true;
      return p.package.branches.some((b) => b.branchId === branchId);
    });

    // Calculate benefits for each service
    const serviceBenefits: ServiceBenefit[] = [];

    for (const service of services) {
      const benefit = await this.calculateServiceBenefits(
        service,
        branchMemberships,
        branchPackages,
        precedence
      );
      serviceBenefits.push(benefit);
    }

    return serializeDecimals({
      customerId,
      branchId,
      services: serviceBenefits,
      activeMemberships: branchMemberships.map((m) => ({
        id: m.id,
        membershipNumber: m.membershipNumber,
        planName: m.plan.name,
        tier: m.plan.tier,
        expiryDate: format(m.currentExpiryDate, 'yyyy-MM-dd'),
      })),
      activePackages: branchPackages.map((p) => ({
        id: p.id,
        packageNumber: p.packageNumber,
        packageName: p.package.name,
        packageType: p.package.packageType,
        expiryDate: format(p.expiryDate, 'yyyy-MM-dd'),
        credits:
          p.package.packageType !== 'value_package'
            ? p.credits.map((c) => ({
                serviceId: c.serviceId,
                remainingCredits: c.remainingCredits,
                lockedPrice: Number(c.lockedPrice),
              }))
            : undefined,
        remainingValue:
          p.package.packageType === 'value_package' ? Number(p.remainingCreditValue) : undefined,
      })),
      precedence,
    }) as CheckBenefitsResult;
  }

  /**
   * Calculate benefits for a single service
   */
  private async calculateServiceBenefits(
    service: CheckBenefitsService,
    memberships: any[],
    packages: any[],
    _precedence: string
  ): Promise<ServiceBenefit> {
    const benefit: ServiceBenefit = {
      serviceId: service.serviceId,
      originalPrice: service.originalPrice,
    };

    // Check package credits first (package_first precedence)
    for (const pkg of packages) {
      if (pkg.package.packageType === 'value_package') {
        // Value package - can be used for any service
        if (Number(pkg.remainingCreditValue) > 0) {
          benefit.valuePackageId = pkg.id;
          benefit.valuePackageName = pkg.package.name;
          benefit.remainingValue = Number(pkg.remainingCreditValue);
        }
      } else {
        // Service package - check if service is included
        const credit = pkg.credits.find(
          (c: any) => c.serviceId === service.serviceId && c.remainingCredits > 0
        );
        if (credit) {
          benefit.packageId = pkg.id;
          benefit.packageName = pkg.package.name;
          benefit.packageType = pkg.package.packageType;
          benefit.packageCreditsAvailable = credit.remainingCredits;
          benefit.packageLockedPrice = Number(credit.lockedPrice);
          benefit.packageCreditId = credit.id;
          break; // Use first available package
        }
      }
    }

    // Check membership benefits
    for (const membership of memberships) {
      const applicableBenefit = this.findApplicableBenefit(
        membership.plan.benefits,
        service.serviceId
      );

      if (applicableBenefit) {
        const discountAmount = this.calculateMembershipDiscount(
          applicableBenefit,
          service.originalPrice
        );

        benefit.membershipId = membership.id;
        benefit.membershipName = membership.plan.name;
        benefit.membershipBenefitType = applicableBenefit.benefitType;
        benefit.membershipDiscountAmount = discountAmount;
        benefit.membershipFinalPrice = service.originalPrice - discountAmount;

        if (applicableBenefit.benefitType === 'complimentary_service') {
          benefit.isComplimentary = true;
          benefit.complimentaryBenefitId = applicableBenefit.id;
        }
        break; // Use first applicable membership
      }
    }

    return benefit;
  }

  /**
   * Find applicable benefit for a service
   */
  private findApplicableBenefit(benefits: any[], serviceId: string): any | null {
    // Priority order: service-specific > category > flat discount
    for (const benefit of benefits) {
      if (benefit.benefitType === 'service_discount' && benefit.serviceId === serviceId) {
        return benefit;
      }
      if (benefit.benefitType === 'complimentary_service' && benefit.serviceId === serviceId) {
        return benefit;
      }
    }

    // Check flat discount (applies to all services)
    for (const benefit of benefits) {
      if (benefit.benefitType === 'flat_discount') {
        return benefit;
      }
    }

    return null;
  }

  /**
   * Calculate membership discount amount
   */
  private calculateMembershipDiscount(benefit: any, originalPrice: number): number {
    if (benefit.benefitType === 'complimentary_service') {
      return originalPrice; // 100% discount
    }

    if (!benefit.discountType || !benefit.discountValue) {
      return 0;
    }

    if (benefit.discountType === 'percentage') {
      return originalPrice * (Number(benefit.discountValue) / 100);
    }

    // Flat discount
    return Math.min(Number(benefit.discountValue), originalPrice);
  }

  /**
   * Apply membership discount and record usage
   */
  async applyMembershipDiscount(
    tenantId: string,
    data: ApplyMembershipDiscountBody,
    createdBy?: string
  ) {
    // Validate membership is active
    const membership = await prisma.customerMembership.findFirst({
      where: {
        id: data.membershipId,
        tenantId,
        status: 'active',
        currentExpiryDate: { gte: new Date() },
      },
    });

    if (!membership) {
      throw new NotFoundError('MEMBERSHIP_NOT_FOUND', 'Active membership not found');
    }

    // Get branch from invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, tenantId },
      select: { branchId: true },
    });

    if (!invoice) {
      throw new NotFoundError('INVOICE_NOT_FOUND', 'Invoice not found');
    }

    // Record usage
    const usage = await prisma.membershipUsage.create({
      data: {
        tenantId,
        membershipId: data.membershipId,
        usageDate: new Date(),
        usageBranchId: invoice.branchId,
        invoiceId: data.invoiceId,
        invoiceItemId: data.invoiceItemId,
        serviceId: data.serviceId,
        serviceName: data.serviceName,
        benefitType: data.benefitType,
        originalAmount: data.originalAmount,
        discountAmount: data.discountAmount,
        finalAmount: data.originalAmount - data.discountAmount,
        isComplimentary: data.isComplimentary,
        complimentaryBenefitId: data.complimentaryBenefitId,
        createdBy,
      },
    });

    // Update membership stats
    await prisma.customerMembership.update({
      where: { id: data.membershipId },
      data: {
        totalVisits: { increment: 1 },
        totalDiscountAvailed: { increment: data.discountAmount },
        lastVisitDate: new Date(),
        lastVisitBranchId: invoice.branchId,
      },
    });

    return serializeDecimals(usage);
  }

  /**
   * Redeem package credits
   */
  async redeemPackageCredits(tenantId: string, data: RedeemPackageCreditsBody, createdBy?: string) {
    // Validate customer package is active
    const customerPackage = await prisma.customerPackage.findFirst({
      where: {
        id: data.customerPackageId,
        tenantId,
        status: 'active',
        expiryDate: { gte: new Date() },
      },
      include: {
        package: true,
        credits: true,
      },
    });

    if (!customerPackage) {
      throw new NotFoundError('PACKAGE_NOT_FOUND', 'Active customer package not found');
    }

    // Get branch from invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, tenantId },
      select: { branchId: true },
    });

    if (!invoice) {
      throw new NotFoundError('INVOICE_NOT_FOUND', 'Invoice not found');
    }

    let redemption;
    let lockedPrice = 0;

    if (customerPackage.package.packageType === 'value_package') {
      // Value package redemption
      const valueToUse = data.valueToUse || 0;
      const remainingValue = Number(customerPackage.remainingCreditValue || 0);

      if (valueToUse > remainingValue) {
        throw new BadRequestError(
          'INSUFFICIENT_VALUE',
          `Insufficient package value. Available: ${remainingValue}, Requested: ${valueToUse}`
        );
      }

      // Create redemption record
      redemption = await prisma.packageRedemption.create({
        data: {
          tenantId,
          customerPackageId: data.customerPackageId,
          redemptionDate: new Date(),
          redemptionBranchId: invoice.branchId,
          invoiceId: data.invoiceId,
          invoiceItemId: data.invoiceItemId,
          serviceId: data.serviceId,
          serviceName: data.serviceName,
          valueUsed: valueToUse,
          lockedPrice: valueToUse,
          stylistId: data.stylistId,
          createdBy,
        },
      });

      // Update remaining value
      await prisma.customerPackage.update({
        where: { id: data.customerPackageId },
        data: {
          remainingCreditValue: { decrement: valueToUse },
          totalRedemptions: { increment: 1 },
          totalRedeemedValue: { increment: valueToUse },
          lastRedemptionDate: new Date(),
          lastRedemptionBranchId: invoice.branchId,
        },
      });

      lockedPrice = valueToUse;
    } else {
      // Service package redemption
      const creditsToUse = data.creditsToUse || 1;

      // Find the credit for this service
      const credit = customerPackage.credits.find((c) => c.serviceId === data.serviceId);

      if (!credit) {
        throw new BadRequestError(
          'SERVICE_NOT_IN_PACKAGE',
          'This service is not included in the package'
        );
      }

      if (credit.remainingCredits < creditsToUse) {
        throw new BadRequestError(
          'INSUFFICIENT_CREDITS',
          `Insufficient credits. Available: ${credit.remainingCredits}, Requested: ${creditsToUse}`
        );
      }

      lockedPrice = Number(credit.lockedPrice);

      // Create redemption record
      redemption = await prisma.packageRedemption.create({
        data: {
          tenantId,
          customerPackageId: data.customerPackageId,
          packageCreditId: credit.id,
          redemptionDate: new Date(),
          redemptionBranchId: invoice.branchId,
          invoiceId: data.invoiceId,
          invoiceItemId: data.invoiceItemId,
          serviceId: data.serviceId,
          serviceName: data.serviceName,
          creditsUsed: creditsToUse,
          lockedPrice,
          stylistId: data.stylistId,
          createdBy,
        },
      });

      // Update credit balance
      await prisma.packageCredit.update({
        where: { id: credit.id },
        data: {
          remainingCredits: { decrement: creditsToUse },
        },
      });

      // Update package stats
      const totalValue = lockedPrice * creditsToUse;
      await prisma.customerPackage.update({
        where: { id: data.customerPackageId },
        data: {
          totalRedemptions: { increment: 1 },
          totalRedeemedValue: { increment: totalValue },
          lastRedemptionDate: new Date(),
          lastRedemptionBranchId: invoice.branchId,
        },
      });

      // Check if package is exhausted
      const updatedCredits = await prisma.packageCredit.findMany({
        where: { customerPackageId: data.customerPackageId },
      });
      const allExhausted = updatedCredits.every((c) => c.remainingCredits === 0);

      if (allExhausted) {
        await prisma.customerPackage.update({
          where: { id: data.customerPackageId },
          data: { status: 'exhausted' },
        });
      }
    }

    return serializeDecimals({
      redemption,
      lockedPrice,
    });
  }

  /**
   * Get customer's available benefits summary
   */
  async getCustomerBenefitsSummary(tenantId: string, customerId: string, branchId: string) {
    // Get active memberships
    const memberships = await prisma.customerMembership.findMany({
      where: {
        tenantId,
        customerId,
        status: 'active',
        currentExpiryDate: { gte: new Date() },
      },
      include: {
        plan: {
          include: {
            benefits: { where: { isActive: true } },
            branches: true,
          },
        },
      },
    });

    // Filter by branch
    const branchMemberships = memberships.filter((m) => {
      if (m.plan.branchScope === 'all_branches') return true;
      return m.plan.branches.some((b) => b.branchId === branchId);
    });

    // Get active packages
    const packages = await prisma.customerPackage.findMany({
      where: {
        tenantId,
        customerId,
        status: 'active',
        expiryDate: { gte: new Date() },
      },
      include: {
        package: {
          include: { branches: true },
        },
        credits: true,
      },
    });

    // Filter by branch
    const branchPackages = packages.filter((p) => {
      if (p.package.branchScope === 'all_branches') return true;
      return p.package.branches.some((b) => b.branchId === branchId);
    });

    return serializeDecimals({
      memberships: branchMemberships.map((m) => ({
        id: m.id,
        membershipNumber: m.membershipNumber,
        planName: m.plan.name,
        tier: m.plan.tier,
        expiryDate: format(m.currentExpiryDate, 'yyyy-MM-dd'),
        benefitsCount: m.plan.benefits.length,
        totalDiscountAvailed: m.totalDiscountAvailed,
      })),
      packages: branchPackages.map((p) => ({
        id: p.id,
        packageNumber: p.packageNumber,
        packageName: p.package.name,
        packageType: p.package.packageType,
        expiryDate: format(p.expiryDate, 'yyyy-MM-dd'),
        remainingValue:
          p.package.packageType === 'value_package' ? Number(p.remainingCreditValue) : undefined,
        credits:
          p.package.packageType !== 'value_package'
            ? p.credits.map((c) => ({
                serviceId: c.serviceId,
                remaining: c.remainingCredits,
                initial: c.initialCredits,
              }))
            : undefined,
      })),
      hasBenefits: branchMemberships.length > 0 || branchPackages.length > 0,
    });
  }
}

export const redemptionService = new RedemptionService();
