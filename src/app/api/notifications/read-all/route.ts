import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function POST() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await (prisma as any).notification.updateMany({
      where: { orgId: org.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
