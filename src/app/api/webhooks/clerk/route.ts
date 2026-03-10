import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/db";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    name?: string;
    slug?: string;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET environment variable is required");
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const rawBody = await request.text();
  const wh = new Webhook(webhookSecret);

  let body: ClerkWebhookEvent;
  try {
    body = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    Sentry.captureException(err);
    console.error("Clerk webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (body.type) {
    case "organization.created": {
      await prisma.organization.create({
        data: {
          clerkOrgId: body.data.id,
          name: body.data.name ?? "Untitled Organization",
        },
      });
      break;
    }
    case "organization.updated": {
      await prisma.organization.updateMany({
        where: { clerkOrgId: body.data.id },
        data: { name: body.data.name ?? "Untitled Organization" },
      });
      break;
    }
    case "organization.deleted": {
      await prisma.organization.deleteMany({
        where: { clerkOrgId: body.data.id },
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
