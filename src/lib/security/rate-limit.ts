/**
 * Rate limiter with Upstash Redis backend for production (serverless-compatible)
 * and in-memory fallback for local development.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

// --- Upstash Redis backend (production) ---

let redis: Redis | null = null;
const upstashLimiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redis) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redis;
  }
  return null;
}

function getUpstashLimiter(config: RateLimitConfig): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const key = `${config.maxRequests}:${config.windowMs}`;
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    const windowSec = Math.ceil(config.windowMs / 1000);
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSec} s`),
      prefix: "cashpilot:rl",
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

// --- In-memory fallback (local dev) ---

interface InMemoryEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, InMemoryEntry>();

function checkInMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key) ?? { timestamps: [] };

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
  memoryStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
  };
}

// --- Public API ---

/**
 * Check if a request is allowed under the rate limit.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured,
 * falls back to in-memory for local development.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(config);

  if (upstash) {
    try {
      const result = await upstash.limit(key);
      if (!result.success) {
        const retryAfterMs = result.reset - Date.now();
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
          remaining: 0,
        };
      }
      return {
        allowed: true,
        remaining: result.remaining,
      };
    } catch {
      // If Redis fails, fall through to in-memory so we don't block requests
      return checkInMemory(key, config);
    }
  }

  return checkInMemory(key, config);
}

/**
 * Synchronous in-memory-only rate limit check.
 * Use this only in contexts where async is not possible.
 * NOTE: This does NOT use Redis and will not work across serverless instances.
 */
export function checkRateLimitSync(key: string, config: RateLimitConfig): RateLimitResult {
  return checkInMemory(key, config);
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
  /** Bulk email sends: 3 requests per minute per org */
  bulk: { maxRequests: 3, windowMs: 60_000 },
  /** CSV + JSON exports: 5 requests per minute per org */
  export: { maxRequests: 5, windowMs: 60_000 },
  /** Template preview (sends test email): 10 requests per minute per org */
  templatePreview: { maxRequests: 10, windowMs: 60_000 },
} as const;

/**
 * Build a rate limit key from org ID and route identifier.
 */
export function rateLimitKey(orgId: string, route: string): string {
  return `${route}:${orgId}`;
}
