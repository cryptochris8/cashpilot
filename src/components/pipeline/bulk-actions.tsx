"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { bulkUpdateStage, bulkPauseReminders } from "@/app/actions/pipeline";
import { X, Loader2 } from "lucide-react";
import type { PipelineStage } from "@prisma/client";

interface BulkActionsProps {
  selectedIds: string[];
  onComplete: () => void;
}

const STAGES: { value: PipelineStage; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "REMINDER_SENT", label: "Reminder Sent" },
  { value: "FOLLOW_UP", label: "Follow-Up" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "RESOLVED", label: "Resolved" },
];

export function BulkActions({ selectedIds, onComplete }: BulkActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleStageChange = (stage: string) => {
    startTransition(async () => {
      await bulkUpdateStage(selectedIds, stage as PipelineStage);
      onComplete();
    });
  };

  const handlePauseReminders = () => {
    startTransition(async () => {
      await bulkPauseReminders(selectedIds, true);
      onComplete();
    });
  };

  const handleResumeReminders = () => {
    startTransition(async () => {
      await bulkPauseReminders(selectedIds, false);
      onComplete();
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
      <Badge variant="secondary">{selectedIds.length} selected</Badge>

      <Select onValueChange={handleStageChange} disabled={isPending}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Change Stage" />
        </SelectTrigger>
        <SelectContent>
          {STAGES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={handlePauseReminders}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
        Pause Reminders
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleResumeReminders}
        disabled={isPending}
      >
        Resume Reminders
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onComplete}
        className="ml-auto"
      >
        <X className="h-4 w-4" />
        Clear
      </Button>
    </div>
  );
}
