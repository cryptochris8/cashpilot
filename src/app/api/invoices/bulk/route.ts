import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { sendReminder } from "@/lib/email/send";

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await request.json();
  const { action, invoiceIds } = body as { action: string; invoiceIds: string[] };

  if (!invoiceIds || invoiceIds.length === 0) {
    return NextResponse.json({ error: "No invoices selected" }, { status: 400 });
  }

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
    const { stage } = body;
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
