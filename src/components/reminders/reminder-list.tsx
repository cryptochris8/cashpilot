"use client";

import { Badge } from "@/components/ui/badge";

interface ReminderData {
  id: string;
  invoiceNumber: string | null;
  customerName: string;
  subject: string | null;
  sentAt: string;
  deliveryStatus: string;
  channel: string;
}

interface ReminderListProps {
  reminders: ReminderData[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  QUEUED: "outline",
  SENT: "default",
  DELIVERED: "secondary",
  OPENED: "secondary",
  BOUNCED: "destructive",
  FAILED: "destructive",
};

export function ReminderList({ reminders }: ReminderListProps) {
  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {reminder.subject ?? "Reminder"}
            </p>
            <p className="text-xs text-muted-foreground">
              To: {reminder.customerName} &middot; Invoice #
              {reminder.invoiceNumber ?? "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">
              Sent: {new Date(reminder.sentAt).toLocaleString()}
            </p>
          </div>
          <Badge variant={statusVariant[reminder.deliveryStatus] ?? "outline"}>
            {reminder.deliveryStatus}
          </Badge>
        </div>
      ))}
    </div>
  );
}
