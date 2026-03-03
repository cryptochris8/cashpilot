/**
 * Notification types for CashPilot in-app notification system.
 */

export type NotificationType =
  | "sync_complete"
  | "sync_error"
  | "reminder_sent"
  | "reminder_bounced"
  | "payment_received"
  | "subscription_expiring";

export interface Notification {
  id: string;
  orgId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  sync_complete: "RefreshCw",
  sync_error: "AlertTriangle",
  reminder_sent: "Mail",
  reminder_bounced: "MailX",
  payment_received: "DollarSign",
  subscription_expiring: "CreditCard",
};

export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  sync_complete: "text-green-600",
  sync_error: "text-red-600",
  reminder_sent: "text-blue-600",
  reminder_bounced: "text-orange-600",
  payment_received: "text-green-600",
  subscription_expiring: "text-yellow-600",
};
