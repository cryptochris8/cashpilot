import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/db";
import { initialSync, incrementalSync } from "@/lib/qbo/sync";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/security/rate-limit";

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

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  if (!org.qboConnection) {
    return NextResponse.json(
      { error: "QuickBooks is not connected. Please connect first." },
      { status: 400 }
    );
  }

  if (org.qboConnection.syncStatus === "disconnected") {
    return NextResponse.json(
      { error: "QuickBooks connection is disconnected. Please reconnect." },
      { status: 400 }
    );
  }

  const limit = checkRateLimit(rateLimitKey(org.id, "qboSync"), RATE_LIMITS.qboSync);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Retry in " + limit.retryAfterSeconds + "s." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    let result;
    if (!org.qboConnection.lastSyncAt) {
      result = await initialSync(org.id);
    } else {
      result = await incrementalSync(org.id);
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error("Manual sync error:", error);
    return NextResponse.json(
      { error: "Sync failed: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
