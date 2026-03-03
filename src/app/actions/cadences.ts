"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
}

export async function getCadence() {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const cadence = await prisma.reminderCadence.findFirst({
    where: { organizationId: org.id, isActive: true },
    include: {
      steps: {
        include: { template: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return { data: cadence };
}

export async function getAllCadences() {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const cadences = await prisma.reminderCadence.findMany({
    where: { organizationId: org.id },
    include: {
      steps: {
        include: { template: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { data: cadences };
}

export async function createCadence(
  name: string,
  steps: Array<{ templateId: string; daysRelativeToDue: number }>
) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  // Deactivate other cadences
  await prisma.reminderCadence.updateMany({
    where: { organizationId: org.id },
    data: { isActive: false },
  });

  const cadence = await prisma.reminderCadence.create({
    data: {
      organizationId: org.id,
      name,
      isActive: true,
      steps: {
        create: steps.map((step, index) => ({
          templateId: step.templateId,
          daysRelativeToDue: step.daysRelativeToDue,
          order: index,
        })),
      },
    },
    include: {
      steps: {
        include: { template: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return { data: cadence };
}

export async function updateCadence(
  cadenceId: string,
  steps: Array<{ templateId: string; daysRelativeToDue: number }>
) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const cadence = await prisma.reminderCadence.findFirst({
    where: { id: cadenceId, organizationId: org.id },
  });

  if (!cadence) return { error: "Cadence not found" };

  // Delete existing steps and recreate
  await prisma.cadenceStep.deleteMany({
    where: { cadenceId },
  });

  const updated = await prisma.reminderCadence.update({
    where: { id: cadenceId },
    data: {
      steps: {
        create: steps.map((step, index) => ({
          templateId: step.templateId,
          daysRelativeToDue: step.daysRelativeToDue,
          order: index,
        })),
      },
    },
    include: {
      steps: {
        include: { template: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return { data: updated };
}

export async function setActiveCadence(cadenceId: string) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  // Deactivate all
  await prisma.reminderCadence.updateMany({
    where: { organizationId: org.id },
    data: { isActive: false },
  });

  // Activate selected
  await prisma.reminderCadence.update({
    where: { id: cadenceId },
    data: { isActive: true },
  });

  return { success: true };
}

export async function ensureDefaultCadence() {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  const existing = await prisma.reminderCadence.count({
    where: { organizationId: org.id },
  });

  if (existing > 0) return { data: "already_exists" };

  // Get default templates to link
  const templates = await prisma.reminderTemplate.findMany({
    where: { organizationId: org.id, isDefault: true },
    orderBy: { createdAt: "asc" },
  });

  if (templates.length === 0) return { data: "no_templates" };

  // Map templates by their name pattern to get daysRelativeToDue
  const daysMap: Record<string, number> = {
    "Friendly Pre-Due Reminder": -3,
    "Due Today Reminder": 0,
    "7-Day Overdue Notice": 7,
    "14-Day Overdue Follow-Up": 14,
    "30-Day Escalation Notice": 30,
  };

  const steps = templates
    .filter((t: { name: string }) => daysMap[t.name] !== undefined)
    .map((t: { id: string; name: string }, i: number) => ({
      templateId: t.id,
      daysRelativeToDue: daysMap[t.name],
      order: i,
    }));

  const cadence = await prisma.reminderCadence.create({
    data: {
      organizationId: org.id,
      name: "Default Collection Cadence",
      isDefault: true,
      isActive: true,
      steps: { create: steps },
    },
    include: {
      steps: {
        include: { template: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return { data: cadence };
}
