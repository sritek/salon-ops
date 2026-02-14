'use client';

import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { useAuthStore } from '@/stores/auth-store';

import { StaffForm } from '../components/staff-form';

export default function NewStaffPage() {
  const t = useTranslations('staff.form');
  const { user } = useAuthStore();

  // Get the current branch ID from the user's primary branch
  const branchId = user?.branchIds?.[0] || '';

  return (
    <PermissionGuard permission={PERMISSIONS.USERS_WRITE} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader title={t('addTitle')} description={t('addDescription')} />
        <PageContent>
          <div className="max-w-3xl">
            <StaffForm branchId={branchId} />
          </div>
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
