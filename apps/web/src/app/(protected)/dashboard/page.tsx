'use client';

/**
 * Dashboard Redirect
 * Redirects to /today - the consolidated Today view
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common';

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/today');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingSpinner size="lg" text="Redirecting..." />
    </div>
  );
}
