"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import type { NoteType } from "@prisma/client";

async function getOrg() {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) return null;
  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  });
  if (!org) return null;
  return { org, userId };
}

export async function createNote(
  invoiceId: string,
  content: string,
  noteType: NoteType = "GENERAL"
) {
  const ctx = await getOrg();
  if (!ctx) return { error: "Unauthorized" };

  // Verify invoice belongs to org
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.org.id },
  });

  if (!invoice) return { error: "Invoice not found" };

  const note = await prisma.invoiceNote.create({
    data: {
      invoiceId,
      authorId: ctx.userId,
      content,
      noteType,
    },
  });

  return { data: note };
}

export async function getNotes(invoiceId: string) {
  const ctx = await getOrg();
  if (!ctx) return { error: "Unauthorized" };

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.org.id },
  });

  if (!invoice) return { error: "Invoice not found" };

  const notes = await prisma.invoiceNote.findMany({
    where: { invoiceId },
    orderBy: { createdAt: "asc" },
  });

  return { data: notes };
}
