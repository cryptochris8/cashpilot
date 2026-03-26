"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import type { NotificationType } from "@/lib/notifications/types";

async function getOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
}

/**
 * Get recent notifications for an organization.
 */
export async function getNotifications() {
  const org = await getOrg();
  if (!org) return [];

  try {
    const notifications = await prisma.notification.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return notifications;
  } catch {
    // Table may not exist yet - return empty array
    return [];
  }
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string) {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  try {
    await prisma.notification.updateMany({
      where: { id: notificationId, orgId: org.id },
      data: { read: true },
    });
    return { success: true };
  } catch {
    return { error: "Failed to mark notification as read" };
  }
}

/**
 * Mark all notifications as read for an organization.
 */
export async function markAllAsRead() {
  const org = await getOrg();
  if (!org) return { error: "Unauthorized" };

  try {
    await prisma.notification.updateMany({
      where: { orgId: org.id, read: false },
      data: { read: true },
    });
    return { success: true };
  } catch {
    return { error: "Failed to mark notifications as read" };
  }
}

/**
 * Create a notification for an organization (internal use — requires org ID directly).
 * This is called from background jobs/webhooks, not from the client.
 */
export async function createNotification(
  targetOrgId: string,
  type: NotificationType,
  title: string,
  message: string
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        orgId: targetOrgId,
        type,
        title,
        message,
        read: false,
      },
    });
    return notification;
  } catch {
    // Table may not exist yet
    return null;
  }
}
