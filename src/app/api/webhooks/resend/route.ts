import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { parseReplyWebhook } from "@/lib/email/reply-handler";
import { handleResendEvent } from "@/lib/email/webhook-handler";
import { serverEnv } from "@/lib/env";

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
  const resend = new Resend(serverEnv.RESEND_API_KEY);

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
    Sentry.captureException(err);
    console.error("Resend webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const result = await handleResendEvent(body);

  // Handle email opened - potential engagement indicator
  if (body.type === "email.opened" && result.updatedCount && result.updatedCount > 0) {
    console.log("[resend-webhook] Email opened:", body.data.email_id);
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

  return NextResponse.json({ received: true });
}
