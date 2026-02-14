'use client';

import { useTranslations } from 'next-intl';

import { StatusBadge } from '@/components/common';

import type { AppointmentStatus } from '@/types/appointments';

// ============================================
// Component
// ============================================

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  const t = useTranslations('appointments.status');

  return <StatusBadge status={status} label={t(status)} className={className} />;
}
