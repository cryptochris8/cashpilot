"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");
  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) throw new Error("Organization not found");
  return org;
}

export interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  total: number;
}

export interface AgingCustomerRow {
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

function getBucket(daysOverdue: number): string {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "days1to30";
  if (daysOverdue <= 60) return "days31to60";
  if (daysOverdue <= 90) return "days61to90";
  return "days90plus";
}

export async function getAgingReport(): Promise<{
  rows: AgingCustomerRow[];
  totals: AgingBucket;
}> {
  const org = await getOrg();
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

  const customerMap = new Map<string, AgingCustomerRow>();

  for (const inv of invoices) {
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const bucket = getBucket(daysOverdue);
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

  return { rows, totals };
}

export async function exportAgingCSV(): Promise<string> {
  const { rows, totals } = await getAgingReport();

  const headers = ["Customer", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total"];
  const csvRows = [headers.join(",")];

  for (const row of rows) {
    csvRows.push([
      '"' + row.customerName.replace(/"/g, '""') + '"',
      row.buckets.current.toFixed(2),
      row.buckets.days1to30.toFixed(2),
      row.buckets.days31to60.toFixed(2),
      row.buckets.days61to90.toFixed(2),
      row.buckets.days90plus.toFixed(2),
      row.buckets.total.toFixed(2),
    ].join(","));
  }

  csvRows.push([
    "TOTAL",
    totals.current.toFixed(2),
    totals.days1to30.toFixed(2),
    totals.days31to60.toFixed(2),
    totals.days61to90.toFixed(2),
    totals.days90plus.toFixed(2),
    totals.total.toFixed(2),
  ].join(","));

  return csvRows.join("\n");
}
