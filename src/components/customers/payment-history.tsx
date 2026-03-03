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

interface PaymentRecord {
  id: string;
  invoiceNumber: string | null;
  totalAmount: number;
  dueDate: string;
  paidDate: string;
  daysToPay: number;
  wasOnTime: boolean;
}

interface PaymentHistoryProps {
  payments: PaymentRecord[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No payment history yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Paid Date</TableHead>
          <TableHead className="text-right">Days to Pay</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium">
              #{payment.invoiceNumber || "N/A"}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(payment.totalAmount)}
            </TableCell>
            <TableCell>{formatDate(payment.dueDate)}</TableCell>
            <TableCell>{formatDate(payment.paidDate)}</TableCell>
            <TableCell className="text-right">{payment.daysToPay}d</TableCell>
            <TableCell>
              <Badge variant={payment.wasOnTime ? "secondary" : "destructive"}>
                {payment.wasOnTime ? "On Time" : "Late"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
