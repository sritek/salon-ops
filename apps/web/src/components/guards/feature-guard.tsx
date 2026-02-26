'use client';

/**
 * Feature Guard Component
 *
 * Protects routes that require specific feature flags to be enabled.
 * Redirects to 404 if the feature is disabled.
 */

import { notFound } from 'next/navigation';
import { features, type FeatureFlags } from '@/config/features';

interface FeatureGuardProps {
  feature: FeatureFlags;
  children: React.ReactNode;
}

export function FeatureGuard({ feature, children }: FeatureGuardProps) {
  const isEnabled = features[feature];

  if (!isEnabled) {
    notFound();
  }

  return <>{children}</>;
}
