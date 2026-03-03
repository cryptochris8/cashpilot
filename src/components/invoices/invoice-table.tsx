"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface InvoiceData {
  id: string;
  invoiceNumber: string | null;
  customerName: string;
  totalAmount: number;
  balance: number;
  dueDate: string;
  status: string;
  pipelineStage: string;
  lastReminderSentAt: string | null;
}

interface InvoiceTableProps {
  invoices: InvoiceData[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Pipeline Stage</TableHead>
          <TableHead>Last Reminder</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">
              {invoice.invoiceNumber ?? "—"}
            </TableCell>
            <TableCell>{invoice.customerName}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(invoice.totalAmount)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(invoice.balance)}
            </TableCell>
            <TableCell>{invoice.dueDate}</TableCell>
            <TableCell>
              <Badge
                variant={
                  invoice.status === "OVERDUE" ? "destructive" : "default"
                }
              >
                {invoice.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{invoice.pipelineStage}</Badge>
            </TableCell>
            <TableCell>{invoice.lastReminderSentAt ?? "Never"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
