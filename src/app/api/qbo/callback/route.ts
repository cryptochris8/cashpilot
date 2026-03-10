import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { exchangeCodeForTokens } from "@/lib/qbo/client";
import { encryptToken } from "@/lib/qbo/token-manager";
import prisma from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");

  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_params", request.url)
    );
  }

  // Validate CSRF state against cookie
  const cookieStore = await cookies();
  const storedState = cookieStore.get("qbo_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/settings?error=invalid_state", request.url)
    );
  }

  // Clear the state cookie
  cookieStore.delete("qbo_oauth_state");

  // Decode state to get orgId
  let orgId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    );
    orgId = decoded.orgId;
  } catch {
    return NextResponse.redirect(
      new URL("/settings?error=invalid_state", request.url)
    );
  }

  if (!orgId) {
    return NextResponse.redirect(
      new URL("/settings?error=no_org", request.url)
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, realmId);

    // Find the organization
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!org) {
      return NextResponse.redirect(
        new URL("/settings?error=org_not_found", request.url)
      );
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);

    // Upsert the QBO connection
    await prisma.quickBooksConnection.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        realmId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        realmId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        syncStatus: "idle",
        syncError: null,
      },
    });

    return NextResponse.redirect(
      new URL("/settings?success=connected", request.url)
    );
  } catch (error) {
    Sentry.captureException(error);
    console.error("QBO callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=token_exchange_failed", request.url)
    );
  }
}
