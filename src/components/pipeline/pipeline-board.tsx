"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { PipelineColumn } from "./pipeline-column";
import { type PipelineCardData } from "./pipeline-card";
import { getInvoicesByStage, updateInvoiceStage } from "@/app/actions/pipeline";
import { InvoiceDetailDrawer } from "@/components/invoices/invoice-detail-drawer";
import { BulkActions } from "./bulk-actions";
import { Loader2 } from "lucide-react";
import type { PipelineStage } from "@prisma/client";

interface ColumnConfig {
  stage: string;
  label: string;
  color: string;
}

const COLUMNS: ColumnConfig[] = [
  { stage: "NEW", label: "New", color: "bg-blue-500" },
  { stage: "REMINDER_SENT", label: "Reminder Sent", color: "bg-yellow-500" },
  { stage: "FOLLOW_UP", label: "Follow-Up", color: "bg-orange-500" },
  { stage: "ESCALATED", label: "Escalated", color: "bg-red-500" },
  { stage: "RESOLVED", label: "Resolved", color: "bg-green-500" },
];

interface StageData {
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    totalAmount: string | number;
    balance: string | number;
    dueDate: string;
    status: string;
    pipelineStage: string;
    lastReminderSentAt: string | null;
    pauseReminders: boolean;
    customer: { id: string; displayName: string; email: string | null; phone: string | null };
    reminderLogs: Array<{ sentAt: string }>;
  }>;
  count: number;
  totalBalance: number;
}

export function PipelineBoard() {
  const [data, setData] = useState<Record<string, StageData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    const result = await getInvoicesByStage();
    if ("data" in result && result.data) {
      setData(result.data as unknown as Record<string, StageData>);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCardClick = (id: string) => {
    setSelectedInvoiceId(id);
    setDrawerOpen(true);
  };

  const handleDrop = (invoiceId: string, newStage: string) => {
    if (!data) return;

    // Optimistic update
    const newData = { ...data };
    let movedCard: StageData["invoices"][0] | null = null;
    let sourceStage: string | null = null;

    for (const stage of Object.keys(newData)) {
      const idx = newData[stage].invoices.findIndex(
        (inv) => inv.id === invoiceId
      );
      if (idx !== -1) {
        movedCard = newData[stage].invoices[idx];
        sourceStage = stage;
        newData[stage] = {
          ...newData[stage],
          invoices: newData[stage].invoices.filter((inv) => inv.id !== invoiceId),
          count: newData[stage].count - 1,
          totalBalance:
            newData[stage].totalBalance - Number(movedCard.balance),
        };
        break;
      }
    }

    if (movedCard && sourceStage !== newStage) {
      const updated = { ...movedCard, pipelineStage: newStage };
      newData[newStage] = {
        ...newData[newStage],
        invoices: [...newData[newStage].invoices, updated],
        count: newData[newStage].count + 1,
        totalBalance: newData[newStage].totalBalance + Number(movedCard.balance),
      };

      setData(newData);

      startTransition(async () => {
        await updateInvoiceStage(invoiceId, newStage as PipelineStage);
      });
    }
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkComplete = () => {
    setSelectedIds(new Set());
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Unable to load pipeline data.
        </p>
      </div>
    );
  }

  const mapInvoiceToCard = (
    inv: StageData["invoices"][0]
  ): PipelineCardData => ({
    id: inv.id,
    customerName: inv.customer.displayName,
    invoiceNumber: inv.invoiceNumber,
    totalAmount: Number(inv.totalAmount),
    balance: Number(inv.balance),
    dueDate:
      typeof inv.dueDate === "string"
        ? inv.dueDate
        : new Date(inv.dueDate).toISOString(),
    status: inv.status,
    lastReminderSentAt: inv.lastReminderSentAt,
    pauseReminders: inv.pauseReminders,
  });

  return (
    <>
      {selectedIds.size > 0 && (
        <BulkActions
          selectedIds={Array.from(selectedIds)}
          onComplete={handleBulkComplete}
        />
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const stageData = data[col.stage] || {
            invoices: [],
            count: 0,
            totalBalance: 0,
          };
          return (
            <PipelineColumn
              key={col.stage}
              stage={col.stage}
              label={col.label}
              color={col.color}
              cards={stageData.invoices.map(mapInvoiceToCard)}
              count={stageData.count}
              totalBalance={stageData.totalBalance}
              onCardClick={handleCardClick}
              onDrop={handleDrop}
              selectedIds={selectedIds}
              onSelectToggle={handleSelectToggle}
            />
          );
        })}
      </div>

      <InvoiceDetailDrawer
        invoiceId={selectedInvoiceId}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            // Refresh data after drawer closes in case changes were made
            fetchData();
          }
        }}
      />
    </>
  );
}
