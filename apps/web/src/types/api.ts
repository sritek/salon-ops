/**
 * Common API Response Types
 * Matches backend response structure
 */

// ============================================
// Base Response Types
// ============================================

/**
 * Standard API success response wrapper
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Paginated API response with meta information
 */
export interface PaginatedApiResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

// ============================================
// Helper Types
// ============================================

/**
 * Extract data type from API response
 */
export type ExtractData<T> = T extends ApiResponse<infer D> ? D : never;

/**
 * Paginated result with data and meta
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
