/**
 * Membership Config Service
 * Business logic for tenant-level membership configuration
 * Requirements: 7.1
 */

import { prisma, serializeDecimals } from '../../lib/prisma';
import type { UpdateMembershipConfigBody } from './membership-config.schema';

// Default configuration values
const DEFAULT_CONFIG = {
  membershipsEnabled: true,
  packagesEnabled: true,
  defaultValidityUnit: 'months',
  defaultValidityValue: 12,
  refundPolicy: 'partial',
  cancellationFeePercentage: 10,
  defaultBranchScope: 'all_branches',
  membershipPackagePrecedence: 'package_first',
  gracePeriodDays: 7,
  maxFreezeDaysPerYear: 30,
  expiryReminderDays: 7,
  lowBalanceThreshold: 2,
};

export class MembershipConfigService {
  /**
   * Get membership configuration for a tenant
   * Returns defaults if no config exists
   */
  async get(tenantId: string) {
    const config = await prisma.membershipConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      // Return defaults with tenant ID
      return serializeDecimals({
        tenantId,
        ...DEFAULT_CONFIG,
        createdAt: null,
        updatedAt: null,
      });
    }

    return serializeDecimals(config);
  }

  /**
   * Update membership configuration for a tenant
   * Creates config if it doesn't exist (upsert)
   */
  async update(tenantId: string, data: UpdateMembershipConfigBody) {
    const config = await prisma.membershipConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...DEFAULT_CONFIG,
        ...data,
      },
      update: data,
    });

    return serializeDecimals(config);
  }

  /**
   * Reset configuration to defaults
   */
  async reset(tenantId: string) {
    const config = await prisma.membershipConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...DEFAULT_CONFIG,
      },
      update: DEFAULT_CONFIG,
    });

    return serializeDecimals(config);
  }
}

export const membershipConfigService = new MembershipConfigService();
