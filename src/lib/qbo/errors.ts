/**
 * QBO Error classes for structured error handling.
 */

export class QBOAuthError extends Error {
  readonly code = "QBO_AUTH_ERROR";
  readonly retryable: boolean;
  readonly originalError?: unknown;

  constructor(message: string, options?: { retryable?: boolean; originalError?: unknown }) {
    super(message);
    this.name = "QBOAuthError";
    this.retryable = options?.retryable ?? false;
    this.originalError = options?.originalError;
  }
}

export class QBORateLimitError extends Error {
  readonly code = "QBO_RATE_LIMIT";
  readonly retryable = true;
  readonly retryAfterMs: number;
  readonly originalError?: unknown;

  constructor(message: string, options?: { retryAfterMs?: number; originalError?: unknown }) {
    super(message);
    this.name = "QBORateLimitError";
    this.retryAfterMs = options?.retryAfterMs ?? 60_000;
    this.originalError = options?.originalError;
  }
}

export class QBOApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly statusCode: number;
  readonly originalError?: unknown;

  constructor(
    message: string,
    options: { code?: string; retryable?: boolean; statusCode: number; originalError?: unknown }
  ) {
    super(message);
    this.name = "QBOApiError";
    this.code = options.code ?? "QBO_API_ERROR";
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode;
    this.originalError = options.originalError;
  }
}

export class QBOSyncError extends Error {
  readonly code = "QBO_SYNC_ERROR";
  readonly retryable: boolean;
  readonly originalError?: unknown;

  constructor(message: string, options?: { retryable?: boolean; originalError?: unknown }) {
    super(message);
    this.name = "QBOSyncError";
    this.retryable = options?.retryable ?? false;
    this.originalError = options?.originalError;
  }
}

/**
 * Type guard to check if an error is retryable.
 */
export function isRetryableError(
  error: unknown
): error is QBORateLimitError | QBOApiError | QBOSyncError {
  if (error instanceof QBORateLimitError) return true;
  if (error instanceof QBOApiError) return error.retryable;
  if (error instanceof QBOSyncError) return error.retryable;
  return false;
}
