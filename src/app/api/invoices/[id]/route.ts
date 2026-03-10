import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { invoicePatchSchema } from "@/lib/validations/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: org.id },
    include: {
      customer: true,
      reminderLogs: {
        include: { template: true },
        orderBy: { sentAt: "desc" },
      },
      invoiceNotes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Related invoices from same customer
  const relatedInvoices = await prisma.invoice.findMany({
    where: {
      customerId: invoice.customerId,
      organizationId: org.id,
      id: { not: invoice.id },
      status: { in: ["OPEN", "OVERDUE"] },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  return NextResponse.json({
    invoice: {
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      balance: Number(invoice.balance),
    },
    relatedInvoices: relatedInvoices.map((i) => ({
      ...i,
      totalAmount: Number(i.totalAmount),
      balance: Number(i.balance),
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const { id } = await params;

  const raw = await request.json();
  const parsed = invoicePatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (body.pipelineStage) updateData.pipelineStage = body.pipelineStage;
  if (body.pauseReminders !== undefined) updateData.pauseReminders = body.pauseReminders;
  if (body.status) updateData.status = body.status;

  const updated = await prisma.invoice.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
