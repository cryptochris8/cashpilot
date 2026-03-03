"use client";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

interface ActivityItem {
  id: string;
  customerName: string;
  invoiceNumber: string | null;
  templateName: string | null;
  sentAt: string;
  deliveryStatus: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  QUEUED: "outline",
  SENT: "default",
  DELIVERED: "secondary",
  OPENED: "secondary",
  BOUNCED: "destructive",
  FAILED: "destructive",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No reminder activity yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{item.customerName}</p>
            <p className="text-xs text-muted-foreground">
              #{item.invoiceNumber ?? "N/A"} - {item.templateName ?? "Manual Reminder"}
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(item.sentAt)}</p>
          </div>
          <Badge variant={statusVariant[item.deliveryStatus] ?? "outline"} className="text-xs">
            {item.deliveryStatus}
          </Badge>
        </div>
      ))}
    </div>
  );
}
