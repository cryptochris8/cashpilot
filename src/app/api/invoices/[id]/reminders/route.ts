import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { sendReminder } from "@/lib/email/send";

export async function POST(
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
    include: { customer: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!invoice.customer.email) return NextResponse.json({ error: "Customer has no email" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const subject = body.subject || "Payment Reminder: Invoice #" + (invoice.invoiceNumber || invoice.id);
  const emailBody = body.body || "This is a reminder that invoice #" + (invoice.invoiceNumber || invoice.id) + " for $" + Number(invoice.balance).toFixed(2) + " is outstanding.";

  const { messageId, error } = await sendReminder({
    to: invoice.customer.email,
    subject,
    body: emailBody,
    orgId: org.id,
    customerId: invoice.customerId,
  });

  if (error) return NextResponse.json({ error }, { status: 500 });

  // Log the reminder
  await prisma.reminderLog.create({
    data: {
      invoiceId: id,
      sentAt: new Date(),
      channel: "EMAIL",
      deliveryStatus: "SENT",
      resendMessageId: messageId,
      subject,
      body: emailBody,
    },
  });

  // Update invoice
  await prisma.invoice.update({
    where: { id },
    data: { lastReminderSentAt: new Date() },
  });

  return NextResponse.json({ success: true, messageId });
}
