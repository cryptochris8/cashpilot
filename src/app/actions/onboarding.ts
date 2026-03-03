"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      qboConnection: true,
      invoices: { select: { id: true, balance: true, status: true } },
      cadences: { where: { isActive: true }, select: { id: true } },
    },
  });
}

export interface OnboardingStatus {
  qboConnected: boolean;
  invoicesSynced: boolean;
  invoiceCount: number;
  totalOutstanding: number;
  cadenceConfigured: boolean;
  testReminderSent: boolean;
  onboardingComplete: boolean;
}

export async function getOnboardingStatus(): Promise<
  { data: OnboardingStatus } | { error: string }
> {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const qboConnected = !!org.qboConnection;
  const invoiceCount = org.invoices.length;
  const openInvoices = org.invoices.filter(
    (i: { status: string; balance: unknown }) => i.status === "OPEN" || i.status === "OVERDUE"
  );
  const totalOutstanding = openInvoices.reduce(
    (sum, i) => sum + Number(i.balance),
    0
  );
  const cadenceConfigured = org.cadences.length > 0;

  // Check if a test reminder was sent (look for any reminder log)
  const reminderCount = await prisma.reminderLog.count({
    where: { invoice: { organizationId: org.id } },
  });

  return {
    data: {
      qboConnected,
      invoicesSynced: invoiceCount > 0,
      invoiceCount,
      totalOutstanding,
      cadenceConfigured,
      testReminderSent: reminderCount > 0,
      onboardingComplete: org.onboardingDone,
    },
  };
}

export async function completeOnboardingStep(step: string) {
  const { orgId } = await auth();
  if (!orgId) return { error: "Unauthorized" };

  // Steps are tracked implicitly via the org state
  // This action is mainly to acknowledge a step was visited
  return { data: { step, completed: true } };
}

export async function markOnboardingComplete() {
  const { orgId } = await auth();
  if (!orgId) return { error: "Unauthorized" };

  await prisma.organization.update({
    where: { clerkOrgId: orgId },
    data: { onboardingDone: true },
  });

  return { data: { success: true } };
}
