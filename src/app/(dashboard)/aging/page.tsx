"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgingTable } from "@/components/aging/aging-table";

interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  total: number;
}

interface AgingRow {
  customerId: string;
  customerName: string;
  buckets: AgingBucket;
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    balance: number;
    dueDate: string;
    daysOverdue: number;
    bucket: string;
  }>;
}

export default function AgingPage() {
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [totals, setTotals] = useState<AgingBucket>({
    current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/aging");
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows);
        setTotals(data.totals);
      }
    } catch { /* handle error */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const headers = ["Customer", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total"];
    const csvRows = [headers.join(",")];
    for (const row of rows) {
      csvRows.push([
        '"' + row.customerName.replace(/"/g, '""') + '"',
        row.buckets.current.toFixed(2),
        row.buckets.days1to30.toFixed(2),
        row.buckets.days31to60.toFixed(2),
        row.buckets.days61to90.toFixed(2),
        row.buckets.days90plus.toFixed(2),
        row.buckets.total.toFixed(2),
      ].join(","));
    }
    csvRows.push(["TOTAL", totals.current.toFixed(2), totals.days1to30.toFixed(2), totals.days31to60.toFixed(2), totals.days61to90.toFixed(2), totals.days90plus.toFixed(2), totals.total.toFixed(2)].join(","));
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aging-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aging Report</h1>
          <p className="text-muted-foreground">
            Accounts receivable aging analysis by customer.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AR Aging Summary</CardTitle>
          <CardDescription>Outstanding invoices grouped by aging bucket</CardDescription>
        </CardHeader>
        <CardContent>
          <AgingTable rows={rows} totals={totals} onExport={handleExport} />
        </CardContent>
      </Card>
    </div>
  );
}
