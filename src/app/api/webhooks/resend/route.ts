import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/db";
import { parseReplyWebhook } from "@/lib/email/reply-handler";

interface ResendWebhookEvent {
  type: string;
  data: {
    email_id: string;
    bounce?: {
      message: string;
    };
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("RESEND_WEBHOOK_SECRET environment variable is required");
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
  }

  const rawBody = await request.text();
  const resend = new Resend(process.env.RESEND_API_KEY!);

  let body: ResendWebhookEvent;
  try {
    body = resend.webhooks.verify(
      {
        payload: rawBody,
        headers: {
          id: svixId,
          timestamp: svixTimestamp,
          signature: svixSignature,
        },
        webhookSecret,
      }
    ) as unknown as ResendWebhookEvent;
  } catch (err) {
    console.error("Resend webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const deliveryStatusMap: Record<string, string> = {
    "email.sent": "SENT",
    "email.delivered": "DELIVERED",
    "email.opened": "OPENED",
    "email.bounced": "BOUNCED",
    "email.delivery_delayed": "QUEUED",
    "email.complained": "FAILED",
  };

  const newStatus = deliveryStatusMap[body.type];
  if (newStatus && body.data.email_id) {
    // Update the reminder log
    const updated = await prisma.reminderLog.updateMany({
      where: { resendMessageId: body.data.email_id },
      data: {
        deliveryStatus: newStatus as "QUEUED" | "SENT" | "DELIVERED" | "OPENED" | "BOUNCED" | "FAILED",
      },
    });

    // Handle bounce: create note and optionally pause reminders
    if (body.type === "email.bounced" && updated.count > 0) {
      const logs = await prisma.reminderLog.findMany({
        where: { resendMessageId: body.data.email_id },
        select: { invoiceId: true },
      });

      for (const log of logs) {
        const bounceMessage = body.data.bounce?.message ?? "Unknown bounce reason";

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
      }
    }

    // Handle email opened - potential engagement indicator
    if (body.type === "email.opened" && updated.count > 0) {
      console.log("[resend-webhook] Email opened:", body.data.email_id);
    }
  }

  // Handle reply/engagement events
  // Resend does not have a native "reply" event type, but we handle it here
  // for future integration with Resend Inbound or similar services
  if (body.type === "email.replied" || body.type === "inbound.received") {
    const result = await parseReplyWebhook({
      type: body.type,
      data: body.data,
    });
    console.log("[resend-webhook] Reply handling result:", result);
  }

  // Log any unhandled event types for future reference
  if (!deliveryStatusMap[body.type] && body.type !== "email.replied" && body.type !== "inbound.received") {
    console.log("[resend-webhook] Unhandled event type:", body.type, body.data);
  }

  return NextResponse.json({ received: true });
}
