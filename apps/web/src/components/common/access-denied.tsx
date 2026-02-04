/**
 * AccessDenied Component
 * Displayed when user doesn't have permission to view content
 */

'use client';

import { ShieldX } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface AccessDeniedProps {
  /** Custom title for the access denied message */
  title?: string;
  /** Custom description */
  description?: string;
  /** Whether to show the back to dashboard button */
  showBackButton?: boolean;
}

/**
 * Access denied component for unauthorized access attempts
 *
 * Usage:
 * ```tsx
 * <PermissionGuard permission={PERMISSIONS.SERVICES_WRITE} fallback={<AccessDenied />}>
 *   <ServiceEditor />
 * </PermissionGuard>
 * ```
 */
export function AccessDenied({
  title = 'Access Denied',
  description = "You don't have permission to view this content. Please contact your administrator if you believe this is an error.",
  showBackButton = true,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-6">
        <ShieldX className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {showBackButton && (
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      )}
    </div>
  );
}
