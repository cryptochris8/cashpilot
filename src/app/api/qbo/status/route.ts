import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET() {
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
    return NextResponse.json({ connected: false });
  }

  const conn = org.qboConnection;

  return NextResponse.json({
    connected: true,
    realmId: conn.realmId,
    lastSyncAt: conn.lastSyncAt,
    syncStatus: conn.syncStatus,
    syncError: conn.syncError,
    tokenExpiresAt: conn.tokenExpiresAt,
    status: conn.syncStatus === "disconnected" ? "disconnected" : conn.syncStatus === "error" ? "error" : "active",
  });
}
