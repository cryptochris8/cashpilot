import prisma from "@/lib/db";
import { renderTemplate, sendReminder } from "@/lib/email/send";
import { formatCurrency, formatDate, daysOverdue } from "@/lib/utils/format";

interface ReminderToSend {
  invoiceId: string;
  templateId: string;
  templateName: string;
  customerEmail: string;
  customerId: string;
  orgId: string;
  renderedSubject: string;
  renderedBody: string;
}

/**
 * Evaluate which reminders should be sent for a given org.
 * Checks all OPEN/OVERDUE invoices against the active cadence.
 * Skips unsubscribed customers.
 */
export async function evaluateReminders(orgId: string): Promise<ReminderToSend[]> {
  // Fetch the active cadence with steps
  const cadence = await prisma.reminderCadence.findFirst({
    where: { organizationId: orgId, isActive: true },
    include: {
      steps: {
        include: { template: true },
        orderBy: { daysRelativeToDue: "asc" },
      },
    },
  });

  if (!cadence || cadence.steps.length === 0) return [];

  // Fetch all open/overdue invoices that are not paused
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["OPEN", "OVERDUE"] },
      pauseReminders: false,
    },
    include: {
      customer: true,
      reminderLogs: {
        select: { templateId: true, sentAt: true },
      },
    },
  });

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const companyName = org?.name ?? "Your Company";

  const remindersToSend: ReminderToSend[] = [];

  for (const invoice of invoices) {
    if (!invoice.customer.email) continue;

    // Skip unsubscribed customers
    if (invoice.customer.unsubscribed) continue;

    const days = daysOverdue(invoice.dueDate);
    const sentTemplateIds = new Set(invoice.reminderLogs.map((l) => l.templateId));

    // Find the next step that should fire
    for (const step of cadence.steps) {
      if (days >= step.daysRelativeToDue && !sentTemplateIds.has(step.templateId)) {
        const vars = {
          customer_name: invoice.customer.displayName,
          invoice_number: invoice.invoiceNumber ?? "N/A",
          amount: formatCurrency(Number(invoice.totalAmount)),
          balance: formatCurrency(Number(invoice.balance)),
          due_date: formatDate(invoice.dueDate),
          days_overdue: String(Math.max(0, days)),
          company_name: companyName,
          payment_link: "",
        };

        remindersToSend.push({
          invoiceId: invoice.id,
          templateId: step.templateId,
          templateName: step.template.name,
          customerEmail: invoice.customer.email,
          customerId: invoice.customerId,
          orgId,
          renderedSubject: renderTemplate(step.template.subject, vars),
          renderedBody: renderTemplate(step.template.body, vars),
        });

        // Only send one reminder per invoice per run
        break;
      }
    }
  }

  return remindersToSend;
}

/**
 * Execute the reminders: send emails, create logs and notes, update stages.
 */
export async function executeReminders(remindersToSend: ReminderToSend[]): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const reminder of remindersToSend) {
    try {
      const result = await sendReminder({
        to: reminder.customerEmail,
        subject: reminder.renderedSubject,
        body: reminder.renderedBody,
        orgId: reminder.orgId,
        customerId: reminder.customerId,
      });

      if (result.error) {
        failed++;
        errors.push("Invoice " + reminder.invoiceId + ": " + result.error);

        // Create failed log
        await prisma.reminderLog.create({
          data: {
            invoiceId: reminder.invoiceId,
            templateId: reminder.templateId,
            deliveryStatus: "FAILED",
            subject: reminder.renderedSubject,
            body: reminder.renderedBody,
            responseNote: result.error,
          },
        });
        continue;
      }

      // Create success log
      await prisma.reminderLog.create({
        data: {
          invoiceId: reminder.invoiceId,
          templateId: reminder.templateId,
          deliveryStatus: "SENT",
          resendMessageId: result.messageId,
          subject: reminder.renderedSubject,
          body: reminder.renderedBody,
        },
      });

      // Update invoice
      const invoice = await prisma.invoice.findUnique({ where: { id: reminder.invoiceId } });
      const updateData: Record<string, unknown> = { lastReminderSentAt: new Date() };

      if (invoice && invoice.pipelineStage === "NEW") {
        updateData.pipelineStage = "REMINDER_SENT";
      }

      await prisma.invoice.update({
        where: { id: reminder.invoiceId },
        data: updateData,
      });

      // Create note
      await prisma.invoiceNote.create({
        data: {
          invoiceId: reminder.invoiceId,
          authorId: "system",
          content: "Reminder sent: " + reminder.templateName,
          noteType: "GENERAL",
        },
      });

      sent++;
    } catch (err) {
      failed++;
      errors.push("Invoice " + reminder.invoiceId + ": " + String(err));
    }
  }

  return { sent, failed, errors };
}
