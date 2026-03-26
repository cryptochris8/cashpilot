import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const orgFilter = { invoice: { organizationId: org.id } };

  // --- Aggregate stats via database-level COUNT queries ---
  const [totalSent, totalDelivered, totalOpened, totalBounced, sentThisMonth] =
    await Promise.all([
      prisma.reminderLog.count({
        where: { ...orgFilter, deliveryStatus: { notIn: ["FAILED"] } },
      }),
      prisma.reminderLog.count({
        where: { ...orgFilter, deliveryStatus: { in: ["DELIVERED", "OPENED"] } },
      }),
      prisma.reminderLog.count({
        where: { ...orgFilter, deliveryStatus: "OPENED" },
      }),
      prisma.reminderLog.count({
        where: { ...orgFilter, deliveryStatus: "BOUNCED" },
      }),
      prisma.reminderLog.count({
        where: {
          ...orgFilter,
          deliveryStatus: { notIn: ["FAILED"] },
          sentAt: { gte: startOfMonth },
        },
      }),
    ]);

  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

  // --- Weekly data: 8 parallel pairs of COUNT queries (sent + opened per week) ---
  const now = new Date();
  const weekBounds = Array.from({ length: 8 }, (_, i) => {
    // i=0 is the oldest week (7 weeks ago), i=7 is the current week
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return { weekStart, weekEnd, label: `W${i + 1}` };
  });

  const weeklyResults = await Promise.all(
    weekBounds.map(({ weekStart, weekEnd }) =>
      Promise.all([
        prisma.reminderLog.count({
          where: {
            ...orgFilter,
            deliveryStatus: { notIn: ["FAILED"] },
            sentAt: { gte: weekStart, lt: weekEnd },
          },
        }),
        prisma.reminderLog.count({
          where: {
            ...orgFilter,
            deliveryStatus: "OPENED",
            sentAt: { gte: weekStart, lt: weekEnd },
          },
        }),
      ])
    )
  );

  const weeklyData = weekBounds.map(({ label }, i) => {
    const [sent, opened] = weeklyResults[i];
    return {
      week: label,
      sent,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
    };
  });

  // --- Delivery breakdown (reuse already-computed counts) ---
  const deliveryBreakdown = [
    { name: "Delivered", value: totalDelivered },
    { name: "Opened", value: totalOpened },
    { name: "Bounced", value: totalBounced },
  ].filter((d) => d.value > 0);

  // --- Template performance via groupBy ---
  const templateGroups = await prisma.reminderLog.groupBy({
    by: ["templateId", "deliveryStatus"],
    where: {
      ...orgFilter,
      deliveryStatus: { notIn: ["FAILED"] },
    },
    _count: { _all: true },
  });

  // Fetch template names for the distinct templateIds found
  const templateIds = [
    ...new Set(
      templateGroups
        .map((g) => g.templateId)
        .filter((id): id is string => id !== null)
    ),
  ];
  const templates = await prisma.reminderTemplate.findMany({
    where: { id: { in: templateIds } },
    select: { id: true, name: true },
  });
  const templateNameMap = new Map(templates.map((t) => [t.id, t.name]));

  const templateAgg = new Map<
    string,
    { sent: number; opened: number; bounced: number }
  >();
  for (const g of templateGroups) {
    const name = g.templateId
      ? (templateNameMap.get(g.templateId) ?? "Unknown")
      : "Unknown";
    const entry = templateAgg.get(name) ?? { sent: 0, opened: 0, bounced: 0 };
    entry.sent += g._count._all;
    if (g.deliveryStatus === "OPENED") entry.opened += g._count._all;
    if (g.deliveryStatus === "BOUNCED") entry.bounced += g._count._all;
    templateAgg.set(name, entry);
  }
  const templatePerformance = Array.from(templateAgg.entries()).map(
    ([name, data]) => ({
      name,
      sent: data.sent,
      openRate: data.sent > 0 ? (data.opened / data.sent) * 100 : 0,
      bounceRate: data.sent > 0 ? (data.bounced / data.sent) * 100 : 0,
    })
  );

  // --- Customer engagement with safety cap ---
  const engagementLogs = await prisma.reminderLog.findMany({
    where: { ...orgFilter, deliveryStatus: { notIn: ["FAILED"] } },
    select: {
      deliveryStatus: true,
      sentAt: true,
      invoice: {
        select: {
          customer: { select: { displayName: true, email: true } },
        },
      },
    },
    orderBy: { sentAt: "desc" },
    take: 5000,
  });

  const customerMap = new Map<
    string,
    { name: string; email: string; sent: number; opened: number; lastOpened: Date | null }
  >();
  for (const log of engagementLogs) {
    const email = log.invoice?.customer?.email ?? "unknown";
    const name = log.invoice?.customer?.displayName ?? "Unknown";
    const entry = customerMap.get(email) ?? {
      name,
      email,
      sent: 0,
      opened: 0,
      lastOpened: null,
    };
    entry.sent++;
    if (log.deliveryStatus === "OPENED") {
      entry.opened++;
      if (!entry.lastOpened || new Date(log.sentAt) > entry.lastOpened) {
        entry.lastOpened = new Date(log.sentAt);
      }
    }
    customerMap.set(email, entry);
  }
  const customerEngagement = Array.from(customerMap.values())
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 20)
    .map((c) => ({ ...c, lastOpened: c.lastOpened?.toISOString() ?? null }));

  return NextResponse.json({
    totalSent,
    totalDelivered,
    totalOpened,
    totalBounced,
    sentThisMonth,
    openRate,
    bounceRate,
    weeklyData,
    deliveryBreakdown,
    templatePerformance,
    customerEngagement,
  });
}
