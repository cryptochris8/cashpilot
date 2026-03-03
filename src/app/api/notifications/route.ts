import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!org) {
    return NextResponse.json({ notifications: [] });
  }

  try {
    const notifications = await (prisma as any).notification.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ notifications });
  } catch {
    // Table may not exist yet - return empty
    return NextResponse.json({ notifications: [] });
  }
}
