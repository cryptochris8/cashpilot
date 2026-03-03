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

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: org.id },
    include: { customer: true },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(invoices);
}
