/**
 * Tags Service
 * Business logic for customer tags management
 */

import { prisma } from '../../lib/prisma';

import type { CreateTagBody } from './customers.schema';

// System tags that cannot be deleted
const SYSTEM_TAGS = ['New', 'Regular', 'VIP', 'Inactive'];

export class TagsService {
  /**
   * Get all custom tags for a tenant
   */
  async getCustomTags(tenantId: string) {
    return prisma.customTag.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a custom tag
   */
  async createCustomTag(tenantId: string, data: CreateTagBody, createdBy?: string) {
    // Check if tag name conflicts with system tags
    if (SYSTEM_TAGS.includes(data.name)) {
      throw new Error('Cannot create tag with reserved system name');
    }

    // Check for duplicate
    const existing = await prisma.customTag.findFirst({
      where: { tenantId, name: data.name },
    });

    if (existing) {
      throw new Error('Tag with this name already exists');
    }

    return prisma.customTag.create({
      data: {
        tenantId,
        name: data.name,
        color: data.color,
        createdBy,
      },
    });
  }

  /**
   * Delete a custom tag
   */
  async deleteCustomTag(tenantId: string, tagId: string) {
    const tag = await prisma.customTag.findFirst({
      where: { id: tagId, tenantId },
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    // Remove tag from all customers
    const customersWithTag = await prisma.customer.findMany({
      where: {
        tenantId,
        tags: { has: tag.name },
      },
      select: { id: true, tags: true },
    });

    await prisma.$transaction([
      // Update all customers to remove this tag
      ...customersWithTag.map((customer) =>
        prisma.customer.update({
          where: { id: customer.id },
          data: {
            tags: customer.tags.filter((t) => t !== tag.name),
          },
        })
      ),
      // Delete the tag
      prisma.customTag.delete({ where: { id: tagId } }),
    ]);
  }

  /**
   * Add tags to a customer
   */
  async addTagsToCustomer(tenantId: string, customerId: string, tags: string[], addedBy?: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Validate custom tags exist (system tags are always valid)
    const customTags = tags.filter((t) => !SYSTEM_TAGS.includes(t));
    if (customTags.length > 0) {
      const existingTags = await prisma.customTag.findMany({
        where: { tenantId, name: { in: customTags } },
        select: { name: true },
      });
      const existingNames = existingTags.map((t) => t.name);
      const invalidTags = customTags.filter((t) => !existingNames.includes(t));
      if (invalidTags.length > 0) {
        throw new Error(`Invalid tags: ${invalidTags.join(', ')}`);
      }
    }

    // Merge tags (avoid duplicates)
    const newTags = [...new Set([...customer.tags, ...tags])];

    // Check if VIP tag is being added
    const isAddingVip = tags.includes('VIP') && !customer.tags.includes('VIP');

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: { tags: newTags },
    });

    // Audit log for VIP tag changes
    if (isAddingVip) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: addedBy,
          action: 'customer.vip_added',
          entityType: 'customer',
          entityId: customerId,
          oldValues: { tags: customer.tags },
          newValues: { tags: newTags },
        },
      });
    }

    return updatedCustomer;
  }

  /**
   * Remove a tag from a customer
   */
  async removeTagFromCustomer(
    tenantId: string,
    customerId: string,
    tag: string,
    removedBy?: string
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Don't allow removing auto-managed system tags (except VIP which is manual)
    if (['New', 'Regular', 'Inactive'].includes(tag)) {
      throw new Error('Cannot manually remove auto-managed system tags');
    }

    const newTags = customer.tags.filter((t) => t !== tag);

    // Check if VIP tag is being removed
    const isRemovingVip = tag === 'VIP' && customer.tags.includes('VIP');

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: { tags: newTags },
    });

    // Audit log for VIP tag removal
    if (isRemovingVip) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: removedBy,
          action: 'customer.vip_removed',
          entityType: 'customer',
          entityId: customerId,
          oldValues: { tags: customer.tags },
          newValues: { tags: newTags },
        },
      });
    }

    return updatedCustomer;
  }

  /**
   * Update auto-tags based on customer behavior
   * Called after appointments/visits
   */
  async updateAutoTags(tenantId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) return;

    // Get visit count
    const visitCount = await prisma.appointment.count({
      where: {
        customerId,
        status: 'completed',
        deletedAt: null,
      },
    });

    // Get last visit date
    const lastVisit = await prisma.appointment.findFirst({
      where: {
        customerId,
        status: 'completed',
        deletedAt: null,
      },
      orderBy: { scheduledDate: 'desc' },
      select: { scheduledDate: true },
    });

    const tags = new Set(customer.tags);

    // Remove auto-tags first
    tags.delete('New');
    tags.delete('Regular');
    tags.delete('Inactive');

    // Apply rules
    if (visitCount === 0) {
      tags.add('New');
    } else if (visitCount >= 5) {
      tags.add('Regular');
    }

    // Check for inactivity (90 days)
    if (lastVisit) {
      const daysSinceLastVisit = Math.floor(
        (Date.now() - lastVisit.scheduledDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastVisit > 90) {
        tags.add('Inactive');
      }
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: { tags: Array.from(tags) },
    });
  }
}

export const tagsService = new TagsService();
