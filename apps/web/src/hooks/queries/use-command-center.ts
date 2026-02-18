/**
 * Command Center Hook
 * Fetches Command Center dashboard data
 */

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { api } from '@/lib/api/client';
import type { CommandCenterData } from '@/types/dashboard';

interface UseCommandCenterOptions {
  branchId: string;
  date?: Date;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useCommandCenter({
  branchId,
  date,
  enabled = true,
  refetchInterval = 30000, // 30 seconds default
}: UseCommandCenterOptions) {
  const dateStr = date ? format(date, 'yyyy-MM-dd') : undefined;

  return useQuery({
    queryKey: ['command-center', branchId, dateStr],
    queryFn: () =>
      api.get<CommandCenterData>('/dashboard/command-center', {
        branchId,
        date: dateStr,
      }),
    enabled: enabled && !!branchId,
    refetchInterval,
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
