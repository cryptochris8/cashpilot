"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PaymentHistory } from "@/components/customers/payment-history";
import {
  ArrowLeft, Loader2, Save, Mail, MailX, DollarSign, FileText, Clock, TrendingUp,
} from "lucide-react";

type InvoiceStatus = "OPEN" | "OVERDUE" | "PAID" | "DISPUTED" | "WRITTEN_OFF";

const statusVariant: Record<InvoiceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default",
  OVERDUE: "destructive",
  PAID: "secondary",
  DISPUTED: "outline",
  WRITTEN_OFF: "outline",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface CustomerData {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  qboCustomerId: string;
  notes: string | null;
  unsubscribed: boolean;
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    issueDate: string;
    dueDate: string;
    totalAmount: { toString(): string };
    balance: { toString(): string };
    status: InvoiceStatus;
    pipelineStage: string;
    updatedAt: string;
    reminderLogs: Array<{
      id: string;
      sentAt: string;
      deliveryStatus: string;
      subject: string | null;
      template: { name: string } | null;
    }>;
  }>;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchCustomer = useCallback(async () => {
    try {
      const res = await fetch("/api/customers/" + id);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
        setNotes(data.notes || "");
      }
    } catch { /* handle error */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await fetch("/api/customers/" + id + "/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
  };

  const handleToggleUnsubscribe = async () => {
    setToggling(true);
    const res = await fetch("/api/customers/" + id + "/unsubscribe", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setCustomer((prev) => prev ? { ...prev, unsubscribed: data.unsubscribed } : null);
    }
    setToggling(false);
  };

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!customer) {
    return <div className="py-12 text-center text-muted-foreground">Customer not found.</div>;
  }

  const allInvoices = customer.invoices || [];
  const paidInvoices = allInvoices.filter((i) => i.status === "PAID");
  const openInvoices = allInvoices.filter((i) => i.status === "OPEN" || i.status === "OVERDUE");
  const overdueInvoices = allInvoices.filter((i) => i.status === "OVERDUE");
  const totalOutstanding = openInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

  const dtpArr = paidInvoices.map((inv) => {
    const issued = new Date(inv.issueDate).getTime();
    const paid = new Date(inv.updatedAt).getTime();
    return Math.max(0, Math.floor((paid - issued) / (1000 * 60 * 60 * 24)));
  });
  const avgDaysToPay = dtpArr.length > 0 ? Math.round(dtpArr.reduce((a, b) => a + b, 0) / dtpArr.length) : 0;
  const onTimeCount = paidInvoices.filter((inv) => new Date(inv.updatedAt) <= new Date(inv.dueDate)).length;
  const onTimePercent = paidInvoices.length > 0 ? Math.round((onTimeCount / paidInvoices.length) * 100) : 100;
  let risk: "low" | "medium" | "high" = "low";
  if (onTimePercent < 50) risk = "high";
  else if (onTimePercent < 80) risk = "medium";

  const riskCfg: Record<string, { label: string; variant: "secondary" | "outline" | "destructive"; color: string }> = {
    low: { label: "Low Risk", variant: "secondary", color: "text-green-600" },
    medium: { label: "Medium Risk", variant: "outline", color: "text-yellow-600" },
    high: { label: "High Risk", variant: "destructive", color: "text-red-600" },
  };
  const rc = riskCfg[risk];

  const paymentHistory = paidInvoices.map((inv) => {
    const d = Math.max(0, Math.floor((new Date(inv.updatedAt).getTime() - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24)));
    return {
      id: inv.id, invoiceNumber: inv.invoiceNumber, totalAmount: Number(inv.totalAmount),
      dueDate: inv.dueDate, paidDate: inv.updatedAt, daysToPay: d,
      wasOnTime: new Date(inv.updatedAt) <= new Date(inv.dueDate),
    };
  });

  const allReminders = allInvoices.flatMap((inv) =>
    (inv.reminderLogs || []).map((r) => ({ ...r, invoiceNumber: inv.invoiceNumber }))
  ).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  const dvMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    QUEUED: "outline", SENT: "default", DELIVERED: "secondary", OPENED: "secondary",
    BOUNCED: "destructive", FAILED: "destructive",
  };

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <Button variant="ghost" size="sm" onClick={() => router.push("/customers")} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{customer.displayName}</h1>
            <Badge variant={rc.variant}>{rc.label}</Badge>
            {customer.unsubscribed && <Badge variant="destructive">Unsubscribed</Badge>}
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            {customer.email && <span>{customer.email}</span>}
            {customer.phone && <span>{customer.phone}</span>}
            <span>QBO ID: {customer.qboCustomerId}</span>
          </div>
        </div>
        <Button variant={customer.unsubscribed ? "default" : "outline"} size="sm" onClick={handleToggleUnsubscribe} disabled={toggling}>
          {toggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : customer.unsubscribed ? <Mail className="mr-2 h-4 w-4" /> : <MailX className="mr-2 h-4 w-4" />}
          {customer.unsubscribed ? "Resubscribe" : "Unsubscribe"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Outstanding</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div><p className="text-xs text-muted-foreground">{overdueInvoices.length} overdue</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Invoices</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{allInvoices.length}</div><p className="text-xs text-muted-foreground">{paidInvoices.length} paid</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg Days to Pay</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgDaysToPay}d</div><p className="text-xs text-muted-foreground">from issue date</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">On-Time %</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className={"text-2xl font-bold " + rc.color}>{onTimePercent}%</div><p className="text-xs text-muted-foreground">paid before due date</p></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="reminders">Reminder History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle>All Invoices</CardTitle></CardHeader>
            <CardContent>
              {allInvoices.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No invoices found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInvoices.map((inv) => (
                      <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push("/invoices/" + inv.id)}>
                        <TableCell className="font-medium">#{inv.invoiceNumber || "N/A"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(inv.totalAmount))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(inv.balance))}</TableCell>
                        <TableCell>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell><Badge variant={statusVariant[inv.status]}>{inv.status}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{inv.pipelineStage}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
            <CardContent><PaymentHistory payments={paymentHistory} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <Card>
            <CardHeader><CardTitle>Reminder History</CardTitle><CardDescription>All reminders sent to this customer</CardDescription></CardHeader>
            <CardContent>
              {allReminders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No reminders sent yet.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Template</TableHead><TableHead>Sent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {allReminders.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>#{r.invoiceNumber || "N/A"}</TableCell>
                        <TableCell>{r.template?.name || r.subject || "Manual"}</TableCell>
                        <TableCell>{formatDate(r.sentAt)}</TableCell>
                        <TableCell><Badge variant={dvMap[r.deliveryStatus] || "outline"}>{r.deliveryStatus}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader><CardTitle>Customer Notes</CardTitle><CardDescription>Add notes about this customer relationship</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this customer..." rows={4} />
              <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm">
                {savingNotes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
