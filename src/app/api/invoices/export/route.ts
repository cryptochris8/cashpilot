import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const stage = url.searchParams.get("stage");
  const customerId = url.searchParams.get("customerId");
  const ids = url.searchParams.get("ids");

  const where: Record<string, unknown> = { organizationId: org.id };
  if (status && status !== "ALL") where.status = status;
  if (stage && stage !== "ALL") where.pipelineStage = stage;
  if (customerId) where.customerId = customerId;
  if (ids) where.id = { in: ids.split(",") };

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: true, reminderLogs: { orderBy: { sentAt: "desc" }, take: 1 } },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const csvHeaders = ["Invoice#", "Customer", "Amount", "Balance", "Due Date", "Days Overdue", "Status", "Stage", "Last Reminder"];
  const rows = invoices.map((inv) => {
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
    const lastReminder = inv.reminderLogs[0]?.sentAt ? new Date(inv.reminderLogs[0].sentAt).toLocaleDateString("en-US") : "";
    const custName = inv.customer.displayName.replace(/"/g, '""');
    return [
      inv.invoiceNumber || "",
      '"' + custName + '"',
      Number(inv.totalAmount).toFixed(2),
      Number(inv.balance).toFixed(2),
      new Date(inv.dueDate).toLocaleDateString("en-US"),
      String(daysOverdue),
      inv.status,
      inv.pipelineStage,
      lastReminder,
    ].join(",");
  });

  const csv = [csvHeaders.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=invoices-export.csv",
    },
  });
}
