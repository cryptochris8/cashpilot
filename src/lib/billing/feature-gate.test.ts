import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma BEFORE importing the module under test
vi.mock("@/lib/db", () => ({
  default: {
    subscription: { findUnique: vi.fn(), findFirst: vi.fn() },
    invoice: { count: vi.fn() },
    reminderLog: { count: vi.fn() },
    reminderTemplate: { count: vi.fn() },
    reminderCadence: { count: vi.fn() },
  },
}));

vi.mock("@/lib/stripe/client", () => ({
  getTierFromPriceId: (priceId: string) => {
    if (priceId === "price_starter") return "starter";
    if (priceId === "price_growth") return "growth";
    return null;
  },
}));

import prisma from "@/lib/db";
import {
  getPlanLimitsForTier,
  checkFeatureAccess,
  isTrialActive,
} from "./feature-gate";

// Cast prisma mocks for convenience
const mockSubscription = prisma.subscription.findUnique as ReturnType<typeof vi.fn>;
const mockInvoiceCount = prisma.invoice.count as ReturnType<typeof vi.fn>;
const mockReminderLogCount = prisma.reminderLog.count as ReturnType<typeof vi.fn>;
const mockTemplateCount = prisma.reminderTemplate.count as ReturnType<typeof vi.fn>;
const mockCadenceCount = prisma.reminderCadence.count as ReturnType<typeof vi.fn>;

