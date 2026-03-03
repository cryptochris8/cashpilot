import prisma from "@/lib/db";
import { getTierFromPriceId, type PlanTier } from "@/lib/stripe/client";

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

export type FeatureName =
  | "invoiceLimit"
  | "emailLimit"
  | "templateLimit"
  | "cadenceLimit"
  | "qboCompanyLimit"
  | "emailTracking";

interface PlanLimits {
  invoiceLimit: number;
  emailLimit: number;
  templateLimit: number;
  cadenceLimit: number;
  qboCompanyLimit: number;
  emailTracking: boolean;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: {
    invoiceLimit: 100,
    emailLimit: 200,
    templateLimit: 3,
    cadenceLimit: 1,
    qboCompanyLimit: 1,
    emailTracking: false,
  },
  growth: {
    invoiceLimit: Infinity,
    emailLimit: Infinity,
    templateLimit: Infinity,
    cadenceLimit: Infinity,
    qboCompanyLimit: 5,
    emailTracking: true,
  },
};

function getPlanTier(stripePriceId: string | null): PlanTier {
  if (!stripePriceId) return "starter";
  return getTierFromPriceId(stripePriceId) || "starter";
}

export async function isTrialActive(orgId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });

  if (!subscription) return false;
  if (subscription.status !== "TRIALING") return false;
  if (!subscription.trialEnd) return false;

  return new Date() < new Date(subscription.trialEnd);
}

export async function getUsage(orgId: string): Promise<{
  invoiceCount: number;
  emailsSentThisMonth: number;
  templateCount: number;
  cadenceCount: number;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [invoiceCount, emailsSentThisMonth, templateCount, cadenceCount] =
    await Promise.all([
      prisma.invoice.count({ where: { organizationId: orgId } }),
      prisma.reminderLog.count({
        where: {
          invoice: { organizationId: orgId },
          sentAt: { gte: startOfMonth },
          deliveryStatus: { not: "FAILED" },
        },
      }),
      prisma.reminderTemplate.count({ where: { organizationId: orgId } }),
      prisma.reminderCadence.count({ where: { organizationId: orgId } }),
    ]);

  return { invoiceCount, emailsSentThisMonth, templateCount, cadenceCount };
}

export async function checkFeatureAccess(
  orgId: string,
  feature: FeatureName
): Promise<FeatureAccessResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });

  // If no subscription or trial is active, allow with starter limits
  const isActive =
    subscription &&
    (subscription.status === "ACTIVE" ||
      subscription.status === "TRIALING");

  if (!isActive && subscription?.status === "CANCELED") {
    return { allowed: false, reason: "Your subscription has been cancelled. Please resubscribe to access this feature." };
  }

  if (!isActive && subscription?.status === "PAST_DUE") {
    return { allowed: false, reason: "Your subscription payment is past due. Please update your payment method." };
  }

  const tier = getPlanTier(subscription?.stripePriceId ?? null);
  const limits = PLAN_LIMITS[tier];

  // For boolean features
  if (feature === "emailTracking") {
    return {
      allowed: limits.emailTracking,
      reason: limits.emailTracking ? undefined : "Email tracking is available on the Growth plan.",
    };
  }

  // For numeric limits
  const usage = await getUsage(orgId);

  let currentUsage = 0;
  let limit = 0;

  switch (feature) {
    case "invoiceLimit":
      currentUsage = usage.invoiceCount;
      limit = limits.invoiceLimit;
      break;
    case "emailLimit":
      currentUsage = usage.emailsSentThisMonth;
      limit = limits.emailLimit;
      break;
    case "templateLimit":
      currentUsage = usage.templateCount;
      limit = limits.templateLimit;
      break;
    case "cadenceLimit":
      currentUsage = usage.cadenceCount;
      limit = limits.cadenceLimit;
      break;
    case "qboCompanyLimit":
      currentUsage = 1; // Currently only one connection supported
      limit = limits.qboCompanyLimit;
      break;
  }

  if (limit === Infinity) {
    return { allowed: true, currentUsage, limit };
  }

  if (currentUsage >= limit) {
    return {
      allowed: false,
      reason: `You have reached your ${tier} plan limit of ${limit}. Upgrade to Growth for ${feature === "invoiceLimit" ? "unlimited invoices" : feature === "emailLimit" ? "unlimited emails" : feature === "templateLimit" ? "unlimited templates" : feature === "cadenceLimit" ? "unlimited cadences" : "more companies"}.`,
      currentUsage,
      limit,
    };
  }

  return { allowed: true, currentUsage, limit };
}

export function getPlanLimitsForTier(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier];
}
