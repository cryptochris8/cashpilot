"use server";

import prisma from "@/lib/db";
import type { NotificationType } from "@/lib/notifications/types";

/**
 * Get recent notifications for an organization.
 */
export async function getNotifications(orgId: string) {
  // NOTE: Requires Notification model in Prisma schema.
  // For MVP, we return an empty array until the schema migration runs.
  try {
    const notifications = await prisma.notification.findMany({
      where: { orgId },
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
  try {
    await prisma.notification.update({
      where: { id: notificationId },
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
export async function markAllAsRead(orgId: string) {
  try {
    await prisma.notification.updateMany({
      where: { orgId, read: false },
      data: { read: true },
    });
    return { success: true };
  } catch {
    return { error: "Failed to mark notifications as read" };
  }
}

/**
 * Create a new notification for an organization.
 */
export async function createNotification(
  orgId: string,
  type: NotificationType,
  title: string,
  message: string
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        orgId,
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
