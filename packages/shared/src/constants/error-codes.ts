/**
 * Error Codes
 * Based on: .cursor/rules/00-architecture.mdc lines 441-469
 */

export const ErrorCode = {
  // Authentication (1xxx)
  INVALID_CREDENTIALS: 1001,
  TOKEN_EXPIRED: 1002,
  UNAUTHORIZED: 1003,
  FORBIDDEN: 1004,
  REFRESH_TOKEN_EXPIRED: 1005,
  INVALID_TOKEN: 1006,

  // Validation (2xxx)
  VALIDATION_ERROR: 2001,
  INVALID_INPUT: 2002,
  MISSING_REQUIRED_FIELD: 2003,
  INVALID_FORMAT: 2004,

  // Business Logic (3xxx)
  SLOT_NOT_AVAILABLE: 3001,
  INSUFFICIENT_BALANCE: 3002,
  BOOKING_LIMIT_EXCEEDED: 3003,
  CUSTOMER_BLOCKED: 3004,
  SERVICE_NOT_AVAILABLE: 3005,
  MEMBERSHIP_EXPIRED: 3006,
  PACKAGE_EXHAUSTED: 3007,
  APPOINTMENT_CONFLICT: 3008,
  STYLIST_NOT_AVAILABLE: 3009,
  BRANCH_CLOSED: 3010,

  // Resource (4xxx)
  NOT_FOUND: 4001,
  ALREADY_EXISTS: 4002,
  CONFLICT: 4003,
  RESOURCE_LOCKED: 4004,
  RESOURCE_DELETED: 4005,

  // System (5xxx)
  INTERNAL_ERROR: 5001,
  DATABASE_ERROR: 5002,
  EXTERNAL_SERVICE_ERROR: 5003,
  RATE_LIMIT_EXCEEDED: 5004,
  SERVICE_UNAVAILABLE: 5005,
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Error messages for each error code
 */
export const ErrorMessages: Record<ErrorCodeType, string> = {
  // Authentication
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please login again.',
  [ErrorCode.UNAUTHORIZED]: 'You must be logged in to access this resource',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to access this resource',
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: 'Your session has expired. Please login again.',
  [ErrorCode.INVALID_TOKEN]: 'Invalid authentication token',

  // Validation
  [ErrorCode.VALIDATION_ERROR]: 'Invalid input data',
  [ErrorCode.INVALID_INPUT]: 'The provided input is invalid',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ErrorCode.INVALID_FORMAT]: 'Invalid data format',

  // Business Logic
  [ErrorCode.SLOT_NOT_AVAILABLE]: 'The selected time slot is not available',
  [ErrorCode.INSUFFICIENT_BALANCE]: 'Insufficient balance to complete this transaction',
  [ErrorCode.BOOKING_LIMIT_EXCEEDED]: 'Booking limit exceeded for this customer',
  [ErrorCode.CUSTOMER_BLOCKED]: 'This customer has been blocked from booking',
  [ErrorCode.SERVICE_NOT_AVAILABLE]: 'This service is not available at the selected branch',
  [ErrorCode.MEMBERSHIP_EXPIRED]: 'The membership has expired',
  [ErrorCode.PACKAGE_EXHAUSTED]: 'All sessions in this package have been used',
  [ErrorCode.APPOINTMENT_CONFLICT]: 'There is a scheduling conflict with another appointment',
  [ErrorCode.STYLIST_NOT_AVAILABLE]: 'The selected stylist is not available at this time',
  [ErrorCode.BRANCH_CLOSED]: 'The branch is closed at the selected time',

  // Resource
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found',
  [ErrorCode.ALREADY_EXISTS]: 'A resource with this identifier already exists',
  [ErrorCode.CONFLICT]: 'The operation conflicts with the current state',
  [ErrorCode.RESOURCE_LOCKED]: 'The resource is currently locked',
  [ErrorCode.RESOURCE_DELETED]: 'The resource has been deleted',

  // System
  [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred',
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service error occurred',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable',
};

/**
 * Get error message for a given error code
 */
export function getErrorMessage(code: ErrorCodeType): string {
  return ErrorMessages[code] || 'An unknown error occurred';
}
