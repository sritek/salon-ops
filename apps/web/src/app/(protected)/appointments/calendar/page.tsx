'use client';

/**
 * Calendar Page Redirect
 * Redirects to /appointments?view=calendar
 * The main appointments page now handles both calendar and list views.
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CalendarRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve any existing query params
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'calendar');
    router.replace(`/appointments?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}
