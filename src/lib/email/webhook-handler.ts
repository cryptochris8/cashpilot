import prisma from "@/lib/db";

export type DeliveryStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "BOUNCED"
  | "FAILED";

export interface ResendEventPayload {
  type: string;
  data: {
    email_id: string;
    bounce?: {
      message: string;
    };
    [key: string]: unknown;
  };
}

export const DELIVERY_STATUS_MAP: Record<string, DeliveryStatus> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.opened": "OPENED",
  "email.bounced": "BOUNCED",
  "email.delivery_delayed": "QUEUED",
  "email.complained": "FAILED",
};

/**
 * Core logic for processing a verified Resend webhook event.
 *
 * - Updates the deliveryStatus on any matching ReminderLog rows.
 * - On bounce: creates an InvoiceNote and sets pauseReminders=true on the invoice.
 * - Returns a summary of what was done (useful for testing).
 */
export async function handleResendEvent(event: ResendEventPayload): Promise<{
  processed: boolean;
  status?: DeliveryStatus;
  updatedCount?: number;
  bouncedInvoiceIds?: string[];
}> {
  const newStatus = DELIVERY_STATUS_MAP[event.type];

  if (!newStatus || !event.data.email_id) {
    return { processed: false };
  }

  const updated = await prisma.reminderLog.updateMany({
    where: { resendMessageId: event.data.email_id },
    data: { deliveryStatus: newStatus },
  });

  const bouncedInvoiceIds: string[] = [];

  if (event.type === "email.bounced" && updated.count > 0) {
    const logs = await prisma.reminderLog.findMany({
      where: { resendMessageId: event.data.email_id },
      select: { invoiceId: true },
    });

    for (const log of logs) {
      const bounceMessage = event.data.bounce?.message ?? "Unknown bounce reason";

      await prisma.invoiceNote.create({
        data: {
          invoiceId: log.invoiceId,
          authorId: "system",
          content: "Email bounced: " + bounceMessage,
          noteType: "GENERAL",
        },
      });

      await prisma.invoice.update({
        where: { id: log.invoiceId },
        data: { pauseReminders: true },
      });

      await prisma.invoiceNote.create({
        data: {
          invoiceId: log.invoiceId,
          authorId: "system",
          content: "Reminders auto-paused due to email bounce",
          noteType: "GENERAL",
        },
      });

      bouncedInvoiceIds.push(log.invoiceId);
    }
  }

  return {
    processed: true,
    status: newStatus,
    updatedCount: updated.count,
    bouncedInvoiceIds,
  };
}
