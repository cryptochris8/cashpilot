import Stripe from "stripe";

export function mapStripeStatus(
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

export function getSubscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
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
