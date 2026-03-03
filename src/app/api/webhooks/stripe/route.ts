import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/db";

function getStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder");
}

function mapStripeStatus(
  status: string
): "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "UNPAID" {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "UNPAID";
  }
}

function getSubscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  // In Stripe v20+, current_period_end is on SubscriptionItem, not Subscription
  const item = sub.items?.data?.[0];
  if (item && "current_period_end" in item && typeof item.current_period_end === "number") {
    return new Date(item.current_period_end * 1000);
  }
  // Fallback to cancel_at if available
  if (sub.cancel_at) {
    return new Date(sub.cancel_at * 1000);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (orgId && customerId) {
        let stripePriceId: string | null = null;
        let trialEnd: Date | null = null;
        let currentPeriodEnd: Date | null = null;
        let status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "UNPAID" = "ACTIVE";

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          stripePriceId = sub.items.data[0]?.price?.id ?? null;
          trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
          currentPeriodEnd = getSubscriptionPeriodEnd(sub);
          status = mapStripeStatus(sub.status);
        }

        await prisma.subscription.upsert({
          where: { organizationId: orgId },
          create: {
            organizationId: orgId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? null,
            stripePriceId,
            status,
            trialEnd,
            currentPeriodEnd,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? null,
            stripePriceId,
            status,
            trialEnd,
            currentPeriodEnd,
          },
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await prisma.subscription.updateMany({
        where: { stripeCustomerId },
        data: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price?.id ?? null,
          status: mapStripeStatus(subscription.status),
          currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await prisma.subscription.updateMany({
        where: { stripeCustomerId },
        data: { status: "CANCELED" },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (stripeCustomerId) {
        await prisma.subscription.updateMany({
          where: { stripeCustomerId },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
