import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { sendReminder } from "@/lib/email/send";
import {
  templateRenderers,
  type TemplateName,
  type EmailTemplateData,
} from "@/lib/email/react-templates";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/security/rate-limit";
import { templatePreviewSchema } from "@/lib/validations/api";

const sampleData: EmailTemplateData = {
  customerName: "John Smith",
  invoiceNumber: "1042",
  amount: "$5,200.00",
  balance: "$5,200.00",
  dueDate: "March 15, 2026",
  daysOverdue: "14",
  companyName: "Acme Corp",
  paymentLink: "https://pay.example.com/inv-1042",
  unsubscribeUrl: "#",
};

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const limit = await checkRateLimit(rateLimitKey(org.id, "templatePreview"), RATE_LIMITS.templatePreview);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Retry in " + limit.retryAfterSeconds + "s." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }

  const raw = await request.json();
  const parsed = templatePreviewSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { template: templateName } = parsed.data;

  const renderer = templateRenderers[templateName as TemplateName];
  if (!renderer) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

  const html = renderer(sampleData);
  const userEmail = user.emailAddresses[0].emailAddress;

  const { error } = await sendReminder({
    to: userEmail,
    subject: "[TEST] CashPilot Email Preview - " + templateName,
    body: html,
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}
