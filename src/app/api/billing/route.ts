import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/db";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe/client";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/security/rate-limit";
import { billingCheckoutSchema } from "@/lib/validations/api";

export async function GET() {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: { subscription: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // If subscription exists with a Stripe customer, create portal session
  if (org.subscription?.stripeCustomerId && org.subscription?.stripeSubscriptionId) {
    try {
      const url = await createPortalSession(org.id);
      return NextResponse.json({ portalUrl: url, subscription: org.subscription });
    } catch {
      return NextResponse.json({ subscription: org.subscription });
    }
  }

  return NextResponse.json({
    subscription: org.subscription ?? null,
  });
}

export async function POST(request: NextRequest) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const limit = checkRateLimit(rateLimitKey(org.id, "billing"), RATE_LIMITS.billing);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Retry in " + limit.retryAfterSeconds + "s." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const raw = await request.json();
    const parsed = billingCheckoutSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { priceId } = parsed.data;

    const url = await createCheckoutSession(org.id, priceId);
    return NextResponse.json({ url });
  } catch (err) {
    Sentry.captureException(err);
    console.error("Billing error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
