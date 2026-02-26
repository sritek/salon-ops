/**
 * Feature Flags Configuration
 *
 * Controls which modules are enabled in the frontend.
 * For Phase 1 pilot, inventory and memberships are disabled.
 */

// Module feature flags (read from environment variables)
export const isInventoryEnabled = process.env.NEXT_PUBLIC_ENABLE_INVENTORY === 'true';
export const isMembershipsEnabled = process.env.NEXT_PUBLIC_ENABLE_MEMBERSHIPS === 'true';
export const isReportsEnabled = process.env.NEXT_PUBLIC_ENABLE_REPORTS === 'true';
export const isMarketingEnabled = process.env.NEXT_PUBLIC_ENABLE_MARKETING === 'true';

// Re-export real-time flag for consistency (also defined in real-time-store.ts)
export const isRealTimeEnabled = process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true';

// Feature flags object for easy access
export const features = {
  inventory: isInventoryEnabled,
  memberships: isMembershipsEnabled,
  realTime: isRealTimeEnabled,
  reports: isReportsEnabled,
  marketing: isMarketingEnabled,
} as const;

export type FeatureFlags = keyof typeof features;

// Helper to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature];
}
