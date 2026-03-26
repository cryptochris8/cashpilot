import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { addDays, startOfWeek, addWeeks, subMonths, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

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
  const thirtyDaysFromNow = addDays(now, 30);
  const currentMonthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));

  // Run all independent queries in parallel
  const [
    openInvoices,
    overdueInvoices,
    paidThisMonth,
    paidPrevMonth,
    allPaidInvoices,
    atRiskInvoices,
    allOutstanding,
    recentReminders,
  ] = await Promise.all([
    // Expected next 30 days
    prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: { in: ["OPEN", "OVERDUE"] },
        dueDate: { lte: thirtyDaysFromNow },
        balance: { gt: 0 },
      },
      select: { balance: true },
    }),
    // Overdue total
    prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: "OVERDUE",
      },
      select: { balance: true },
    }),
    // Collected this month
    prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: "PAID",
        paidAt: { gte: currentMonthStart },
      },
      select: { totalAmount: true },
    }),
    // Previous month collected
    prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: "PAID",
        paidAt: { gte: prevMonthStart, lt: currentMonthStart },
      },
      select: { totalAmount: true },
    }),
    // All paid invoices for DSO/effectiveness (cap at 1000 most recent)
    prisma.invoice.findMany({
      where: { organizationId: org.id, status: "PAID" },
      select: { dueDate: true, paidAt: true, issueDate: true },
      orderBy: { paidAt: "desc" },
      take: 1000,
    }),
    // At-risk invoices
    prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: "OVERDUE",
        balance: { gt: 0 },
        dueDate: { lt: addDays(now, -45) },
      },
      include: {
        customer: true,
        reminderLogs: {
          where: { deliveryStatus: { in: ["OPENED"] } },
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    // Top debtors
    prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: { in: ["OPEN", "OVERDUE"] },
        balance: { gt: 0 },
      },
      include: { customer: true },
    }),
    // Recent reminders
    prisma.reminderLog.findMany({
      where: {
        invoice: { organizationId: org.id },
      },
      include: {
        invoice: { include: { customer: true } },
        template: true,
      },
      orderBy: { sentAt: "desc" },
      take: 5,
    }),
  ]);

  const expectedNext30Days = openInvoices.reduce(
    (sum, inv) => sum + Number(inv.balance),
    0
  );

  const overdueTotal = overdueInvoices.reduce(
    (sum, inv) => sum + Number(inv.balance),
    0
  );

  const collectedThisMonth = paidThisMonth.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0
  );

  const prevMonthCollected = paidPrevMonth.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0
  );

  // Collection effectiveness — use paidAt, fall back to now for legacy records
  const paidWithinTerms = allPaidInvoices.filter((inv) => {
    const paidTime = inv.paidAt ? new Date(inv.paidAt).getTime() : Date.now();
    return paidTime <= new Date(inv.dueDate).getTime();
  }).length;
  const collectionEffectiveness =
    allPaidInvoices.length > 0 ? Math.round((paidWithinTerms / allPaidInvoices.length) * 100) : 0;

  // DSO — use paidAt, fall back to now for legacy records
  const dsoValues = allPaidInvoices.map((inv) => {
    const issued = new Date(inv.issueDate).getTime();
    const paid = inv.paidAt ? new Date(inv.paidAt).getTime() : Date.now();
    return Math.max(0, Math.floor((paid - issued) / (1000 * 60 * 60 * 24)));
  });
  const dso = dsoValues.length > 0 ? Math.round(dsoValues.reduce((a, b) => a + b, 0) / dsoValues.length) : 0;

  // DSO trend — run all 6 month queries in parallel
  const monthQueries = Array.from({ length: 6 }, (_, i) => {
    const idx = 5 - i;
    const monthStart = startOfMonth(subMonths(now, idx));
    const monthEnd = startOfMonth(subMonths(now, idx - 1));
    return prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: "PAID",
        paidAt: { gte: monthStart, lt: monthEnd },
      },
      select: { issueDate: true, paidAt: true },
    }).then((monthPaid) => {
      const monthLabel = monthStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (monthPaid.length > 0) {
        const monthDsoValues = monthPaid.map((inv) => {
          const issued = new Date(inv.issueDate).getTime();
          const paid = inv.paidAt ? new Date(inv.paidAt).getTime() : Date.now();
          return Math.max(0, Math.floor((paid - issued) / (1000 * 60 * 60 * 24)));
        });
        const monthDso = Math.round(monthDsoValues.reduce((a, b) => a + b, 0) / monthDsoValues.length);
        return { month: monthLabel, dso: monthDso };
      }
      return { month: monthLabel, dso: 0 };
    });
  });

  // Weekly data — run all 4 week queries in parallel
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekQueries = Array.from({ length: 4 }, (_, i) => {
    const wStart = addWeeks(weekStart, i);
    const wEnd = addWeeks(weekStart, i + 1);
    return prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: { in: ["OPEN", "OVERDUE"] },
        dueDate: { gte: wStart, lt: wEnd },
        balance: { gt: 0 },
      },
      select: { balance: true },
    }).then((weekInvoices) => ({
      label: "Week " + (i + 1),
      amount: weekInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0),
      isCurrentWeek: i === 0,
    }));
  });

  const [dsoTrend, weeklyData] = await Promise.all([
    Promise.all(monthQueries),
    Promise.all(weekQueries),
  ]);

  const invoicesAtRisk = atRiskInvoices
    .filter((inv) => inv.reminderLogs.length === 0)
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.displayName,
      balance: Number(inv.balance),
      daysOverdue: Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
    }));

  const debtorMap: Record<string, { name: string; outstanding: number; invoices: number; oldestDue: Date }> = {};
  for (const inv of allOutstanding) {
    const key = inv.customerId;
    if (!debtorMap[key]) {
      debtorMap[key] = { name: inv.customer.displayName, outstanding: 0, invoices: 0, oldestDue: inv.dueDate };
    }
    debtorMap[key].outstanding += Number(inv.balance);
    debtorMap[key].invoices += 1;
    if (inv.dueDate < debtorMap[key].oldestDue) {
      debtorMap[key].oldestDue = inv.dueDate;
    }
  }

  const topDebtors = Object.values(debtorMap)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5)
    .map((d) => ({
      name: d.name,
      outstanding: d.outstanding,
      invoices: d.invoices,
      oldestDays: Math.max(0, Math.floor((now.getTime() - d.oldestDue.getTime()) / (1000 * 60 * 60 * 24))),
    }));

  const recentActivity = recentReminders.map((r) => ({
    id: r.id,
    customerName: r.invoice.customer.displayName,
    invoiceNumber: r.invoice.invoiceNumber,
    templateName: r.template?.name ?? null,
    sentAt: r.sentAt.toISOString(),
    deliveryStatus: r.deliveryStatus,
  }));

  return NextResponse.json({
    expectedNext30Days,
    overdueTotal,
    collectedThisMonth,
    collectionEffectiveness,
    dso,
    dsoTrend,
    prevMonthCollected,
    prevMonthOverdue: overdueTotal * 0.9, // TODO: compute from actual historical data
    invoicesAtRisk,
    topDebtors,
    recentActivity,
    weeklyData,
  });
}
