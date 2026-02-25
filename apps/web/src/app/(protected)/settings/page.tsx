'use client';

/**
 * Settings Page
 * Redirects to appropriate default tab based on user role
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  useEffect(() => {
    // Redirect based on role
    if (role === 'super_owner') {
      router.replace('/settings/profile');
    } else if (role === 'regional_manager') {
      router.replace('/settings/branches');
    } else {
      // All other roles go to account settings
      router.replace('/settings/account');
    }
  }, [role, router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
