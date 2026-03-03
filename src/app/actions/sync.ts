"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { initialSync, incrementalSync } from "@/lib/qbo/sync";
import { decryptToken } from "@/lib/qbo/token-manager";

/**
 * Get the current organization from Clerk auth.
 */
async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: { qboConnection: true },
  });
}

/**
 * Trigger a manual sync for the current organization.
 */
export async function triggerSync() {
  const org = await getOrg();
  if (!org) return { error: "Organization not found" };
  if (!org.qboConnection) return { error: "QuickBooks is not connected" };
  if (org.qboConnection.syncStatus === "disconnected") {
    return { error: "QuickBooks connection is disconnected. Please reconnect." };
  }

  try {
    let result;
    if (!org.qboConnection.lastSyncAt) {
      result = await initialSync(org.id);
    } else {
      result = await incrementalSync(org.id);
    }
    return { success: true, ...result };
  } catch (error) {
    return {
      error: "Sync failed: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}

/**
 * Get QBO connection status for the current organization.
 */
export async function getConnectionStatus() {
  const org = await getOrg();
  if (!org || !org.qboConnection) {
    return { connected: false as const };
  }

  const conn = org.qboConnection;
  return {
    connected: true as const,
    realmId: conn.realmId,
    lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
    syncStatus: conn.syncStatus,
    syncError: conn.syncError,
    tokenExpiresAt: conn.tokenExpiresAt.toISOString(),
    status:
      conn.syncStatus === "disconnected"
        ? ("disconnected" as const)
        : conn.syncStatus === "error"
        ? ("error" as const)
        : ("active" as const),
  };
}

/**
 * Disconnect QuickBooks for the current organization.
 */
export async function disconnectQbo() {
  const org = await getOrg();
  if (!org || !org.qboConnection) {
    return { error: "No QuickBooks connection found" };
  }

  const QBO_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

  // Try to revoke token at Intuit
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
    console.error("Failed to revoke QBO token:", error);
  }

  await prisma.quickBooksConnection.delete({
    where: { id: org.qboConnection.id },
  });

  return { success: true };
}
