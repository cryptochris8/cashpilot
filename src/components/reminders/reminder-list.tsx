"use client";

import { Badge } from "@/components/ui/badge";
import { deliveryStatusVariant } from "@/lib/utils/badge-variants";

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
          <Badge variant={deliveryStatusVariant[reminder.deliveryStatus] ?? "outline"}>
            {reminder.deliveryStatus}
          </Badge>
        </div>
      ))}
    </div>
  );
}
