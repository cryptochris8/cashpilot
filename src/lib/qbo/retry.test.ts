import { describe, it, expect, vi, beforeEach } from "vitest";
import { withRetry } from "./retry";
import { QBOApiError, QBOAuthError, QBORateLimitError } from "./errors";

beforeEach(() => {
  vi.restoreAllMocks();
  // Suppress retry log output in tests
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { baseDelay: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable QBOApiError and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        new QBOApiError("Server Error", { statusCode: 500, retryable: true })
      )
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, { baseDelay: 1, maxRetries: 3 });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws immediately on non-retryable QBOAuthError", async () => {
    const authError = new QBOAuthError("Token expired", { retryable: false });
    const fn = vi.fn().mockRejectedValue(authError);

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toThrow("Token expired");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting retries", async () => {
    const error = new QBOApiError("Server Error", { statusCode: 500, retryable: true });
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { baseDelay: 1, maxRetries: 2 })).rejects.toThrow(
      "Server Error"
    );
    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects QBORateLimitError.retryAfterMs delay", async () => {
    const rateLimitError = new QBORateLimitError("Too many requests", {
      retryAfterMs: 50,
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValue("ok");

    const start = Date.now();
    const result = await withRetry(fn, { baseDelay: 1, maxRetries: 2 });
    const elapsed = Date.now() - start;

    expect(result).toBe("ok");
    // Should have waited at least 50ms (the retryAfterMs)
    expect(elapsed).toBeGreaterThanOrEqual(40); // small tolerance
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on plain Error", async () => {
    const plainError = new Error("Something broke");
    const fn = vi.fn().mockRejectedValue(plainError);

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toThrow("Something broke");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
