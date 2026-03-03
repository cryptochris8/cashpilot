"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  RefreshCw, Loader2, LinkIcon, CheckCircle2, AlertTriangle, Search,
  Send, Pause, Play, Download, X,
} from "lucide-react";

type InvoiceStatusType = "OPEN" | "OVERDUE" | "PAID" | "DISPUTED" | "WRITTEN_OFF";
type PipelineStageType = "NEW" | "REMINDER_SENT" | "FOLLOW_UP" | "ESCALATED" | "RESOLVED";
type SortField = "dueDate" | "totalAmount" | "balance" | "daysOverdue";
type SortDir = "asc" | "desc";

interface InvoiceRow {
  id: string;
  invoiceNumber: string | null;
  totalAmount: string;
  balance: string;
  dueDate: string;
  status: InvoiceStatusType;
  pipelineStage: PipelineStageType;
  lastReminderSentAt: string | null;
  customer: {
    id: string;
    displayName: string;
  };
}

interface QboStatus {
  connected: boolean;
  lastSyncAt?: string | null;
  syncStatus?: string;
}

interface SyncResult {
  success?: boolean;
  error?: string;
  customersUpserted?: number;
  invoicesUpserted?: number;
  invoicesPaid?: number;
}

const statusVariant: Record<InvoiceStatusType, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default",
  OVERDUE: "destructive",
  PAID: "secondary",
  DISPUTED: "outline",
  WRITTEN_OFF: "outline",
};

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function getDaysOverdue(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return diffMins + "m ago";
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return diffHrs + "h ago";
  return Math.floor(diffHrs / 24) + "d ago";
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [qboStatus, setQboStatus] = useState<QboStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [invoicesRes, statusRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/qbo/status"),
      ]);
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data);
      }
      if (statusRes.ok) {
        const data = await statusRes.json();
        setQboStatus(data);
      }
    } catch {
      // Handle fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/qbo/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      if (res.ok) await fetchData();
    } catch {
      setSyncResult({ error: "Network error during sync" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredInvoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredInvoices.map((i) => i.id)));
    }
  };

  const handleBulkAction = async (action: string, extra?: Record<string, string>) => {
    setBulkLoading(true);
    try {
      await fetch("/api/invoices/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, invoiceIds: Array.from(selected), ...extra }),
      });
      setSelected(new Set());
      await fetchData();
    } catch { /* handle error */ }
    setBulkLoading(false);
  };

  const handleExportSelected = () => {
    const ids = Array.from(selected).join(",");
    window.open("/api/invoices/export?ids=" + ids, "_blank");
  };

  // Filter and sort invoices
  const filteredInvoices = invoices
    .filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = (inv.invoiceNumber || "").toLowerCase().includes(q);
        const matchesCustomer = inv.customer.displayName.toLowerCase().includes(q);
        if (!matchesNumber && !matchesCustomer) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "dueDate":
          return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir;
        case "totalAmount":
          return (parseFloat(a.totalAmount) - parseFloat(b.totalAmount)) * dir;
        case "balance":
          return (parseFloat(a.balance) - parseFloat(b.balance)) * dir;
        case "daysOverdue":
          return (getDaysOverdue(a.dueDate) - getDaysOverdue(b.dueDate)) * dir;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If no QBO connection, show connect CTA
  if (!qboStatus?.connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track all your outstanding invoices.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Connect QuickBooks to Get Started
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Connect your QuickBooks Online account to automatically import
              and track your invoices, customers, and payments.
            </p>
            <Button
              size="lg"
              onClick={() => (window.location.href = "/api/qbo/connect")}
            >
              <LinkIcon className="mr-2 h-5 w-5" />
              Connect to QuickBooks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track all your outstanding invoices.
            {qboStatus.lastSyncAt && (
              <span className="ml-2">
                Last synced {formatTimeAgo(qboStatus.lastSyncAt)}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </>
          )}
        </Button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <Alert variant={syncResult.error ? "destructive" : "default"}>
          {syncResult.error ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertTitle>{syncResult.error ? "Sync Failed" : "Sync Complete"}</AlertTitle>
          <AlertDescription>
            {syncResult.error
              ? syncResult.error
              : syncResult.invoicesUpserted + " invoices, " + syncResult.customersUpserted + " customers synced"}
          </AlertDescription>
        </Alert>
      )}

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("sendReminder")} disabled={bulkLoading}>
            <Send className="mr-1 h-3 w-3" /> Send Reminder
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("pauseReminders")} disabled={bulkLoading}>
            <Pause className="mr-1 h-3 w-3" /> Pause
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("resumeReminders")} disabled={bulkLoading}>
            <Play className="mr-1 h-3 w-3" /> Resume
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportSelected}>
            <Download className="mr-1 h-3 w-3" /> Export
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="DISPUTED">Disputed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === "ALL" ? "All" : statusFilter} Invoices
            <Badge variant="secondary" className="ml-2">
              {filteredInvoices.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {invoices.length === 0
                  ? "No invoices yet. Click Sync Now to import from QuickBooks."
                  : "No invoices match your filters."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selected.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("totalAmount")}>
                    Amount {sortField === "totalAmount" && (sortDir === "asc" ? "^" : "v")}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("balance")}>
                    Balance {sortField === "balance" && (sortDir === "asc" ? "^" : "v")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("dueDate")}>
                    Due Date {sortField === "dueDate" && (sortDir === "asc" ? "^" : "v")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("daysOverdue")}>
                    Days Overdue {sortField === "daysOverdue" && (sortDir === "asc" ? "^" : "v")}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pipeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(invoice.id)}
                        onCheckedChange={() => toggleSelect(invoice.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium" onClick={() => router.push("/invoices/" + invoice.id)}>
                      {invoice.invoiceNumber || "-"}
                    </TableCell>
                    <TableCell onClick={() => router.push("/customers/" + invoice.customer.id)}>
                      <span className="hover:underline">{invoice.customer.displayName}</span>
                    </TableCell>
                    <TableCell className="text-right" onClick={() => router.push("/invoices/" + invoice.id)}>
                      {formatCurrency(invoice.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => router.push("/invoices/" + invoice.id)}>
                      {formatCurrency(invoice.balance)}
                    </TableCell>
                    <TableCell onClick={() => router.push("/invoices/" + invoice.id)}>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell onClick={() => router.push("/invoices/" + invoice.id)}>
                      {invoice.status === "OVERDUE" || invoice.status === "OPEN"
                        ? getDaysOverdue(invoice.dueDate) > 0
                          ? getDaysOverdue(invoice.dueDate) + "d"
                          : "-"
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[invoice.status]}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.pipelineStage}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