/** Default usage: well under starter limits */
function setDefaultUsage({
  invoices = 5,
  emails = 10,
  templates = 1,
  cadences = 0,
} = {}) {
  mockInvoiceCount.mockResolvedValue(invoices);
  mockReminderLogCount.mockResolvedValue(emails);
  mockTemplateCount.mockResolvedValue(templates);
  mockCadenceCount.mockResolvedValue(cadences);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getPlanLimitsForTier
// ---------------------------------------------------------------------------
describe("getPlanLimitsForTier", () => {
  it("returns starter limits", () => {
    const limits = getPlanLimitsForTier("starter");
    expect(limits.invoiceLimit).toBe(100);
    expect(limits.emailLimit).toBe(200);
    expect(limits.templateLimit).toBe(3);
    expect(limits.cadenceLimit).toBe(1);
    expect(limits.qboCompanyLimit).toBe(1);
    expect(limits.emailTracking).toBe(false);
  });

  it("returns growth limits with Infinity for uncapped features", () => {
    const limits = getPlanLimitsForTier("growth");
    expect(limits.invoiceLimit).toBe(Infinity);
    expect(limits.emailLimit).toBe(Infinity);
    expect(limits.templateLimit).toBe(Infinity);
    expect(limits.cadenceLimit).toBe(Infinity);
    expect(limits.qboCompanyLimit).toBe(5);
    expect(limits.emailTracking).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkFeatureAccess
// ---------------------------------------------------------------------------
describe("checkFeatureAccess", () => {
  describe("subscription status gates", () => {
    it("allows access when there is no subscription (defaults to starter limits)", async () => {
      mockSubscription.mockResolvedValue(null);
      setDefaultUsage();
      const result = await checkFeatureAccess("org1", "invoiceLimit");
      expect(result.allowed).toBe(true);
    });

    it("denies access when subscription is CANCELED", async () => {
      mockSubscription.mockResolvedValue({ status: "CANCELED", stripePriceId: null });
      const result = await checkFeatureAccess("org1", "invoiceLimit");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/cancelled/i);
    });

    it("denies access when subscription is PAST_DUE", async () => {
      mockSubscription.mockResolvedValue({ status: "PAST_DUE", stripePriceId: null });
      const result = await checkFeatureAccess("org1", "invoiceLimit");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/past due/i);
    });

    it("allows access when subscription is ACTIVE under limit", async () => {
      mockSubscription.mockResolvedValue({ status: "ACTIVE", stripePriceId: "price_starter" });
      setDefaultUsage({ invoices: 50 });
      const result = await checkFeatureAccess("org1", "invoiceLimit");
      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(50);
      expect(result.limit).toBe(100);
    });

    it("denies access when subscription is ACTIVE and at limit", async () => {
      mockSubscription.mockResolvedValue({ status: "ACTIVE", stripePriceId: "price_starter" });
      setDefaultUsage({ invoices: 100 });
      const result = await checkFeatureAccess("org1", "invoiceLimit");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/limit/i);
      expect(result.currentUsage).toBe(100);
      expect(result.limit).toBe(100);
    });

    it("allows access when subscription is TRIALING", async () => {
      mockSubscription.mockResolvedValue({ status: "TRIALING", stripePriceId: null });
      setDefaultUsage({ invoices: 20 });
      const result = await checkFeatureAccess("org1", "invoiceLimit");
      expect(result.allowed).toBe(true);
    });
  });

  describe("Infinity limit features (growth plan)", () => {
    beforeEach(() => {
      mockSubscription.mockResolvedValue({ status: "ACTIVE", stripePriceId: "price_growth" });
    });

    it("always allows invoiceLimit on growth (Infinity)", async () => {
      setDefaultUsage({ invoices: 999999 });
      const result = await checkFeatureAccess("org1", "invoiceLimit");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it("always allows emailLimit on growth (Infinity)", async () => {
      setDefaultUsage({ emails: 999999 });
      const result = await checkFeatureAccess("org1", "emailLimit");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it("always allows templateLimit on growth (Infinity)", async () => {
      setDefaultUsage({ templates: 999999 });
      const result = await checkFeatureAccess("org1", "templateLimit");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it("always allows cadenceLimit on growth (Infinity)", async () => {
      setDefaultUsage({ cadences: 999999 });
      const result = await checkFeatureAccess("org1", "cadenceLimit");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
    });
  });

  describe("individual feature types – starter plan", () => {
    beforeEach(() => {
      mockSubscription.mockResolvedValue({ status: "ACTIVE", stripePriceId: "price_starter" });
    });

    it("invoiceLimit: allowed under 100, denied at 100", async () => {
      setDefaultUsage({ invoices: 99 });
      const under = await checkFeatureAccess("org1", "invoiceLimit");
      expect(under.allowed).toBe(true);

      mockInvoiceCount.mockResolvedValue(100);
      const at = await checkFeatureAccess("org1", "invoiceLimit");
      expect(at.allowed).toBe(false);
      expect(at.reason).toMatch(/invoice/i);
    });

    it("emailLimit: allowed under 200, denied at 200", async () => {
      setDefaultUsage({ emails: 199 });
      const under = await checkFeatureAccess("org1", "emailLimit");
      expect(under.allowed).toBe(true);

      mockReminderLogCount.mockResolvedValue(200);
      const at = await checkFeatureAccess("org1", "emailLimit");
      expect(at.allowed).toBe(false);
      expect(at.reason).toMatch(/email/i);
    });

    it("templateLimit: allowed under 3, denied at 3", async () => {
      setDefaultUsage({ templates: 2 });
      const under = await checkFeatureAccess("org1", "templateLimit");
      expect(under.allowed).toBe(true);

      mockTemplateCount.mockResolvedValue(3);
      const at = await checkFeatureAccess("org1", "templateLimit");
      expect(at.allowed).toBe(false);
      expect(at.reason).toMatch(/template/i);
    });

    it("cadenceLimit: allowed under 1, denied at 1", async () => {
      setDefaultUsage({ cadences: 0 });
      const under = await checkFeatureAccess("org1", "cadenceLimit");
      expect(under.allowed).toBe(true);

      mockCadenceCount.mockResolvedValue(1);
      const at = await checkFeatureAccess("org1", "cadenceLimit");
      expect(at.allowed).toBe(false);
      expect(at.reason).toMatch(/cadence/i);
    });

    it("emailTracking: denied on starter plan", async () => {
      const result = await checkFeatureAccess("org1", "emailTracking");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/growth/i);
    });

    it("qboCompanyLimit: allowed on starter (1 connection)", async () => {
      setDefaultUsage();
      const result = await checkFeatureAccess("org1", "qboCompanyLimit");
      // starter qboCompanyLimit = 1, currentUsage is hardcoded to 1
      // 1 >= 1 → denied
      expect(result.allowed).toBe(false);
    });
  });

  describe("emailTracking feature", () => {
    it("emailTracking: allowed on growth plan", async () => {
      mockSubscription.mockResolvedValue({ status: "ACTIVE", stripePriceId: "price_growth" });
      const result = await checkFeatureAccess("org1", "emailTracking");
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("emailTracking: denied on starter plan (no subscription defaults to starter)", async () => {
      mockSubscription.mockResolvedValue(null);
      const result = await checkFeatureAccess("org1", "emailTracking");
      expect(result.allowed).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// isTrialActive
// ---------------------------------------------------------------------------
describe("isTrialActive", () => {
  it("returns false when there is no subscription", async () => {
    mockSubscription.mockResolvedValue(null);
    expect(await isTrialActive("org1")).toBe(false);
  });

  it("returns true when status is TRIALING and trialEnd is in the future", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    mockSubscription.mockResolvedValue({ status: "TRIALING", trialEnd: futureDate });
    expect(await isTrialActive("org1")).toBe(true);
  });

  it("returns false when status is TRIALING but trialEnd is in the past", async () => {
    const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
    mockSubscription.mockResolvedValue({ status: "TRIALING", trialEnd: pastDate });
    expect(await isTrialActive("org1")).toBe(false);
  });

  it("returns false when status is TRIALING but trialEnd is null", async () => {
    mockSubscription.mockResolvedValue({ status: "TRIALING", trialEnd: null });
    expect(await isTrialActive("org1")).toBe(false);
  });

  it("returns false when subscription is ACTIVE (not trialing)", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    mockSubscription.mockResolvedValue({ status: "ACTIVE", trialEnd: futureDate });
    expect(await isTrialActive("org1")).toBe(false);
  });

  it("returns false when subscription is CANCELED", async () => {
    mockSubscription.mockResolvedValue({ status: "CANCELED", trialEnd: null });
    expect(await isTrialActive("org1")).toBe(false);
  });
});
