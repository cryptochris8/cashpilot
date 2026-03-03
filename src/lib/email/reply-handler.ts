import prisma from "@/lib/db";

interface ReplyWebhookPayload {
  type: string;
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    subject?: string;
    text?: string;
    headers?: Array<{ name: string; value: string }>;
    [key: string]: unknown;
  };
}

/**
 * Parse an incoming reply notification from Resend or a webhook handler.
 * When a customer replies to a reminder email:
 * 1. Creates an InvoiceNote with the reply content
 * 2. Auto-pauses reminders for that invoice (customer has engaged)
 * 3. Returns info for creating in-app notifications
 */
export async function parseReplyWebhook(payload: ReplyWebhookPayload): Promise<{
  handled: boolean;
  invoiceId?: string;
  customerId?: string;
  message?: string;
}> {
  try {
    const messageId = payload.data.email_id;
    if (!messageId) {
      return { handled: false, message: "No email_id in payload" };
    }

    const reminderLog = await prisma.reminderLog.findFirst({
      where: { resendMessageId: messageId },
      include: {
        invoice: {
          include: { customer: true },
        },
      },
    });

    if (!reminderLog) {
      console.log("[reply-handler] No reminder log found for message:", messageId);
      return { handled: false, message: "No matching reminder log found" };
    }

    const invoice = reminderLog.invoice;
    const replyContent = payload.data.text || payload.data.subject || "Customer replied to reminder email";

    // 1. Create an InvoiceNote with the reply content
    await prisma.invoiceNote.create({
      data: {
        invoiceId: invoice.id,
        authorId: "system",
        content: "Customer reply received: " + replyContent.substring(0, 1000),
        noteType: "GENERAL",
      },
    });

    // 2. Auto-pause reminders (customer has engaged)
    if (!invoice.pauseReminders) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pauseReminders: true },
      });

      await prisma.invoiceNote.create({
        data: {
          invoiceId: invoice.id,
          authorId: "system",
          content: "Reminders auto-paused: customer replied to reminder email",
          noteType: "GENERAL",
        },
      });
    }

    // 3. Update the reminder log with the response
    await prisma.reminderLog.update({
      where: { id: reminderLog.id },
      data: { responseNote: replyContent.substring(0, 500) },
    });

    return {
      handled: true,
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      message: "Reply processed successfully",
    };
  } catch (error) {
    console.error("[reply-handler] Error processing reply:", error);
    return { handled: false, message: String(error) };
  }
}
