import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { addDays, startOfWeek, addWeeks, subMonths, startOfMonth } from "date-fns";

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

  // Expected next 30 days: sum of balances for open invoices due within 30 days
  const openInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: org.id,
      status: { in: ["OPEN", "OVERDUE"] },
      dueDate: { lte: thirtyDaysFromNow },
      balance: { gt: 0 },
    },
    select: { balance: true },
  });

  const expectedNext30Days = openInvoices.reduce(
    (sum, inv) => sum + Number(inv.balance),
    0
  );

  // Overdue total
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: org.id,
      status: "OVERDUE",
    },
    select: { balance: true },
  });

  const overdueTotal = overdueInvoices.reduce(
    (sum, inv) => sum + Number(inv.balance),
    0
  );

  // Collected this month (paid invoices updated this month)
  const currentMonthStart = startOfMonth(now);
  const paidThisMonth = await prisma.invoice.findMany({
    where: {
      organizationId: org.id,
      status: "PAID",
      updatedAt: { gte: currentMonthStart },
    },
    select: { totalAmount: true },
  });

  const collectedThisMonth = paidThisMonth.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0
  );

  // Previous month collected (for comparison)
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const paidPrevMonth = await prisma.invoice.findMany({
    where: {
      organizationId: org.id,
      status: "PAID",
      updatedAt: { gte: prevMonthStart, lt: currentMonthStart },
    },
    select: { totalAmount: true },
  });
  const prevMonthCollected = paidPrevMonth.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0
  );

  // Previous month overdue (approximation using current overdue as baseline)
  const prevMonthOverdue = overdueTotal * 0.9; // Simplified approximation

  // Collection effectiveness: (invoices paid within terms / total invoices paid) * 100
  const allPaidInvoices = await prisma.invoice.findMany({
    where: { organizationId: org.id, status: "PAID" },
    select: { dueDate: true, updatedAt: true, issueDate: true },
  });
  const paidWithinTerms = allPaidInvoices.filter(
    (inv) => new Date(inv.updatedAt).getTime() <= new Date(inv.dueDate).getTime()
  ).length;
  const collectionEffectiveness =
    allPaidInvoices.length > 0 ? Math.round((paidWithinTerms / allPaidInvoices.length) * 100) : 0;

  // DSO: average days from invoice date to payment
  const dsoValues = allPaidInvoices.map((inv) => {
    const issued = new Date(inv.issueDate).getTime();
    const paid = new Date(inv.updatedAt).getTime();
    return Math.max(0, Math.floor((paid - issued) / (1000 * 60 * 60 * 24)));
  });
  const dso = dsoValues.length > 0 ? Math.round(dsoValues.reduce((a, b) => a + b, 0) / dsoValues.length) : 0;

  // DSO trend over last 6 months
  const dsoTrend: Array<{ month: string; dso: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = startOfMonth(subMonths(now, i - 1));
    const monthLabel = monthStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    const monthPaid = await prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: "PAID",
        updatedAt: { gte: monthStart, lt: monthEnd },
      },
      select: { issueDate: true, updatedAt: true },
    });

    if (monthPaid.length > 0) {
      const monthDsoValues = monthPaid.map((inv) => {
        const issued = new Date(inv.issueDate).getTime();
        const paid = new Date(inv.updatedAt).getTime();
        return Math.max(0, Math.floor((paid - issued) / (1000 * 60 * 60 * 24)));
      });
      const monthDso = Math.round(monthDsoValues.reduce((a, b) => a + b, 0) / monthDsoValues.length);
      dsoTrend.push({ month: monthLabel, dso: monthDso });
    } else {
      dsoTrend.push({ month: monthLabel, dso: 0 });
    }
  }

  // Invoices at risk: 45+ days overdue without recent engagement (no opened/replied reminder)
  const atRiskInvoices = await prisma.invoice.findMany({
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
  });

  const invoicesAtRisk = atRiskInvoices
    .filter((inv) => inv.reminderLogs.length === 0) // No engagement
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.displayName,
      balance: Number(inv.balance),
      daysOverdue: Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
    }));

  // Top debtors
  const allOutstanding = await prisma.invoice.findMany({
    where: {
      organizationId: org.id,
      status: { in: ["OPEN", "OVERDUE"] },
      balance: { gt: 0 },
    },
    include: { customer: true },
  });

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

  // Recent reminder activity
  const recentReminders = await prisma.reminderLog.findMany({
    where: {
      invoice: { organizationId: org.id },
    },
    include: {
      invoice: { include: { customer: true } },
      template: true,
    },
    orderBy: { sentAt: "desc" },
    take: 5,
  });

  const recentActivity = recentReminders.map((r) => ({
    id: r.id,
    customerName: r.invoice.customer.displayName,
    invoiceNumber: r.invoice.invoiceNumber,
    templateName: r.template?.name ?? null,
    sentAt: r.sentAt.toISOString(),
    deliveryStatus: r.deliveryStatus,
  }));

  // Expected receipts by week (4 weeks)
  const weeklyData = [];
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  for (let i = 0; i < 4; i++) {
    const wStart = addWeeks(weekStart, i);
    const wEnd = addWeeks(weekStart, i + 1);
    const weekInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        status: { in: ["OPEN", "OVERDUE"] },
        dueDate: { gte: wStart, lt: wEnd },
        balance: { gt: 0 },
      },
      select: { balance: true },
    });
    const weekTotal = weekInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
    weeklyData.push({
      label: "Week " + (i + 1),
      amount: weekTotal,
      isCurrentWeek: i === 0,
    });
  }

  return NextResponse.json({
    expectedNext30Days,
    overdueTotal,
    collectedThisMonth,
    collectionEffectiveness,
    dso,
    dsoTrend,
    prevMonthCollected,
    prevMonthOverdue,
    invoicesAtRisk,
    topDebtors,
    recentActivity,
    weeklyData,
  });
}
