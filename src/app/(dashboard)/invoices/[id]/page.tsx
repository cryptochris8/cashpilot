"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  ArrowLeft, Loader2, Send, Pause, Play, AlertTriangle,
  ExternalLink, StickyNote, Calendar, DollarSign, User,
} from "lucide-react";

type InvoiceStatus = "OPEN" | "OVERDUE" | "PAID" | "DISPUTED" | "WRITTEN_OFF";
type PipelineStage = "NEW" | "REMINDER_SENT" | "FOLLOW_UP" | "ESCALATED" | "RESOLVED";
type NoteType = "GENERAL" | "DISPUTE" | "PROMISE_TO_PAY" | "ESCALATION";

const statusVariant: Record<InvoiceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default", OVERDUE: "destructive", PAID: "secondary", DISPUTED: "outline", WRITTEN_OFF: "outline",
};

const stageLabels: Record<PipelineStage, string> = {
  NEW: "New", REMINDER_SENT: "Reminder Sent", FOLLOW_UP: "Follow Up", ESCALATED: "Escalated", RESOLVED: "Resolved",
};

const noteTypeLabels: Record<NoteType, string> = {
  GENERAL: "General", DISPUTE: "Dispute", PROMISE_TO_PAY: "Promise to Pay", ESCALATION: "Escalation",
};

const noteTypeVariant: Record<NoteType, "default" | "secondary" | "destructive" | "outline"> = {
  GENERAL: "secondary", DISPUTE: "destructive", PROMISE_TO_PAY: "default", ESCALATION: "destructive",
};

const deliveryVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  QUEUED: "outline", SENT: "default", DELIVERED: "secondary", OPENED: "secondary",
  BOUNCED: "destructive", FAILED: "destructive",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

interface InvoiceData {
  id: string;
  invoiceNumber: string | null;
  qboInvoiceId: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  balance: number;
  status: InvoiceStatus;
  pipelineStage: PipelineStage;
  pauseReminders: boolean;
  lastReminderSentAt: string | null;
  customer: {
    id: string;
    displayName: string;
    email: string | null;
  };
  reminderLogs: Array<{
    id: string;
    sentAt: string;
    deliveryStatus: string;
    subject: string | null;
    template: { name: string } | null;
    responseNote: string | null;
  }>;
  invoiceNotes: Array<{
    id: string;
    authorId: string;
    content: string;
    noteType: NoteType;
    createdAt: string;
  }>;
}

