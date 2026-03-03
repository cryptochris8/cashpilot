import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const updated = await prisma.customer.update({
    where: { id },
    data: { unsubscribed: !customer.unsubscribed },
  });

  return NextResponse.json({ unsubscribed: updated.unsubscribed });
}
