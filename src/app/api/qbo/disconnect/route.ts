import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/db";
import { decryptToken } from "@/lib/qbo/token-manager";

const QBO_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

export async function POST() {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 401 }
    );
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: { qboConnection: true },
  });

  if (!org || !org.qboConnection) {
    return NextResponse.json(
      { error: "No QuickBooks connection found" },
      { status: 404 }
    );
  }

  // Try to revoke the token at Intuit
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
    // Log but do not fail - we still want to remove the local connection
    Sentry.captureException(error);
    console.error("Failed to revoke QBO token:", error);
  }

  // Delete the connection record
  await prisma.quickBooksConnection.delete({
    where: { id: org.qboConnection.id },
  });

  return NextResponse.json({ success: true });
}
