import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: org.id,
      status: { in: ["OPEN", "OVERDUE"] },
      balance: { gt: 0 },
    },
    include: { customer: true },
    orderBy: { dueDate: "asc" },
  });

  interface AgingBucket {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
    total: number;
  }

  interface AgingRow {
    customerId: string;
    customerName: string;
    buckets: AgingBucket;
    invoices: Array<{
      id: string;
      invoiceNumber: string | null;
      balance: number;
      dueDate: string;
      daysOverdue: number;
      bucket: string;
    }>;
  }

  const customerMap = new Map<string, AgingRow>();

  for (const inv of invoices) {
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    let bucket = "current";
    if (daysOverdue > 90) bucket = "days90plus";
    else if (daysOverdue > 60) bucket = "days61to90";
    else if (daysOverdue > 30) bucket = "days31to60";
    else if (daysOverdue > 0) bucket = "days1to30";
    const balance = Number(inv.balance);

    if (!customerMap.has(inv.customerId)) {
      customerMap.set(inv.customerId, {
        customerId: inv.customerId,
        customerName: inv.customer.displayName,
        buckets: { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 },
        invoices: [],
      });
    }

    const row = customerMap.get(inv.customerId)!;
    row.buckets[bucket as keyof AgingBucket] += balance;
    row.buckets.total += balance;
    row.invoices.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      balance,
      dueDate: inv.dueDate.toISOString(),
      daysOverdue: Math.max(0, daysOverdue),
      bucket,
    });
  }

  const rows = Array.from(customerMap.values()).sort((a, b) => b.buckets.total - a.buckets.total);

  const totals: AgingBucket = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 };
  for (const row of rows) {
    totals.current += row.buckets.current;
    totals.days1to30 += row.buckets.days1to30;
    totals.days31to60 += row.buckets.days31to60;
    totals.days61to90 += row.buckets.days61to90;
    totals.days90plus += row.buckets.days90plus;
    totals.total += row.buckets.total;
  }

  return NextResponse.json({ rows, totals });
}
