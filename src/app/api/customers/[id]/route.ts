import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET(
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
    include: {
      invoices: {
        include: {
          reminderLogs: { include: { template: true }, orderBy: { sentAt: "desc" } },
          invoiceNotes: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { dueDate: "desc" },
      },
    },
  });

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  return NextResponse.json(customer);
}
