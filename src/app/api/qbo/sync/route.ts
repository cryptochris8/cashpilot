import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { initialSync, incrementalSync } from "@/lib/qbo/sync";

// Simple in-memory rate limiter: 1 sync per minute per org
const lastSyncTimes = new Map<string, number>();

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

  // Rate limiting: 1 sync per minute per org
  const now = Date.now();
  const lastSync = lastSyncTimes.get(org.id);
  if (lastSync && now - lastSync < 60_000) {
    const waitSeconds = Math.ceil((60_000 - (now - lastSync)) / 1000);
    return NextResponse.json(
      { error: "Rate limited. Please wait " + waitSeconds + " seconds before syncing again." },
      { status: 429 }
    );
  }
  lastSyncTimes.set(org.id, now);

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
    console.error("Manual sync error:", error);
    return NextResponse.json(
      { error: "Sync failed: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
