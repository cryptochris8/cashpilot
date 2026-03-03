"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, Clock, TrendingUp } from "lucide-react";

interface CustomerProfileProps {
  customer: {
    displayName: string;
    email: string | null;
    phone: string | null;
    qboCustomerId: string;
  };
  stats: {
    totalOutstanding: number;
    totalInvoices: number;
    paidInvoices: number;
    overdueCount: number;
    avgDaysToPay: number;
    onTimePercent: number;
    risk: "low" | "medium" | "high";
  };
}

const riskConfig = {
  low: { label: "Low Risk", variant: "secondary" as const, color: "text-green-600" },
  medium: { label: "Medium Risk", variant: "outline" as const, color: "text-yellow-600" },
  high: { label: "High Risk", variant: "destructive" as const, color: "text-red-600" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function CustomerProfile({ customer, stats }: CustomerProfileProps) {
  const risk = riskConfig[stats.risk];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{customer.displayName}</h1>
            <Badge variant={risk.variant}>{risk.label}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            {customer.email && <span>{customer.email}</span>}
            {customer.phone && <span>{customer.phone}</span>}
            <span>QBO ID: {customer.qboCustomerId}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">{stats.overdueCount} overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">{stats.paidInvoices} paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days to Pay</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDaysToPay}d</div>
            <p className="text-xs text-muted-foreground">from issue date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time %</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={"text-2xl font-bold " + risk.color}>{stats.onTimePercent}%</div>
            <p className="text-xs text-muted-foreground">paid before due date</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