interface RelatedInvoice {
  id: string;
  invoiceNumber: string | null;
  totalAmount: number;
  balance: number;
  dueDate: string;
  status: InvoiceStatus;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [related, setRelated] = useState<RelatedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("GENERAL");
  const [addingNote, setAddingNote] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await fetch("/api/invoices/" + id);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice);
        setRelated(data.relatedInvoices || []);
      }
    } catch { /* handle error */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const handleChangeStage = async (stage: string) => {
    setActionLoading("stage");
    await fetch("/api/invoices/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: stage }),
    });
    await fetchInvoice();
    setActionLoading("");
  };

  const handleTogglePause = async () => {
    if (!invoice) return;
    setActionLoading("pause");
    await fetch("/api/invoices/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pauseReminders: !invoice.pauseReminders }),
    });
    await fetchInvoice();
    setActionLoading("");
  };

  const handleMarkDisputed = async () => {
    setActionLoading("dispute");
    await fetch("/api/invoices/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISPUTED" }),
    });
    await fetchInvoice();
    setActionLoading("");
  };

  const handleSendReminder = async () => {
    setActionLoading("remind");
    await fetch("/api/invoices/" + id + "/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await fetchInvoice();
    setActionLoading("");
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setAddingNote(true);
    await fetch("/api/invoices/" + id + "/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteContent, noteType }),
    });
    setNoteContent("");
    await fetchInvoice();
    setAddingNote(false);
  };

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!invoice) {
    return <div className="py-12 text-center text-muted-foreground">Invoice not found.</div>;
  }

  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays > 0 && invoice.status !== "PAID";
  const paidAmount = invoice.totalAmount - invoice.balance;
  const paidPercent = invoice.totalAmount > 0 ? Math.round((paidAmount / invoice.totalAmount) * 100) : 0;

  const qboUrl = "https://app.qbo.intuit.com/app/invoice?txnId=" + invoice.qboInvoiceId;

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <Button variant="ghost" size="sm" onClick={() => router.push("/invoices")} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Invoice #{invoice.invoiceNumber || "N/A"}
            </h1>
            <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
            <Badge variant="outline">{stageLabels[invoice.pipelineStage]}</Badge>
            {invoice.pauseReminders && <Badge variant="secondary">Paused</Badge>}
          </div>
        </div>
        <a href={qboUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="mr-2 h-4 w-4" /> View in QuickBooks
          </Button>
        </a>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoice.totalAmount)}</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Paid: {formatCurrency(paidAmount)}</span>
                <span>Remaining: {formatCurrency(invoice.balance)}</span>
              </div>
              <Progress value={paidPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(invoice.dueDate)}</div>
            <p className={"text-xs " + (isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
              {isOverdue ? diffDays + " days overdue" : diffDays < 0 ? Math.abs(diffDays) + " days until due" : "Due today"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link href={"/customers/" + invoice.customer.id} className="text-lg font-semibold hover:underline">
              {invoice.customer.displayName}
            </Link>
            <p className="text-xs text-muted-foreground">{invoice.customer.email || "No email"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issue Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(invoice.issueDate)}</div>
            <p className="text-xs text-muted-foreground">
              {invoice.lastReminderSentAt ? "Last reminder: " + formatDate(invoice.lastReminderSentAt) : "No reminders sent"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleSendReminder} disabled={actionLoading === "remind" || !invoice.customer.email}>
            {actionLoading === "remind" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Reminder
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Stage:</span>
            <Select value={invoice.pipelineStage} onValueChange={handleChangeStage} disabled={actionLoading === "stage"}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(stageLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={handleTogglePause} disabled={actionLoading === "pause"}>
            {actionLoading === "pause" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : invoice.pauseReminders ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
            {invoice.pauseReminders ? "Resume Reminders" : "Pause Reminders"}
          </Button>
          {invoice.status !== "DISPUTED" && (
            <Button variant="outline" size="sm" onClick={handleMarkDisputed} disabled={actionLoading === "dispute"}>
              <AlertTriangle className="mr-2 h-4 w-4" /> Mark Disputed
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Invoice notes and communication log</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Add a note..." className="flex-1" rows={2} />
            <div className="flex flex-col gap-2">
              <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(noteTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddNote} disabled={addingNote || !noteContent.trim()}>
                {addingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StickyNote className="mr-2 h-4 w-4" />}
                Add
              </Button>
            </div>
          </div>
          {(invoice.invoiceNotes || []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {invoice.invoiceNotes.map((note) => (
                <div key={note.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={noteTypeVariant[note.noteType]} className="text-xs">{noteTypeLabels[note.noteType]}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</span>
                    <span className="text-xs text-muted-foreground">{note.authorId === "system" ? "System" : "You"}</span>
                  </div>
                  <p className="text-sm">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder Timeline</CardTitle>
          <CardDescription>History of all reminders sent for this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          {(invoice.reminderLogs || []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No reminders sent yet.</p>
          ) : (
            <div className="space-y-3">
              {invoice.reminderLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{log.template?.name || log.subject || "Manual Reminder"}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(log.sentAt)}</p>
                    {log.responseNote && <p className="text-xs text-blue-600 mt-1">Reply: {log.responseNote}</p>}
                  </div>
                  <Badge variant={deliveryVariant[log.deliveryStatus] || "outline"}>{log.deliveryStatus}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Invoices */}
      {related.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Invoices</CardTitle>
            <CardDescription>Other open invoices from {invoice.customer.displayName}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {related.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push("/invoices/" + inv.id)}>
                    <TableCell className="font-medium">#{inv.invoiceNumber || "N/A"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.balance)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell><Badge variant={statusVariant[inv.status]}>{inv.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
