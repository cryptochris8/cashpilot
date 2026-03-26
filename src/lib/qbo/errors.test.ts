import { describe, it, expect } from "vitest";
import {
  isRetryableError,
  QBORateLimitError,
  QBOApiError,
  QBOSyncError,
  QBOAuthError,
} from "./errors";

describe("isRetryableError", () => {
  it("returns true for QBORateLimitError", () => {
    const error = new QBORateLimitError("Rate limit exceeded");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for QBORateLimitError with custom retryAfterMs", () => {
    const error = new QBORateLimitError("Rate limit exceeded", { retryAfterMs: 5000 });
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for QBOApiError with retryable: true", () => {
    const error = new QBOApiError("Service unavailable", {
      statusCode: 503,
      retryable: true,
    });
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for QBOApiError with retryable: false", () => {
    const error = new QBOApiError("Bad request", {
      statusCode: 400,
      retryable: false,
    });
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for QBOApiError when retryable defaults to false", () => {
    const error = new QBOApiError("Not found", { statusCode: 404 });
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns true for QBOSyncError with retryable: true", () => {
    const error = new QBOSyncError("Sync failed", { retryable: true });
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for QBOSyncError with retryable: false", () => {
    const error = new QBOSyncError("Sync failed", { retryable: false });
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for QBOSyncError when retryable defaults to false", () => {
    const error = new QBOSyncError("Sync failed");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for QBOAuthError", () => {
    const error = new QBOAuthError("Unauthorized");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for QBOAuthError even when retryable: true is set", () => {
    // QBOAuthError is explicitly excluded by the type guard implementation.
    const error = new QBOAuthError("Unauthorized", { retryable: true });
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for a plain Error", () => {
    const error = new Error("Something went wrong");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for a non-Error value (string)", () => {
    expect(isRetryableError("error string")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRetryableError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isRetryableError(undefined)).toBe(false);
  });
});
