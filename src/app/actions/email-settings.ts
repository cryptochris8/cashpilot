"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { z } from "zod/v4";

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
  const schema = z.object({
    senderName: z.string().max(200),
    replyToEmail: z.union([z.string().email(), z.literal("")]),
    emailFooter: z.string().max(10000),
  });
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

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
