import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { renderTemplate, sendReminder } from "@/lib/email/send";
import { formatCurrency, formatDate, daysOverdue } from "@/lib/utils/format";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/security/rate-limit";
import { invoiceRemindSchema } from "@/lib/validations/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const limit = await checkRateLimit(rateLimitKey(org.id, "invoiceRemind"), RATE_LIMITS.invoiceRemind);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Retry in " + limit.retryAfterSeconds + "s." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { id: invoiceId } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: org.id },
    include: { customer: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!invoice.customer.email) {
    return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
  }

  let raw = {};
  try {
    raw = await request.json();
  } catch {
    // No body provided, use default
  }

  const parsed = invoiceRemindSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data ?? {};

  let template = null;

  if (body.templateId) {
    template = await prisma.reminderTemplate.findFirst({
      where: { id: body.templateId, organizationId: org.id },
    });
  }

  // If no template specified, find the next one in the cadence
  if (!template) {
    const cadence = await prisma.reminderCadence.findFirst({
      where: { organizationId: org.id, isActive: true },
      include: {
        steps: {
          include: { template: true },
          orderBy: { daysRelativeToDue: "asc" },
        },
      },
    });

    if (cadence && cadence.steps.length > 0) {
      // Find which templates have already been sent
      const sentTemplateIds = new Set(
        (await prisma.reminderLog.findMany({
          where: { invoiceId: invoice.id },
          select: { templateId: true },
        })).map((l) => l.templateId)
      );

      // Find next unsent template
      const nextStep = cadence.steps.find((s) => !sentTemplateIds.has(s.templateId));
      template = nextStep?.template ?? cadence.steps[0].template;
    }
  }

  // If still no template, use a generic reminder
  const days = daysOverdue(invoice.dueDate);
  const vars = {
    customer_name: invoice.customer.displayName,
    invoice_number: invoice.invoiceNumber ?? "N/A",
    amount: formatCurrency(Number(invoice.totalAmount)),
    balance: formatCurrency(Number(invoice.balance)),
    due_date: formatDate(invoice.dueDate),
    days_overdue: String(Math.max(0, days)),
    company_name: org.name,
    payment_link: "",
  };

  let subject: string;
  let emailBody: string;
  let templateId: string | null = null;
  let templateName = "Manual Reminder";

  if (template) {
    subject = renderTemplate(template.subject, vars);
    emailBody = renderTemplate(template.body, vars);
    templateId = template.id;
    templateName = template.name;
  } else {
    subject = "Reminder: Invoice " + (invoice.invoiceNumber ?? "N/A") + " - " + formatCurrency(Number(invoice.balance)) + " due";
    emailBody = "Hi " + invoice.customer.displayName + ",\n\nThis is a reminder about invoice " + (invoice.invoiceNumber ?? "N/A") + " for " + formatCurrency(Number(invoice.balance)) + " due on " + formatDate(invoice.dueDate) + ".\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\n" + org.name;
  }

  const result = await sendReminder({
    to: invoice.customer.email,
    subject,
    body: emailBody,
    orgId: org.id,
    customerId: invoice.customerId,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Create reminder log
  await prisma.reminderLog.create({
    data: {
      invoiceId: invoice.id,
      templateId,
      deliveryStatus: "SENT",
      resendMessageId: result.messageId,
      subject,
      body: emailBody,
    },
  });

  // Update invoice
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      lastReminderSentAt: new Date(),
      pipelineStage: invoice.pipelineStage === "NEW" ? "REMINDER_SENT" : invoice.pipelineStage,
    },
  });

  // Create note
  await prisma.invoiceNote.create({
    data: {
      invoiceId: invoice.id,
      authorId: "system",
      content: "Manual reminder sent: " + templateName,
      noteType: "GENERAL",
    },
  });

  return NextResponse.json({ success: true, messageId: result.messageId });
}
