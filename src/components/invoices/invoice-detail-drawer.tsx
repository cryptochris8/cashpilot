"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceNotes } from "./invoice-notes";
import { getInvoiceDetail, updateInvoiceStage, pauseReminders, resumeReminders, markAsDisputed } from "@/app/actions/pipeline";
import { formatCurrency, formatDate, daysOverdue } from "@/lib/utils/format";
import { invoiceStatusVariant, stageVariant, deliveryStatusVariant } from "@/lib/utils/badge-variants";
import { Loader2, Mail, Pause, Play, AlertTriangle, ExternalLink } from "lucide-react";
import type { PipelineStage } from "@prisma/client";

interface InvoiceDetailData {
  id: string; invoiceNumber: string | null; totalAmount: string | number;
  balance: string | number; dueDate: string; issueDate: string;
  status: string; pipelineStage: string; lastReminderSentAt: string | null;
  pauseReminders: boolean; qboInvoiceId: string;
  customer: { id: string; displayName: string; email: string | null; phone: string | null; };
  invoiceNotes: Array<{ id: string; authorId: string; content: string; noteType: string; createdAt: string; }>;
  reminderLogs: Array<{ id: string; sentAt: string; deliveryStatus: string; subject: string | null; template: { name: string } | null; }>;
}

interface InvoiceDetailDrawerProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailDrawer({ invoiceId, open, onOpenChange }: InvoiceDetailDrawerProps) {
  const [invoice, setInvoice] = useState<InvoiceDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchDetail = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    const result = await getInvoiceDetail(invoiceId);
    if ("data" in result && result.data) {
      setInvoice(result.data as unknown as InvoiceDetailData);
    }
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => { if (open && invoiceId) { fetchDetail(); } }, [open, invoiceId, fetchDetail]);

  const handleStageChange = (stage: string) => {
    if (!invoice) return;
    startTransition(async () => { await updateInvoiceStage(invoice.id, stage as PipelineStage); await fetchDetail(); });
  };

  const handlePauseReminders = () => {
    if (!invoice) return;
    startTransition(async () => {
      if (invoice.pauseReminders) { await resumeReminders(invoice.id); } else { await pauseReminders(invoice.id); }
      await fetchDetail();
    });
  };

  const handleMarkDisputed = () => {
    if (!invoice) return;
    startTransition(async () => { await markAsDisputed(invoice.id); await fetchDetail(); });
  };

  const handleSendReminder = () => {
    if (!invoice) return;
    startTransition(async () => {
      await fetch("/api/invoices/" + invoice.id + "/remind", { method: "POST" });
      await fetchDetail();
    });
  };

  const qboUrl = invoice ? "https://app.qbo.intuit.com/app/invoice?txnId=" + invoice.qboInvoiceId : "#";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {loading || !invoice ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 flex-wrap">
                <span>Invoice #{invoice.invoiceNumber ?? "N/A"}</span>
                <Badge variant={invoiceStatusVariant[invoice.status] ?? "outline"}>{invoice.status}</Badge>
                <Badge variant={stageVariant[invoice.pipelineStage] ?? "outline"}>{invoice.pipelineStage.replace("_", " ")}</Badge>
              </SheetTitle>
              <SheetDescription>{invoice.customer.displayName}</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{formatCurrency(Number(invoice.totalAmount))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(Number(invoice.balance))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(Number(invoice.totalAmount) - Number(invoice.balance))}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Issue Date</p>
                  <p className="text-sm">{formatDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Days Overdue</p>
                  <p className="text-sm font-semibold">{Math.max(0, daysOverdue(invoice.dueDate))}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="mb-2 text-sm font-semibold">Customer</h4>
                <div className="space-y-1 text-sm">
                  <p>{invoice.customer.displayName}</p>
                  {invoice.customer.email && <p className="text-muted-foreground">{invoice.customer.email}</p>}
                  {invoice.customer.phone && <p className="text-muted-foreground">{invoice.customer.phone}</p>}
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleSendReminder} disabled={isPending}>
                  <Mail className="mr-1 h-3 w-3" />Send Reminder
                </Button>
                <Select value={invoice.pipelineStage} onValueChange={handleStageChange} disabled={isPending}>
                  <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Change Stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="REMINDER_SENT">Reminder Sent</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow-Up</SelectItem>
                    <SelectItem value="ESCALATED">Escalated</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handlePauseReminders} disabled={isPending}>
                  {invoice.pauseReminders ? (<><Play className="mr-1 h-3 w-3" />Resume</>) : (<><Pause className="mr-1 h-3 w-3" />Pause</>)}
                </Button>
                {invoice.status !== "DISPUTED" && (
                  <Button size="sm" variant="outline" onClick={handleMarkDisputed} disabled={isPending}>
                    <AlertTriangle className="mr-1 h-3 w-3" />Dispute
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <a href={qboUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" />View in QBO
                  </a>
                </Button>
              </div>

              <Separator />

              <InvoiceNotes invoiceId={invoice.id} notes={invoice.invoiceNotes} onNoteAdded={fetchDetail} />

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Reminder History</h4>
                {invoice.reminderLogs.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">No reminders sent yet</p>
                ) : (
                  <div className="max-h-[200px] space-y-2 overflow-y-auto">
                    {invoice.reminderLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                        <div className="space-y-0.5">
                          <p className="font-medium">{log.template?.name ?? log.subject ?? "Reminder"}</p>
                          <p className="text-muted-foreground">{formatDate(log.sentAt)}</p>
                        </div>
                        <Badge variant={deliveryStatusVariant[log.deliveryStatus] ?? "outline"} className="text-[10px]">
                          {log.deliveryStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
