import { isRetryableError, QBORateLimitError } from "./errors";

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 4,
  baseDelay: 1000,
};

/**
 * Execute a function with exponential backoff retry logic.
 * Only retries on retryable errors (429, 500, network errors).
 * Throws immediately on non-retryable errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const { maxRetries, baseDelay } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay: number;
      if (error instanceof QBORateLimitError) {
        // Use the rate limit's suggested retry time, but at least the base delay
        delay = Math.max(error.retryAfterMs, baseDelay * Math.pow(2, attempt));
      } else {
        delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
      }

      console.log(
        `[QBO Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
