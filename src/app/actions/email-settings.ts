"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  });
}

export interface EmailSettingsData {
  senderName: string;
  replyToEmail: string;
  emailFooter: string;
}

export async function getEmailSettings(): Promise<
  { data: EmailSettingsData } | { error: string }
> {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const settings = await prisma.emailSettings.findUnique({
    where: { organizationId: org.id },
  });

  return {
    data: {
      senderName: settings?.senderName ?? org.name,
      replyToEmail: settings?.replyToEmail ?? "",
      emailFooter: settings?.emailFooter ?? "",
    },
  };
}

export async function updateEmailSettings(data: EmailSettingsData) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  // Validate email if provided
  if (data.replyToEmail && !data.replyToEmail.includes("@")) {
    return { error: "Invalid email address" };
  }

  await prisma.emailSettings.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      senderName: data.senderName || null,
      replyToEmail: data.replyToEmail || null,
      emailFooter: data.emailFooter || null,
    },
    update: {
      senderName: data.senderName || null,
      replyToEmail: data.replyToEmail || null,
      emailFooter: data.emailFooter || null,
    },
  });

  return { success: true };
}
