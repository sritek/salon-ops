/**
 * Response Utilities
 * Helper functions for creating consistent API responses
 */

import { serializeDecimals } from './prisma';
import type {
  PaginationMeta,
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
} from './types';

/**
 * Create a standard success response with automatic decimal serialization
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data: serializeDecimals(data),
  };
}

/**
 * Create a standard paginated response with automatic decimal serialization
 */
export function paginatedResponse<T>(data: T[], meta: PaginationMeta): ApiPaginatedResponse<T> {
  return {
    success: true,
    data: serializeDecimals(data),
    meta,
  };
}

/**
 * Create a standard delete response
 */
export function deleteResponse(
  message = 'Deleted successfully'
): ApiSuccessResponse<{ message: string }> {
  return {
    success: true,
    data: { message },
  };
}

/**
 * Create a standard error response
 */
export function errorResponse(code: string, message: string, details?: unknown): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}

/**
 * Helper to build pagination meta from service result
 */
export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
