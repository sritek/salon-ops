/**
 * Tags Service Unit Tests
 */

import { describe, it, expect } from 'vitest';

// System tags constant for testing
const SYSTEM_TAGS = ['New', 'Regular', 'VIP', 'Inactive'];

describe('System Tags', () => {
  it('should have correct system tags defined', () => {
    expect(SYSTEM_TAGS).toContain('New');
    expect(SYSTEM_TAGS).toContain('Regular');
    expect(SYSTEM_TAGS).toContain('VIP');
    expect(SYSTEM_TAGS).toContain('Inactive');
    expect(SYSTEM_TAGS).toHaveLength(4);
  });

  it('should identify system tags correctly', () => {
    const isSystemTag = (tag: string) => SYSTEM_TAGS.includes(tag);

    expect(isSystemTag('New')).toBe(true);
    expect(isSystemTag('Regular')).toBe(true);
    expect(isSystemTag('VIP')).toBe(true);
    expect(isSystemTag('Inactive')).toBe(true);
    expect(isSystemTag('Premium')).toBe(false);
    expect(isSystemTag('Corporate')).toBe(false);
  });
});

describe('Auto-tagging Logic', () => {
  /**
   * Simulates the auto-tagging logic without database
   */
  function calculateAutoTags(
    currentTags: string[],
    visitCount: number,
    daysSinceLastVisit: number | null
  ): string[] {
    const tags = new Set(currentTags);

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
    if (daysSinceLastVisit !== null && daysSinceLastVisit > 90) {
      tags.add('Inactive');
    }

    return Array.from(tags);
  }

  it('should add "New" tag for customers with 0 visits', () => {
    const tags = calculateAutoTags([], 0, null);
    expect(tags).toContain('New');
    expect(tags).not.toContain('Regular');
    expect(tags).not.toContain('Inactive');
  });

  it('should not add "New" tag for customers with visits', () => {
    const tags = calculateAutoTags([], 1, 10);
    expect(tags).not.toContain('New');
  });

  it('should add "Regular" tag for customers with 5+ visits', () => {
    const tags = calculateAutoTags([], 5, 10);
    expect(tags).toContain('Regular');
    expect(tags).not.toContain('New');
  });

  it('should add "Regular" tag for customers with more than 5 visits', () => {
    const tags = calculateAutoTags([], 10, 5);
    expect(tags).toContain('Regular');
  });

  it('should not add "Regular" tag for customers with less than 5 visits', () => {
    const tags = calculateAutoTags([], 4, 10);
    expect(tags).not.toContain('Regular');
  });

  it('should add "Inactive" tag for customers inactive for 90+ days', () => {
    const tags = calculateAutoTags([], 3, 91);
    expect(tags).toContain('Inactive');
  });

  it('should not add "Inactive" tag for recently active customers', () => {
    const tags = calculateAutoTags([], 3, 30);
    expect(tags).not.toContain('Inactive');
  });

  it('should preserve VIP tag when updating auto-tags', () => {
    const tags = calculateAutoTags(['VIP'], 5, 10);
    expect(tags).toContain('VIP');
    expect(tags).toContain('Regular');
  });

  it('should preserve custom tags when updating auto-tags', () => {
    const tags = calculateAutoTags(['Premium', 'Corporate'], 5, 10);
    expect(tags).toContain('Premium');
    expect(tags).toContain('Corporate');
    expect(tags).toContain('Regular');
  });

  it('should handle edge case of exactly 90 days inactive', () => {
    const tags = calculateAutoTags([], 3, 90);
    expect(tags).not.toContain('Inactive');
  });

  it('should handle Regular + Inactive combination', () => {
    const tags = calculateAutoTags([], 10, 100);
    expect(tags).toContain('Regular');
    expect(tags).toContain('Inactive');
  });
});

describe('Tag Merging', () => {
  it('should merge tags without duplicates', () => {
    const existingTags = ['New', 'Premium'];
    const newTags = ['VIP', 'Premium'];
    const merged = [...new Set([...existingTags, ...newTags])];

    expect(merged).toHaveLength(3);
    expect(merged).toContain('New');
    expect(merged).toContain('Premium');
    expect(merged).toContain('VIP');
  });

  it('should handle empty existing tags', () => {
    const existingTags: string[] = [];
    const newTags = ['VIP', 'Premium'];
    const merged = [...new Set([...existingTags, ...newTags])];

    expect(merged).toHaveLength(2);
    expect(merged).toContain('VIP');
    expect(merged).toContain('Premium');
  });

  it('should handle empty new tags', () => {
    const existingTags = ['New', 'Premium'];
    const newTags: string[] = [];
    const merged = [...new Set([...existingTags, ...newTags])];

    expect(merged).toHaveLength(2);
    expect(merged).toContain('New');
    expect(merged).toContain('Premium');
  });
});
