// ──────────────────────────────────────────
// VowGrid — Typed Application Errors
// ──────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message: string, code = 'PAYMENT_REQUIRED', details?: unknown) {
    super(message, 402, code, details);
  }
}

export class BillingConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 503, 'BILLING_PROVIDER_NOT_CONFIGURED', details);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(
      `Invalid state transition from "${from}" to "${to}"`,
      422,
      'INVALID_STATE_TRANSITION',
      { from, to },
    );
  }
}
