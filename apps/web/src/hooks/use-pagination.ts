/**
 * usePagination - Hook for handling pagination state
 */

import { useCallback, useState } from 'react';

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, initialPageSize = 10 } = options;

  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setTotal = useCallback((total: number) => {
    setPagination((prev) => ({ ...prev, total }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination((prev) => {
      const maxPage = Math.ceil(prev.total / prev.pageSize);
      return prev.page < maxPage ? { ...prev, page: prev.page + 1 } : prev;
    });
  }, []);

  const prevPage = useCallback(() => {
    setPagination((prev) =>
      prev.page > 1 ? { ...prev, page: prev.page - 1 } : prev
    );
  }, []);

  const reset = useCallback(() => {
    setPagination({
      page: initialPage,
      pageSize: initialPageSize,
      total: 0,
    });
  }, [initialPage, initialPageSize]);

  // Derived values
  const totalPages = Math.ceil(pagination.total / pagination.pageSize) || 1;
  const hasNextPage = pagination.page < totalPages;
  const hasPrevPage = pagination.page > 1;
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = Math.min(startIndex + pagination.pageSize, pagination.total);

  return {
    ...pagination,
    totalPages,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
    setPage,
    setPageSize,
    setTotal,
    nextPage,
    prevPage,
    reset,
  };
}
