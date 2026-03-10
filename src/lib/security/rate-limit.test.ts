import { describe, it, expect } from "vitest";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "./rate-limit";

describe("rateLimitKey", () => {
  it("builds key in route:orgId format", () => {
    expect(rateLimitKey("org_123", "qboSync")).toBe("qboSync:org_123");
  });
});

describe("checkRateLimit", () => {
  // Use a unique key per test to avoid shared state
  let keyCounter = 0;
  function uniqueKey() {
    return `test-key-${Date.now()}-${keyCounter++}`;
  }

  it("allows the first request and decrements remaining", () => {
    const key = uniqueKey();
    const result = checkRateLimit(key, { maxRequests: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows requests up to the limit", () => {
    const key = uniqueKey();
    const config = { maxRequests: 3, windowMs: 60_000 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const third = checkRateLimit(key, config);

    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("denies when limit exceeded and returns retryAfterSeconds", () => {
    const key = uniqueKey();
    const config = { maxRequests: 2, windowMs: 60_000 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const denied = checkRateLimit(key, config);

    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    expect(denied.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("does not set retryAfterSeconds when allowed", () => {
    const key = uniqueKey();
    const result = checkRateLimit(key, { maxRequests: 5, windowMs: 60_000 });
    expect(result.retryAfterSeconds).toBeUndefined();
  });
});

describe("RATE_LIMITS", () => {
  it("all presets have valid maxRequests and windowMs", () => {
    for (const [name, config] of Object.entries(RATE_LIMITS)) {
      expect(config.maxRequests, `${name}.maxRequests`).toBeGreaterThan(0);
      expect(config.windowMs, `${name}.windowMs`).toBeGreaterThan(0);
    }
  });
});
