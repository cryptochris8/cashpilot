import { describe, it, expect, vi } from "vitest";

// Mock the modules that feature-gate imports at the top level
vi.mock("@/lib/db", () => ({
  default: {},
}));

vi.mock("@/lib/stripe/client", () => ({
  getTierFromPriceId: (priceId: string) => {
    if (priceId === "price_starter") return "starter";
    if (priceId === "price_growth") return "growth";
    return null;
  },
}));

import { getPlanLimitsForTier } from "./feature-gate";

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
