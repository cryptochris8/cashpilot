import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { sendReminder } from "@/lib/email/send";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/security/rate-limit";
import { invoiceBulkSchema } from "@/lib/validations/api";

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const limit = checkRateLimit(rateLimitKey(org.id, "bulk"), RATE_LIMITS.bulk);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Retry in " + limit.retryAfterSeconds + "s." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const raw = await request.json();
  const parsed = invoiceBulkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { action, invoiceIds, stage } = parsed.data;

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: invoiceIds }, organizationId: org.id },
    include: { customer: true },
  });

  if (action === "sendReminder") {
    let sent = 0;
    for (const inv of invoices) {
      if (!inv.customer.email || inv.customer.unsubscribed) continue;
      const subject = "Payment Reminder: Invoice #" + (inv.invoiceNumber || inv.id);
      const emailBody = "This is a reminder that invoice #" + (inv.invoiceNumber || inv.id) + " for " + Number(inv.balance).toFixed(2) + " is outstanding.";
      const result = await sendReminder({
        to: inv.customer.email,
        subject,
        body: emailBody,
        orgId: org.id,
        customerId: inv.customerId,
      });
      if (!result.error) {
        await prisma.reminderLog.create({
          data: {
            invoiceId: inv.id,
            sentAt: new Date(),
            channel: "EMAIL",
            deliveryStatus: "SENT",
            resendMessageId: result.messageId,
            subject,
            body: emailBody,
          },
        });
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { lastReminderSentAt: new Date() },
        });
        sent++;
      }
    }
    return NextResponse.json({ success: true, sent });
  }

  if (action === "changeStage") {
    if (!stage) return NextResponse.json({ error: "Stage required" }, { status: 400 });
    await prisma.invoice.updateMany({
      where: { id: { in: invoiceIds }, organizationId: org.id },
      data: { pipelineStage: stage },
    });
    return NextResponse.json({ success: true, updated: invoices.length });
  }

  if (action === "pauseReminders") {
    await prisma.invoice.updateMany({
      where: { id: { in: invoiceIds }, organizationId: org.id },
      data: { pauseReminders: true },
    });
    return NextResponse.json({ success: true, updated: invoices.length });
  }

  if (action === "resumeReminders") {
    await prisma.invoice.updateMany({
      where: { id: { in: invoiceIds }, organizationId: org.id },
      data: { pauseReminders: false },
    });
    return NextResponse.json({ success: true, updated: invoices.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
