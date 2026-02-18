'use client';

/**
 * Command Center Redirect
 * Redirects to /today - the consolidated Today view
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CommandCenterRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/today');
  }, [router]);

  return null;
}
