"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { renderTemplate, sendReminder } from "@/lib/email/send";
import { DEFAULT_TEMPLATES } from "@/lib/email/templates";
import { z } from "zod/v4";

async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
}

export async function getTemplates() {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const templates = await prisma.reminderTemplate.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
  });

  return { data: templates };
}

export async function ensureDefaultTemplates() {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const existing = await prisma.reminderTemplate.count({
    where: { organizationId: org.id, isDefault: true },
  });

  if (existing > 0) return { data: "already_exists" };

  const templates = DEFAULT_TEMPLATES.map((t) => ({
    organizationId: org.id,
    name: t.name,
    subject: t.subject,
    body: t.body,
    isDefault: true,
  }));

  await prisma.reminderTemplate.createMany({ data: templates });

  return { data: "created" };
}

export async function createTemplate(data: {
  name: string;
  subject: string;
  body: string;
}) {
  const schema = z.object({
    name: z.string().min(1).max(200),
    subject: z.string().min(1).max(500),
    body: z.string().min(1).max(50000),
  });
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const template = await prisma.reminderTemplate.create({
    data: {
      organizationId: org.id,
      name: data.name,
      subject: data.subject,
      body: data.body,
      isDefault: false,
    },
  });

  return { data: template };
}

export async function updateTemplate(
  templateId: string,
  data: {
    name?: string;
    subject?: string;
    body?: string;
  }
) {
  const schema = z.object({
    name: z.string().min(1).max(200).optional(),
    subject: z.string().min(1).max(500).optional(),
    body: z.string().min(1).max(50000).optional(),
  });
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const template = await prisma.reminderTemplate.findFirst({
    where: { id: templateId, organizationId: org.id },
  });

  if (!template) return { error: "Template not found" };

  const updated = await prisma.reminderTemplate.update({
    where: { id: templateId },
    data,
  });

  return { data: updated };
}

export async function deleteTemplate(templateId: string) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const template = await prisma.reminderTemplate.findFirst({
    where: { id: templateId, organizationId: org.id },
  });

  if (!template) return { error: "Template not found" };
  if (template.isDefault) return { error: "Cannot delete default templates" };

  await prisma.reminderTemplate.delete({ where: { id: templateId } });

  return { success: true };
}

export async function sendTestEmail(templateId: string, toEmail: string) {
  const schema = z.string().email();
  const parsed = schema.safeParse(toEmail);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const template = await prisma.reminderTemplate.findFirst({
    where: { id: templateId, organizationId: org.id },
  });

  if (!template) return { error: "Template not found" };

  const sampleVars = {
    customer_name: "John Doe",
    invoice_number: "INV-001",
    amount: "$1,250.00",
    balance: "$1,250.00",
    due_date: "Mar 15, 2026",
    days_overdue: "7",
    company_name: org.name,
    payment_link: "https://pay.example.com/inv-001",
  };

  const subject = renderTemplate(template.subject, sampleVars);
  const body = renderTemplate(template.body, sampleVars);

  const result = await sendReminder(toEmail, "[TEST] " + subject, body);

  if (result.error) return { error: result.error };
  return { success: true, messageId: result.messageId };
}
