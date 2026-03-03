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

export async function getCustomerDetail(customerId: string) {
  const org = await getOrg();
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: org.id },
    include: {
      invoices: {
        include: {
          reminderLogs: { orderBy: { sentAt: "desc" } },
          invoiceNotes: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { dueDate: "desc" },
      },
    },
  });
  if (!customer) throw new Error("Customer not found");

  const allInvoices = customer.invoices;
  const paidInvoices = allInvoices.filter((i) => i.status === "PAID");
  const openInvoices = allInvoices.filter((i) => i.status === "OPEN" || i.status === "OVERDUE");
  const overdueInvoices = allInvoices.filter((i) => i.status === "OVERDUE");

  const totalOutstanding = openInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

  // Calculate average days to pay for paid invoices
  const daysToPay = paidInvoices.map((inv) => {
    const issued = new Date(inv.issueDate).getTime();
    const paid = new Date(inv.updatedAt).getTime();
    return Math.max(0, Math.floor((paid - issued) / (1000 * 60 * 60 * 24)));
  });
  const avgDaysToPay = daysToPay.length > 0 ? Math.round(daysToPay.reduce((a, b) => a + b, 0) / daysToPay.length) : 0;

  // On-time percentage
  const onTimeCount = paidInvoices.filter((inv) => {
    const paid = new Date(inv.updatedAt).getTime();
    const due = new Date(inv.dueDate).getTime();
    return paid <= due;
  }).length;
  const onTimePercent = paidInvoices.length > 0 ? Math.round((onTimeCount / paidInvoices.length) * 100) : 100;

  // Risk indicator
  let risk: "low" | "medium" | "high" = "low";
  if (onTimePercent < 50) risk = "high";
  else if (onTimePercent < 80) risk = "medium";

  // All reminder logs across invoices
  const allReminders = allInvoices.flatMap((inv) =>
    inv.reminderLogs.map((r) => ({
      ...r,
      invoiceNumber: inv.invoiceNumber,
      totalAmount: inv.totalAmount,
      sentAt: r.sentAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );

  return {
    customer: {
      id: customer.id,
      displayName: customer.displayName,
      email: customer.email,
      phone: customer.phone,
      qboCustomerId: customer.qboCustomerId,
      notes: customer.notes,
      unsubscribed: customer.unsubscribed,
    },
    stats: {
      totalOutstanding,
      totalInvoices: allInvoices.length,
      paidInvoices: paidInvoices.length,
      overdueCount: overdueInvoices.length,
      avgDaysToPay,
      onTimePercent,
      risk,
    },
    invoices: allInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      totalAmount: Number(inv.totalAmount),
      balance: Number(inv.balance),
      status: inv.status,
      pipelineStage: inv.pipelineStage,
      paidDate: inv.status === "PAID" ? inv.updatedAt.toISOString() : null,
    })),
    reminders: allReminders.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
  };
}

export async function updateCustomerNotes(customerId: string, notes: string) {
  const org = await getOrg();
  await prisma.customer.updateMany({
    where: { id: customerId, organizationId: org.id },
    data: { notes },
  });
  return { success: true };
}

export async function toggleUnsubscribe(customerId: string) {
  const org = await getOrg();
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: org.id },
  });
  if (!customer) throw new Error("Customer not found");
  await prisma.customer.update({
    where: { id: customerId },
    data: { unsubscribed: !customer.unsubscribed },
  });
  return { unsubscribed: !customer.unsubscribed };
}

export async function getPaymentHistory(customerId: string) {
  const org = await getOrg();
  const invoices = await prisma.invoice.findMany({
    where: {
      customerId,
      organizationId: org.id,
      status: "PAID",
    },
    orderBy: { updatedAt: "desc" },
  });

  return invoices.map((inv) => {
    const daysToPay = Math.max(
      0,
      Math.floor((new Date(inv.updatedAt).getTime() - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24))
    );
    const wasOnTime = new Date(inv.updatedAt).getTime() <= new Date(inv.dueDate).getTime();
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      totalAmount: Number(inv.totalAmount),
      dueDate: inv.dueDate.toISOString(),
      paidDate: inv.updatedAt.toISOString(),
      daysToPay,
      wasOnTime,
    };
  });
}
