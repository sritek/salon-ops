/**
 * Auth Guard Component
 * Shows loading state while checking authentication
 * Prevents flash of protected content for unauthenticated users
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { LoadingSpinner } from '@/components/common';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isReady, setIsReady] = useState(() => {
    // Initialize with hydration state if available (for client-side navigation)
    if (typeof window !== 'undefined') {
      return useAuthStore.persist.hasHydrated();
    }
    return false;
  });

  // Wait for hydration to complete
  useEffect(() => {
    // If already ready, nothing to do
    if (isReady) return;

    // Check if hydrated now
    if (useAuthStore.persist.hasHydrated()) {
      setIsReady(true);
      return;
    }

    // Subscribe to finish hydration event
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsReady(true);
    });

    // Fallback timeout in case hydration event doesn't fire
    const timeoutId = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [isReady]);

  // Redirect to login if not authenticated (after ready)
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
    }
  }, [isReady, isAuthenticated, pathname, router]);

  // Show loading while not ready
  if (!isReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Don't render children if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Redirecting to login..." />
      </div>
    );
  }

  return <>{children}</>;
}
