/**
 * Tests for the Stripe webhook POST handler.
 *
 * Strategy:
 *  - Mock the `stripe` module so `new Stripe()` returns a controlled object.
 *  - Mock `@/lib/db` (Prisma) so no real DB calls are made.
 *  - Mock `@sentry/nextjs` to suppress error reporting.
 *  - Mock `@/lib/stripe/utils` to keep it isolated (pure-function tests live
 *    in utils.test.ts).
 *  - Construct real NextRequest objects so the handler reads body/headers
 *    exactly as it does in production.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoist mock references so they are available inside vi.mock factories
// ---------------------------------------------------------------------------
const {
  mockConstructEvent,
  mockSubscriptionsRetrieve,
  mockSubscriptionUpsert,
  mockSubscriptionUpdateMany,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockSubscriptionsRetrieve: vi.fn(),
  mockSubscriptionUpsert: vi.fn(),
  mockSubscriptionUpdateMany: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("stripe", () => {
  // Must use a real function (not arrow) so it is usable as `new Stripe()`
  function StripeClass() {
    return {
      webhooks: { constructEvent: mockConstructEvent },
      subscriptions: { retrieve: mockSubscriptionsRetrieve },
    };
  }
  return { default: StripeClass };
});

vi.mock("@/lib/db", () => ({
  default: {
    subscription: {
      upsert: mockSubscriptionUpsert,
      updateMany: mockSubscriptionUpdateMany,
    },
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// stripe/utils mock — tested separately in utils.test.ts
vi.mock("@/lib/stripe/utils", () => ({
  mapStripeStatus: vi.fn((s: string) => {
    const map: Record<string, string> = {
      active: "ACTIVE",
      trialing: "TRIALING",
      past_due: "PAST_DUE",
      canceled: "CANCELED",
    };
    return map[s] ?? "UNPAID";
  }),
  getSubscriptionPeriodEnd: vi.fn(() => new Date("2026-01-01T00:00:00.000Z")),
}));

// ---------------------------------------------------------------------------
// Import the handler AFTER mocks are hoisted
// ---------------------------------------------------------------------------
import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature !== undefined) {
    headers["stripe-signature"] = signature;
  }
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers,
    body,
  });
}

function makeStripeEvent(type: string, object: unknown): unknown {
  return { type, data: { object } };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_key";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

// ---------------------------------------------------------------------------
// Signature / header validation
// ---------------------------------------------------------------------------
describe("POST /api/webhooks/stripe — request validation", () => {
  it("returns 400 when the stripe-signature header is missing", async () => {
    const req = makeRequest(JSON.stringify({})); // no signature header
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing signature/i);
  });

  it("returns 400 when webhook signature verification fails", async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error("Signature mismatch");
    });

    const req = makeRequest(JSON.stringify({}), "bad_sig");
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid signature/i);
  });
});

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------
describe("checkout.session.completed", () => {
  const SESSION_WITH_SUB = {
    metadata: { orgId: "org_1" },
    customer: "cus_abc",
    subscription: "sub_xyz",
  };

  const MOCK_SUBSCRIPTION = {
    id: "sub_xyz",
    status: "active",
    trial_end: null,
    items: {
      data: [{ price: { id: "price_starter" }, current_period_end: 1700000000 }],
    },
  };

  it("upserts a subscription record when orgId and customerId are present", async () => {
    const event = makeStripeEvent("checkout.session.completed", SESSION_WITH_SUB);
    mockConstructEvent.mockReturnValueOnce(event);
    mockSubscriptionsRetrieve.mockResolvedValueOnce(MOCK_SUBSCRIPTION);
    mockSubscriptionUpsert.mockResolvedValueOnce({});

    const req = makeRequest(JSON.stringify(SESSION_WITH_SUB), "sig_ok");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);

    expect(mockSubscriptionUpsert).toHaveBeenCalledOnce();
    const [args] = mockSubscriptionUpsert.mock.calls;
    expect(args[0].where).toEqual({ organizationId: "org_1" });
    expect(args[0].create.stripeCustomerId).toBe("cus_abc");
    expect(args[0].create.stripeSubscriptionId).toBe("sub_xyz");
  });

  it("does not upsert when orgId is missing from session metadata", async () => {
    const sessionNoOrg = { ...SESSION_WITH_SUB, metadata: {} };
    const event = makeStripeEvent("checkout.session.completed", sessionNoOrg);
    mockConstructEvent.mockReturnValueOnce(event);

    const req = makeRequest(JSON.stringify(sessionNoOrg), "sig_ok");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("does not upsert when customerId is missing", async () => {
    const sessionNoCustomer = { ...SESSION_WITH_SUB, customer: null };
    const event = makeStripeEvent("checkout.session.completed", sessionNoCustomer);
    mockConstructEvent.mockReturnValueOnce(event);

    const req = makeRequest(JSON.stringify(sessionNoCustomer), "sig_ok");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("resolves customerId from an object customer field", async () => {
    const sessionObjectCustomer = {
      ...SESSION_WITH_SUB,
      customer: { id: "cus_from_object" },
    };
    const event = makeStripeEvent("checkout.session.completed", sessionObjectCustomer);
    mockConstructEvent.mockReturnValueOnce(event);
    mockSubscriptionsRetrieve.mockResolvedValueOnce(MOCK_SUBSCRIPTION);
    mockSubscriptionUpsert.mockResolvedValueOnce({});

    const req = makeRequest(JSON.stringify(sessionObjectCustomer), "sig_ok");
    await POST(req);

    expect(mockSubscriptionUpsert).toHaveBeenCalledOnce();
    const [[upsertArgs]] = mockSubscriptionUpsert.mock.calls;
    expect(upsertArgs.create.stripeCustomerId).toBe("cus_from_object");
  });

  it("skips subscription retrieval when no subscriptionId is present", async () => {
    const sessionNoSub = { ...SESSION_WITH_SUB, subscription: null };
    const event = makeStripeEvent("checkout.session.completed", sessionNoSub);
    mockConstructEvent.mockReturnValueOnce(event);
    mockSubscriptionUpsert.mockResolvedValueOnce({});

    const req = makeRequest(JSON.stringify(sessionNoSub), "sig_ok");
    await POST(req);

    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    expect(mockSubscriptionUpsert).toHaveBeenCalledOnce();
    const [[upsertArgs]] = mockSubscriptionUpsert.mock.calls;
    expect(upsertArgs.create.status).toBe("ACTIVE");
  });
});

// ---------------------------------------------------------------------------
// customer.subscription.created / updated
// ---------------------------------------------------------------------------
describe("customer.subscription.created / updated", () => {
  const BASE_SUBSCRIPTION = {
    id: "sub_abc",
    status: "active",
    customer: "cus_abc",
    trial_end: null,
    items: { data: [{ price: { id: "price_starter" } }] },
  };

  for (const eventType of [
    "customer.subscription.created",
    "customer.subscription.updated",
  ] as const) {
    it(`calls subscription.updateMany for ${eventType}`, async () => {
      const event = makeStripeEvent(eventType, BASE_SUBSCRIPTION);
      mockConstructEvent.mockReturnValueOnce(event);
      mockSubscriptionUpdateMany.mockResolvedValueOnce({ count: 1 });

      const req = makeRequest(JSON.stringify(BASE_SUBSCRIPTION), "sig_ok");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockSubscriptionUpdateMany).toHaveBeenCalledOnce();
      const [[updateArgs]] = mockSubscriptionUpdateMany.mock.calls;
      expect(updateArgs.where.stripeCustomerId).toBe("cus_abc");
      expect(updateArgs.data.stripeSubscriptionId).toBe("sub_abc");
      expect(updateArgs.data.stripePriceId).toBe("price_starter");
    });
  }

  it("resolves stripeCustomerId from object customer field", async () => {
    const subWithObjectCustomer = {
      ...BASE_SUBSCRIPTION,
      customer: { id: "cus_object_id" },
    };
    const event = makeStripeEvent("customer.subscription.updated", subWithObjectCustomer);
    mockConstructEvent.mockReturnValueOnce(event);
    mockSubscriptionUpdateMany.mockResolvedValueOnce({ count: 1 });

    const req = makeRequest(JSON.stringify(subWithObjectCustomer), "sig_ok");
    await POST(req);

    const [[updateArgs]] = mockSubscriptionUpdateMany.mock.calls;
    expect(updateArgs.where.stripeCustomerId).toBe("cus_object_id");
  });
});

// ---------------------------------------------------------------------------
// customer.subscription.deleted
// ---------------------------------------------------------------------------
describe("customer.subscription.deleted", () => {
  it("sets subscription status to CANCELED", async () => {
    const sub = {
      id: "sub_del",
      status: "canceled",
      customer: "cus_to_cancel",
      items: { data: [] },
      trial_end: null,
    };
    const event = makeStripeEvent("customer.subscription.deleted", sub);
    mockConstructEvent.mockReturnValueOnce(event);
    mockSubscriptionUpdateMany.mockResolvedValueOnce({ count: 1 });

    const req = makeRequest(JSON.stringify(sub), "sig_ok");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSubscriptionUpdateMany).toHaveBeenCalledOnce();
    const [[updateArgs]] = mockSubscriptionUpdateMany.mock.calls;
    expect(updateArgs.where.stripeCustomerId).toBe("cus_to_cancel");
    expect(updateArgs.data.status).toBe("CANCELED");
  });
});

// ---------------------------------------------------------------------------
// invoice.payment_failed
// ---------------------------------------------------------------------------
describe("invoice.payment_failed", () => {
  it("sets subscription status to PAST_DUE for the customer", async () => {
    const invoice = { customer: "cus_overdue" };
    const event = makeStripeEvent("invoice.payment_failed", invoice);
    mockConstructEvent.mockReturnValueOnce(event);
    mockSubscriptionUpdateMany.mockResolvedValueOnce({ count: 1 });

    const req = makeRequest(JSON.stringify(invoice), "sig_ok");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSubscriptionUpdateMany).toHaveBeenCalledOnce();
    const [[updateArgs]] = mockSubscriptionUpdateMany.mock.calls;
    expect(updateArgs.where.stripeCustomerId).toBe("cus_overdue");
    expect(updateArgs.data.status).toBe("PAST_DUE");
  });

  it("does not call updateMany when customer is null", async () => {
    const invoice = { customer: null };
    const event = makeStripeEvent("invoice.payment_failed", invoice);
    mockConstructEvent.mockReturnValueOnce(event);

    const req = makeRequest(JSON.stringify(invoice), "sig_ok");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSubscriptionUpdateMany).not.toHaveBeenCalled();
  });

  it("resolves stripeCustomerId from an object customer field", async () => {
    const invoice = { customer: { id: "cus_obj_id" } };
    const event = makeStripeEvent("invoice.payment_failed", invoice);
    mockConstructEvent.mockReturnValueOnce(event);
    mockSubscriptionUpdateMany.mockResolvedValueOnce({ count: 1 });

    const req = makeRequest(JSON.stringify(invoice), "sig_ok");
    await POST(req);

    const [[updateArgs]] = mockSubscriptionUpdateMany.mock.calls;
    expect(updateArgs.where.stripeCustomerId).toBe("cus_obj_id");
  });
});

// ---------------------------------------------------------------------------
// Unknown event type
// ---------------------------------------------------------------------------
describe("unknown event types", () => {
  it("returns 200 received:true without calling any DB methods", async () => {
    const event = makeStripeEvent("some.unknown.event", {});
    mockConstructEvent.mockReturnValueOnce(event);

    const req = makeRequest("{}", "sig_ok");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
    expect(mockSubscriptionUpdateMany).not.toHaveBeenCalled();
  });
});
