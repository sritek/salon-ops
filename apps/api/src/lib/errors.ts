/**
 * Custom Error Classes
 * HTTP errors for consistent API responses
 */

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST') {
    super(400, message, code);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(401, message, code);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(403, message, code);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found', code = 'NOT_FOUND') {
    super(404, message, code);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(409, message, code);
  }
}

export class ValidationError extends HttpError {
  constructor(
    message = 'Validation Error',
    public details?: Array<{ field: string; message: string }>
  ) {
    super(422, message, 'VALIDATION_ERROR');
  }
}

export class InternalServerError extends HttpError {
  constructor(message = 'Internal Server Error', code = 'INTERNAL_ERROR') {
    super(500, message, code);
  }
}

/**
 * Application Error - for business logic errors with custom codes
 */
export class AppError extends HttpError {
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number = 400,
    code: string = 'APP_ERROR',
    details?: unknown
  ) {
    super(statusCode, message, code);
    this.details = details;
  }
}
