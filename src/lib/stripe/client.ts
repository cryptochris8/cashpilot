import Stripe from "stripe";
import prisma from "@/lib/db";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripeInstance = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeInstance;
}

export const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  growth: process.env.STRIPE_PRICE_GROWTH!,
} as const;

export type PlanTier = "starter" | "growth";

export function getTierFromPriceId(priceId: string): PlanTier | null {
  if (priceId === PRICE_IDS.starter) return "starter";
  if (priceId === PRICE_IDS.growth) return "growth";
  return null;
}

export async function createCheckoutSession(
  orgId: string,
  priceId: string
): Promise<string> {
  const stripe = getStripe();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { subscription: true },
  });

  if (!org) throw new Error("Organization not found");

  let customerId = org.subscription?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { orgId: org.id, clerkOrgId: org.clerkOrgId },
    });
    customerId = customer.id;

    // Create or update subscription record with customer ID
    await prisma.subscription.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        stripeCustomerId: customerId,
        status: "TRIALING",
      },
      update: {
        stripeCustomerId: customerId,
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?billing=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?billing=cancelled`,
    metadata: { orgId: org.id },
  });

  return session.url || "";
}

export async function createPortalSession(orgId: string): Promise<string> {
  const stripe = getStripe();

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error("No Stripe customer found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings`,
  });

  return session.url;
}

export async function cancelSubscription(orgId: string): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });

    if (!subscription) return;

    const stripe = getStripe();

    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else if (subscription.stripeCustomerId) {
      await stripe.customers.del(subscription.stripeCustomerId);
    }
  } catch (error) {
    console.error("Failed to cancel Stripe subscription:", error);
  }
}

export async function getSubscription(orgId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });

  if (!subscription) return null;

  return {
    id: subscription.id,
    status: subscription.status,
    stripePriceId: subscription.stripePriceId,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEnd: subscription.trialEnd,
    plan: subscription.stripePriceId
      ? getTierFromPriceId(subscription.stripePriceId) || "starter"
      : null,
  };
}
