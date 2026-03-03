import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe/client";

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

  try {
    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    const url = await createCheckoutSession(org.id, priceId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Billing error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
