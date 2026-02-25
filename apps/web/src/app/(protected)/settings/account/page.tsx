'use client';

/**
 * Account Settings Page
 * Change password and account security settings
 */

import { KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from './components/change-password-form';

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure. You will be logged out after changing
            your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <ChangePasswordForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
