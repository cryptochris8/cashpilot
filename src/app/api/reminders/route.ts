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
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const reminders = await prisma.reminderLog.findMany({
    where: {
      invoice: { organizationId: org.id },
    },
    include: {
      invoice: {
        include: { customer: true },
      },
    },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  return NextResponse.json(reminders);
}
