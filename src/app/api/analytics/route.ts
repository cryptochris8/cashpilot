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

  // Get all reminder logs for this org
  const logs = await prisma.reminderLog.findMany({
    where: { invoice: { organizationId: org.id } },
    include: {
      template: { select: { name: true } },
      invoice: { select: { customer: { select: { displayName: true, email: true } } } },
    },
    orderBy: { sentAt: "desc" },
  });

  const totalSent = logs.filter((l) => l.deliveryStatus !== "FAILED").length;
  const totalDelivered = logs.filter((l) => l.deliveryStatus === "DELIVERED" || l.deliveryStatus === "OPENED").length;
  const totalOpened = logs.filter((l) => l.deliveryStatus === "OPENED").length;
  const totalBounced = logs.filter((l) => l.deliveryStatus === "BOUNCED").length;
  const sentThisMonth = logs.filter((l) => l.deliveryStatus !== "FAILED" && new Date(l.sentAt) >= startOfMonth).length;
  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

  // Weekly data for last 8 weeks
  const weeklyData: Array<{ week: string; sent: number; openRate: number }> = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekLogs = logs.filter((l) => {
      const d = new Date(l.sentAt);
      return d >= weekStart && d < weekEnd && l.deliveryStatus !== "FAILED";
    });
    const weekOpened = weekLogs.filter((l) => l.deliveryStatus === "OPENED").length;
    weeklyData.push({
      week: "W" + (8 - i),
      sent: weekLogs.length,
      openRate: weekLogs.length > 0 ? (weekOpened / weekLogs.length) * 100 : 0,
    });
  }

  // Delivery breakdown
  const deliveryBreakdown = [
    { name: "Delivered", value: totalDelivered },
    { name: "Opened", value: totalOpened },
    { name: "Bounced", value: totalBounced },
  ].filter((d) => d.value > 0);

  // Template performance
  const templateMap = new Map<string, { sent: number; opened: number; bounced: number }>();
  for (const log of logs) {
    if (log.deliveryStatus === "FAILED") continue;
    const name = log.template?.name || "Unknown";
    const entry = templateMap.get(name) || { sent: 0, opened: 0, bounced: 0 };
    entry.sent++;
    if (log.deliveryStatus === "OPENED") entry.opened++;
    if (log.deliveryStatus === "BOUNCED") entry.bounced++;
    templateMap.set(name, entry);
  }
  const templatePerformance = Array.from(templateMap.entries()).map(([name, data]) => ({
    name,
    sent: data.sent,
    openRate: data.sent > 0 ? (data.opened / data.sent) * 100 : 0,
    bounceRate: data.sent > 0 ? (data.bounced / data.sent) * 100 : 0,
  }));

  // Customer engagement
  const customerMap = new Map<string, { name: string; email: string; sent: number; opened: number; lastOpened: Date | null }>();
  for (const log of logs) {
    if (log.deliveryStatus === "FAILED") continue;
    const email = log.invoice?.customer?.email || "unknown";
    const name = log.invoice?.customer?.displayName || "Unknown";
    const entry = customerMap.get(email) || { name, email, sent: 0, opened: 0, lastOpened: null };
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
    .map((c) => ({ ...c, lastOpened: c.lastOpened?.toISOString() || null }));

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
