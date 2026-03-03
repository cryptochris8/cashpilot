"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import type { PipelineStage } from "@prisma/client";

async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
}

export async function getInvoicesByStage() {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: org.id },
    include: {
      customer: true,
      reminderLogs: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const grouped: Record<
    string,
    {
      invoices: typeof invoices;
      count: number;
      totalBalance: number;
    }
  > = {
    NEW: { invoices: [], count: 0, totalBalance: 0 },
    REMINDER_SENT: { invoices: [], count: 0, totalBalance: 0 },
    FOLLOW_UP: { invoices: [], count: 0, totalBalance: 0 },
    ESCALATED: { invoices: [], count: 0, totalBalance: 0 },
    RESOLVED: { invoices: [], count: 0, totalBalance: 0 },
  };

  for (const inv of invoices) {
    const stage = inv.pipelineStage;
    if (grouped[stage]) {
      grouped[stage].invoices.push(inv);
      grouped[stage].count += 1;
      grouped[stage].totalBalance += Number(inv.balance);
    }
  }

  return { data: grouped };
}

export async function updateInvoiceStage(
  invoiceId: string,
  newStage: PipelineStage
) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: org.id },
  });

  if (!invoice) return { error: "Invoice not found" };

  const oldStage = invoice.pipelineStage;
  if (oldStage === newStage) return { success: true };

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { pipelineStage: newStage },
    }),
    prisma.invoiceNote.create({
      data: {
        invoiceId,
        authorId: "system",
        content: `Stage changed from ${oldStage} to ${newStage}`,
        noteType: "GENERAL",
      },
    }),
  ]);

  return { success: true };
}

export async function bulkUpdateStage(
  invoiceIds: string[],
  newStage: PipelineStage
) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: invoiceIds }, organizationId: org.id },
  });

  if (invoices.length === 0) return { error: "No invoices found" };

  const operations = [];
  for (const inv of invoices) {
    if (inv.pipelineStage !== newStage) {
      operations.push(
        prisma.invoice.update({
          where: { id: inv.id },
          data: { pipelineStage: newStage },
        })
      );
      operations.push(
        prisma.invoiceNote.create({
          data: {
            invoiceId: inv.id,
            authorId: "system",
            content: `Stage changed from ${inv.pipelineStage} to ${newStage}`,
            noteType: "GENERAL",
          },
        })
      );
    }
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return { success: true, updated: invoices.length };
}

export async function pauseReminders(invoiceId: string) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  await prisma.invoice.updateMany({
    where: { id: invoiceId, organizationId: org.id },
    data: { pauseReminders: true },
  });

  await prisma.invoiceNote.create({
    data: {
      invoiceId,
      authorId: "system",
      content: "Reminders paused",
      noteType: "GENERAL",
    },
  });

  return { success: true };
}

export async function resumeReminders(invoiceId: string) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  await prisma.invoice.updateMany({
    where: { id: invoiceId, organizationId: org.id },
    data: { pauseReminders: false },
  });

  await prisma.invoiceNote.create({
    data: {
      invoiceId,
      authorId: "system",
      content: "Reminders resumed",
      noteType: "GENERAL",
    },
  });

  return { success: true };
}

export async function bulkPauseReminders(invoiceIds: string[], pause: boolean) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  await prisma.invoice.updateMany({
    where: { id: { in: invoiceIds }, organizationId: org.id },
    data: { pauseReminders: pause },
  });

  for (const id of invoiceIds) {
    await prisma.invoiceNote.create({
      data: {
        invoiceId: id,
        authorId: "system",
        content: pause ? "Reminders paused (bulk action)" : "Reminders resumed (bulk action)",
        noteType: "GENERAL",
      },
    });
  }

  return { success: true };
}

export async function markAsDisputed(invoiceId: string) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "DISPUTED", pauseReminders: true },
    }),
    prisma.invoiceNote.create({
      data: {
        invoiceId,
        authorId: "system",
        content: "Invoice marked as disputed. Reminders paused.",
        noteType: "DISPUTE",
      },
    }),
  ]);

  return { success: true };
}

export async function getInvoiceDetail(invoiceId: string) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: org.id },
    include: {
      customer: true,
      invoiceNotes: {
        orderBy: { createdAt: "asc" },
      },
      reminderLogs: {
        orderBy: { sentAt: "desc" },
        include: { template: true },
      },
    },
  });

  if (!invoice) return { error: "Invoice not found" };
  return { data: invoice };
}
