"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, daysOverdue } from "@/lib/utils/format";

export interface PipelineCardData {
  id: string;
  customerName: string;
  invoiceNumber: string | null;
  totalAmount: number;
  balance: number;
  dueDate: string;
  status: string;
  lastReminderSentAt: string | null;
  pauseReminders: boolean;
}

interface PipelineCardProps {
  card: PipelineCardData;
  onClick: (id: string) => void;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
}

function getOverdueColor(days: number): string {
  if (days <= 0) return "border-l-green-500";
  if (days <= 14) return "border-l-yellow-500";
  if (days <= 60) return "border-l-red-500";
  return "border-l-red-900";
}

function getOverdueBadgeVariant(
  days: number
): "default" | "secondary" | "destructive" | "outline" {
  if (days <= 0) return "secondary";
  if (days <= 14) return "default";
  return "destructive";
}

export function PipelineCard({
  card,
  onClick,
  selected,
  onSelectToggle,
}: PipelineCardProps) {
  const days = daysOverdue(card.dueDate);
  const colorClass = getOverdueColor(days);

  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "move";
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "0.5";
      }}
      onDragEnd={(e) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "1";
      }}
      className={`cursor-grab border-l-4 ${colorClass} transition-shadow hover:shadow-md active:cursor-grabbing ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onSelectToggle?.(card.id);
        } else {
          onClick(card.id);
        }
      }}
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="truncate text-sm">
            {card.customerName}
          </CardTitle>
          {card.pauseReminders && (
            <Badge variant="outline" className="ml-1 shrink-0 text-[10px]">
              Paused
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>#{card.invoiceNumber ?? "N/A"}</span>
          <span className="font-semibold text-foreground">
            {formatCurrency(card.balance)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          {days > 0 ? (
            <Badge
              variant={getOverdueBadgeVariant(days)}
              className="text-[10px]"
            >
              {days}d overdue
            </Badge>
          ) : days === 0 ? (
            <Badge variant="default" className="text-[10px]">
              Due today
            </Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              Due {formatDate(card.dueDate)}
            </span>
          )}
          {card.lastReminderSentAt && (
            <span className="text-[10px] text-muted-foreground">
              Last: {formatDate(card.lastReminderSentAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
