import { describe, it, expect, vi, beforeEach } from "vitest";

const REQUIRED_SERVER_VARS: Record<string, string> = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_123",
  CLERK_WEBHOOK_SECRET: "whsec_123",
  STRIPE_SECRET_KEY: "sk_test_stripe",
  STRIPE_WEBHOOK_SECRET: "whsec_stripe",
  STRIPE_PRICE_STARTER: "price_starter",
  STRIPE_PRICE_GROWTH: "price_growth",
  RESEND_API_KEY: "re_123",
  RESEND_WEBHOOK_SECRET: "whsec_resend",
  QBO_CLIENT_ID: "qbo_client",
  QBO_CLIENT_SECRET: "qbo_secret",
  QBO_REDIRECT_URI: "http://localhost:3000/api/qbo/callback",
  QBO_ENVIRONMENT: "sandbox",
  QBO_TOKEN_ENCRYPTION_KEY: "abc123def456",
};

const REQUIRED_CLIENT_VARS: Record<string, string> = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
};

const ALL_REQUIRED_VARS = { ...REQUIRED_SERVER_VARS, ...REQUIRED_CLIENT_VARS };

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("env validation", () => {
  it("throws when required server vars are missing", async () => {
    // Set only client vars, missing all server vars
    for (const [key, val] of Object.entries(REQUIRED_CLIENT_VARS)) {
      vi.stubEnv(key, val);
    }

    await expect(import("./env")).rejects.toThrow(
      "Environment variable validation failed"
    );
  });

  it("succeeds with all required vars present", async () => {
    for (const [key, val] of Object.entries(ALL_REQUIRED_VARS)) {
      vi.stubEnv(key, val);
    }

    const mod = await import("./env");
    expect(mod.serverEnv.DATABASE_URL).toBe(ALL_REQUIRED_VARS.DATABASE_URL);
    expect(mod.clientEnv.NEXT_PUBLIC_APP_URL).toBe(ALL_REQUIRED_VARS.NEXT_PUBLIC_APP_URL);
  });

  it("optional vars can be omitted", async () => {
    for (const [key, val] of Object.entries(ALL_REQUIRED_VARS)) {
      vi.stubEnv(key, val);
    }
    // Don't set INNGEST_EVENT_KEY, SENTRY_AUTH_TOKEN, etc.

    const mod = await import("./env");
    expect(mod.serverEnv).toBeDefined();
  });

  it("skips validation when SKIP_ENV_VALIDATION=1", async () => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "1");
    // No other vars set — should NOT throw

    const mod = await import("./env");
    expect(mod.serverEnv).toBeDefined();
    expect(mod.clientEnv).toBeDefined();
  });
});
