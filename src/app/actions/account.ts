"use server";

import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/db";
import { cancelSubscription } from "@/lib/stripe/client";
import { decryptToken } from "@/lib/qbo/token-manager";

const QBO_REVOKE_URL =
  "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: { qboConnection: true, subscription: true },
  });
}

export async function deleteAccountAction(): Promise<{
  success?: boolean;
  error?: string;
}> {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  // 1. Revoke QBO token (fail silently)
  if (org.qboConnection) {
    try {
      const refreshToken = decryptToken(org.qboConnection.refreshToken);
      const clientId = process.env.QBO_CLIENT_ID;
      const clientSecret = process.env.QBO_CLIENT_SECRET;

      if (clientId && clientSecret) {
        const credentials = Buffer.from(
          clientId + ":" + clientSecret
        ).toString("base64");

        await fetch(QBO_REVOKE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + credentials,
            Accept: "application/json",
          },
          body: JSON.stringify({ token: refreshToken }),
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error("Failed to revoke QBO token during account deletion:", error);
    }
  }

  // 2. Cancel Stripe subscription (fail silently)
  await cancelSubscription(org.id);

  // 3. Delete the organization (cascades to all child records)
  try {
    await prisma.organization.delete({
      where: { id: org.id },
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error("Failed to delete organization:", error);
    return { error: "Failed to delete account. Please try again." };
  }

  return { success: true };
}
