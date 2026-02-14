'use client';

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DataTable, EmptyState } from '@/components/common';

import { getAppointmentColumns } from './appointment-columns';

import type { Appointment } from '@/types/appointments';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface AppointmentTableProps {
  data: Appointment[];
  meta?: PaginationMeta;
  isLoading: boolean;
  canWrite: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onCheckIn: (id: string) => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onNoShow: (id: string) => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function AppointmentTable({
  data,
  meta,
  isLoading,
  canWrite,
  page,
  onPageChange,
  onPageSizeChange,
  onCheckIn,
  onStart,
  onComplete,
  onCancel,
  onNoShow,
  hasFilters,
}: AppointmentTableProps) {
  const t = useTranslations('appointments.list');

  const columns = useMemo(
    () =>
      getAppointmentColumns({
        canWrite,
        onCheckIn,
        onStart,
        onComplete,
        onCancel,
        onNoShow,
      }),
    [canWrite, onCheckIn, onStart, onComplete, onCancel, onNoShow]
  );

  const emptyState = (
    <EmptyState
      icon={Calendar}
      title={t('noAppointments')}
      description={hasFilters ? t('noAppointmentsFiltered') : t('noAppointmentsEmpty')}
    />
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      loadingRows={5}
      emptyState={emptyState}
      pagination={
        meta
          ? {
              page,
              limit: meta.limit,
              total: meta.total,
              totalPages: meta.totalPages,
            }
          : undefined
      }
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}
