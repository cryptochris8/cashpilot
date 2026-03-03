"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Download } from "lucide-react";

interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  total: number;
}

interface AgingInvoice {
  id: string;
  invoiceNumber: string | null;
  balance: number;
  dueDate: string;
  daysOverdue: number;
  bucket: string;
}

interface AgingRow {
  customerId: string;
  customerName: string;
  buckets: AgingBucket;
  invoices: AgingInvoice[];
}

interface AgingTableProps {
  rows: AgingRow[];
  totals: AgingBucket;
  onExport: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function CellAmount({ amount, intensity }: { amount: number; intensity?: number }) {
  if (amount === 0) return <TableCell className="text-right text-muted-foreground">-</TableCell>;

  let bg = "";
  if (intensity && intensity >= 4) bg = "bg-red-100 dark:bg-red-950";
  else if (intensity && intensity >= 3) bg = "bg-orange-100 dark:bg-orange-950";
  else if (intensity && intensity >= 2) bg = "bg-yellow-100 dark:bg-yellow-950";
  else if (intensity && intensity >= 1) bg = "bg-amber-50 dark:bg-amber-950";

  return (
    <TableCell className={"text-right font-medium " + bg}>
      {formatCurrency(amount)}
    </TableCell>
  );
}

export function AgingTable({ rows, totals, onExport }: AgingTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (customerId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
      <div className="rounded-md border print:border-black min-w-[700px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Customer</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1-30 Days</TableHead>
              <TableHead className="text-right">31-60 Days</TableHead>
              <TableHead className="text-right">61-90 Days</TableHead>
              <TableHead className="text-right">90+ Days</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No outstanding invoices to show.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <>
                <TableRow key={row.customerId} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(row.customerId)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {expanded.has(row.customerId) ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <Link href={"/customers/" + row.customerId} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {row.customerName}
                      </Link>
                    </div>
                  </TableCell>
                  <CellAmount amount={row.buckets.current} intensity={0} />
                  <CellAmount amount={row.buckets.days1to30} intensity={1} />
                  <CellAmount amount={row.buckets.days31to60} intensity={2} />
                  <CellAmount amount={row.buckets.days61to90} intensity={3} />
                  <CellAmount amount={row.buckets.days90plus} intensity={4} />
                  <TableCell className="text-right font-bold">
                    {formatCurrency(row.buckets.total)}
                  </TableCell>
                </TableRow>
                {expanded.has(row.customerId) && row.invoices.map((inv) => (
                  <TableRow key={inv.id} className="bg-muted/30">
                    <TableCell className="pl-12 text-sm text-muted-foreground">
                      <Link href={"/invoices/" + inv.id} className="hover:underline">
                        #{inv.invoiceNumber || "N/A"} - Due {formatDate(inv.dueDate)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-sm">{inv.bucket === "current" ? formatCurrency(inv.balance) : "-"}</TableCell>
                    <TableCell className="text-right text-sm">{inv.bucket === "days1to30" ? formatCurrency(inv.balance) : "-"}</TableCell>
                    <TableCell className="text-right text-sm">{inv.bucket === "days31to60" ? formatCurrency(inv.balance) : "-"}</TableCell>
                    <TableCell className="text-right text-sm">{inv.bucket === "days61to90" ? formatCurrency(inv.balance) : "-"}</TableCell>
                    <TableCell className="text-right text-sm">{inv.bucket === "days90plus" ? formatCurrency(inv.balance) : "-"}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(inv.balance)}</TableCell>
                  </TableRow>
                ))}
              </>
            ))}
            {/* Totals Row */}
            <TableRow className="bg-muted font-bold border-t-2">
              <TableCell>TOTAL</TableCell>
              <CellAmount amount={totals.current} />
              <CellAmount amount={totals.days1to30} intensity={1} />
              <CellAmount amount={totals.days31to60} intensity={2} />
              <CellAmount amount={totals.days61to90} intensity={3} />
              <CellAmount amount={totals.days90plus} intensity={4} />
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      </div>
    </div>
  );
}
