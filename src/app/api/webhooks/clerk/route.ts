import { NextRequest, NextResponse } from "next/server";
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
  // In production, verify the webhook signature using the Clerk webhook secret
  // For now, we parse the event and handle org creation
  const body: ClerkWebhookEvent = await request.json();

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
