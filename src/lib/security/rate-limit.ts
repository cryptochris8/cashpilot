/**
 * Simple in-memory rate limiter for API routes.
 * Tracks request timestamps per key and enforces limits.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 300_000);

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request is allowed (only set when denied) */
  retryAfterSeconds?: number;
  /** Number of remaining requests in the current window */
  remaining: number;
}

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param key - Unique identifier (e.g., orgId + route)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      remaining: 0,
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
  };
}

/**
 * Pre-configured rate limits for CashPilot API routes.
 */
export const RATE_LIMITS = {
  /** QBO sync: 1 request per minute per org */
  qboSync: { maxRequests: 1, windowMs: 60_000 },
  /** Invoice remind: 5 requests per minute per org */
  invoiceRemind: { maxRequests: 5, windowMs: 60_000 },
  /** Billing: 10 requests per minute per org */
  billing: { maxRequests: 10, windowMs: 60_000 },
} as const;

/**
 * Build a rate limit key from org ID and route identifier.
 */
export function rateLimitKey(orgId: string, route: string): string {
  return `${route}:${orgId}`;
}
