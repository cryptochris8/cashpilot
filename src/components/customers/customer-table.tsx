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

interface CustomerData {
  id: string;
  displayName: string;
  email: string | null;
  totalOutstanding: number;
  invoiceCount: number;
  oldestOverdueDays: number | null;
}

interface CustomerTableProps {
  customers: CustomerData[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-right">Total Outstanding</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
          <TableHead>Oldest Overdue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">
              {customer.displayName}
            </TableCell>
            <TableCell>{customer.email ?? "—"}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(customer.totalOutstanding)}
            </TableCell>
            <TableCell className="text-right">
              {customer.invoiceCount}
            </TableCell>
            <TableCell>
              {customer.oldestOverdueDays != null ? (
                <Badge
                  variant={
                    customer.oldestOverdueDays > 30
                      ? "destructive"
                      : "outline"
                  }
                >
                  {customer.oldestOverdueDays}d
                </Badge>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
