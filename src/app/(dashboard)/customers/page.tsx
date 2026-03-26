"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils/format";

interface CustomerRow {
  id: string;
  displayName: string;
  email: string | null;
  invoices: Array<{
    balance: { toString(): string };
    dueDate: string;
  }>;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers?limit=100");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? data);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  if (loading) {
    return (<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">View and manage your customer accounts and outstanding balances.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>All Customers</CardTitle></CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <EmptyState icon={Users} title="No customers yet" description="Connect QuickBooks to import your customer list and start tracking outstanding balances." actionLabel="Connect QuickBooks" actionHref="/settings" />
          ) : (
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
                {customers.map((customer) => {
                  const totalOutstanding = (customer.invoices || []).reduce((sum, inv) => sum + Number(inv.balance), 0);
                  const now = new Date();
                  const overdueDays = (customer.invoices || [])
                    .map((inv) => Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
                    .filter((d) => d > 0);
                  const oldestOverdueDays = overdueDays.length > 0 ? Math.max(...overdueDays) : null;
                  return (
                    <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push("/customers/" + customer.id)}>
                      <TableCell className="font-medium">{customer.displayName}</TableCell>
                      <TableCell>{customer.email ?? "\u2014"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalOutstanding)}</TableCell>
                      <TableCell className="text-right">{(customer.invoices || []).length}</TableCell>
                      <TableCell>
                        {oldestOverdueDays != null ? (
                          <Badge variant={oldestOverdueDays > 30 ? "destructive" : "outline"}>{oldestOverdueDays}d</Badge>
                        ) : "\u2014"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
