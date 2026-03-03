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

  const customers = await prisma.customer.findMany({
    where: { organizationId: org.id },
    include: {
      invoices: {
        where: { status: { in: ["OPEN", "OVERDUE"] } },
        select: { balance: true, dueDate: true },
      },
    },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(customers);
}
