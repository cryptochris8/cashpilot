import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const { id } = await params;
  const body = await request.json();

  await prisma.customer.updateMany({
    where: { id, organizationId: org.id },
    data: { notes: body.notes },
  });

  return NextResponse.json({ success: true });
}
