import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { sendReminder } from "@/lib/email/send";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/security/rate-limit";
import { invoiceRemindersSchema } from "@/lib/validations/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const limit = await checkRateLimit(rateLimitKey(org.id, "invoiceRemind"), RATE_LIMITS.invoiceRemind);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Retry in " + limit.retryAfterSeconds + "s." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: org.id },
    include: { customer: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!invoice.customer.email) return NextResponse.json({ error: "Customer has no email" }, { status: 400 });

  let raw = {};
  try {
    raw = await request.json();
  } catch {
    // No body provided, use defaults
  }

  const parsed = invoiceRemindersSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

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
