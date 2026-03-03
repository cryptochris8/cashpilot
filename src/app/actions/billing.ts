"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import {
  createCheckoutSession as stripeCheckout,
  createPortalSession as stripePortal,
  getSubscription as stripeGetSub,
  PRICE_IDS,
  getTierFromPriceId,
} from "@/lib/stripe/client";
import { getUsage } from "@/lib/billing/feature-gate";

async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: { subscription: true },
  });
}

export async function createCheckoutSessionAction(priceId: string) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  try {
    const url = await stripeCheckout(org.id, priceId);
    return { url };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function createPortalSessionAction() {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  try {
    const url = await stripePortal(org.id);
    return { url };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function getSubscriptionStatus() {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const subscription = await stripeGetSub(org.id);
  const usage = await getUsage(org.id);

  let trialDaysRemaining: number | null = null;
  if (subscription?.trialEnd) {
    const now = new Date();
    const trialEnd = new Date(subscription.trialEnd);
    const diffMs = trialEnd.getTime() - now.getTime();
    trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    data: {
      subscription,
      usage,
      trialDaysRemaining,
      priceIds: PRICE_IDS,
    },
  };
}
