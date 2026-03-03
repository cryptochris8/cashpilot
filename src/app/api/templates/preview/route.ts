import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sendReminder } from "@/lib/email/send";
import {
  templateRenderers,
  type TemplateName,
  type EmailTemplateData,
} from "@/lib/email/react-templates";

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

  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }

  const body = await request.json();
  const templateName = (body.template || "friendlyReminder") as TemplateName;
  const renderer = templateRenderers[templateName];
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
