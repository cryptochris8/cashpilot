import { describe, it, expect } from "vitest";
import Stripe from "stripe";
import { mapStripeStatus, getSubscriptionPeriodEnd } from "./utils";

// ---------------------------------------------------------------------------
// mapStripeStatus
// ---------------------------------------------------------------------------
describe("mapStripeStatus", () => {
  it('maps "active" to ACTIVE', () => {
    expect(mapStripeStatus("active")).toBe("ACTIVE");
  });

  it('maps "trialing" to TRIALING', () => {
    expect(mapStripeStatus("trialing")).toBe("TRIALING");
  });

  it('maps "past_due" to PAST_DUE', () => {
    expect(mapStripeStatus("past_due")).toBe("PAST_DUE");
  });

  it('maps "canceled" to CANCELED', () => {
    expect(mapStripeStatus("canceled")).toBe("CANCELED");
  });

  it('maps "unpaid" to UNPAID (default)', () => {
    expect(mapStripeStatus("unpaid")).toBe("UNPAID");
  });

  it("maps an unknown status to UNPAID", () => {
    expect(mapStripeStatus("some_unknown_status")).toBe("UNPAID");
  });

  it("maps an empty string to UNPAID", () => {
    expect(mapStripeStatus("")).toBe("UNPAID");
  });
});

// ---------------------------------------------------------------------------
// getSubscriptionPeriodEnd
// ---------------------------------------------------------------------------
function makeSubscription(
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription {
  return {
    id: "sub_test",
    object: "subscription",
    items: { data: [] },
    cancel_at: null,
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("getSubscriptionPeriodEnd", () => {
  it("returns the period end from the first subscription item when present", () => {
    const epochSeconds = 1700000000;
    const sub = makeSubscription({
      items: {
        object: "list",
        data: [
          { current_period_end: epochSeconds } as unknown as Stripe.SubscriptionItem,
        ],
        has_more: false,
        url: "",
      },
    });

    const result = getSubscriptionPeriodEnd(sub);
    expect(result).toEqual(new Date(epochSeconds * 1000));
  });

  it("falls back to cancel_at when the item has no current_period_end", () => {
    const cancelAt = 1800000000;
    const sub = makeSubscription({
      items: { object: "list", data: [], has_more: false, url: "" },
      cancel_at: cancelAt,
    });

    const result = getSubscriptionPeriodEnd(sub);
    expect(result).toEqual(new Date(cancelAt * 1000));
  });

  it("returns null when there are no items and no cancel_at", () => {
    const sub = makeSubscription({
      items: { object: "list", data: [], has_more: false, url: "" },
      cancel_at: null,
    });

    expect(getSubscriptionPeriodEnd(sub)).toBeNull();
  });

  it("prefers item current_period_end over cancel_at", () => {
    const itemEpoch = 1700000000;
    const cancelAt = 1800000000;
    const sub = makeSubscription({
      items: {
        object: "list",
        data: [
          { current_period_end: itemEpoch } as unknown as Stripe.SubscriptionItem,
        ],
        has_more: false,
        url: "",
      },
      cancel_at: cancelAt,
    });

    const result = getSubscriptionPeriodEnd(sub);
    expect(result).toEqual(new Date(itemEpoch * 1000));
  });
});
