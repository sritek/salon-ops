/**
 * API Response Types
 * Based on: .cursor/rules/00-architecture.mdc lines 271-296
 */

/**
 * Standard API success response
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Error detail for validation errors
 */
export interface ErrorDetail {
  field: string;
  message: string;
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Generic query parameters for list endpoints
 */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}
