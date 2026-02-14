'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, User } from 'lucide-react';

import { PERMISSIONS } from '@salon-ops/shared';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  EmptyState,
} from '@/components/common';
import { useStaffDetail } from '@/hooks/queries/use-staff';
import { useAuthStore } from '@/stores/auth-store';

import { StaffForm } from '../../components/staff-form';

export default function EditStaffPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('staff.form');
  const tCommon = useTranslations('common');
  const { user } = useAuthStore();

  const staffId = params.id as string;
  const { data: staff, isLoading, error } = useStaffDetail(staffId);

  // Get the current branch ID from the user's primary branch
  const branchId = user?.branchIds?.[0] || '';

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !staff) {
    return (
      <PageContainer>
        <EmptyState
          icon={User}
          title="Staff not found"
          description="The staff member you're looking for doesn't exist."
          action={
            <Button onClick={() => router.push('/staff')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Staff
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PermissionGuard permission={PERMISSIONS.USERS_WRITE} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('editTitle')}
          description={`${t('editDescription')} - ${staff.user?.name}`}
          actions={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tCommon('actions.back')}
            </Button>
          }
        />
        <PageContent>
          <div className="max-w-3xl">
            <StaffForm staff={staff} branchId={branchId} />
          </div>
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
