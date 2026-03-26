"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign, AlertTriangle, TrendingUp, Target, Loader2,
  ArrowUpRight, ArrowDownRight, Clock, RefreshCw, Send,
  FileText, BarChart3,
} from "lucide-react";
import { CashForecastChart } from "@/components/dashboard/cash-forecast-chart";
import { DsoChart } from "@/components/dashboard/dso-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { formatCurrency } from "@/lib/utils/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

interface DashboardData {
  expectedNext30Days: number;
  overdueTotal: number;
  collectedThisMonth: number;
  collectionEffectiveness: number;
  dso: number;
  dsoTrend: Array<{ month: string; dso: number }>;
  prevMonthCollected: number;
  prevMonthOverdue: number;
  overdueCount?: number;
  pendingReminders?: number;
  qboConnected?: boolean;
  invoicesAtRisk: Array<{
    id: string;
    invoiceNumber: string | null;
    customerName: string;
    balance: number;
    daysOverdue: number;
  }>;
  topDebtors: Array<{
    name: string;
    outstanding: number;
    invoices: number;
    oldestDays: number;
  }>;
  recentActivity: Array<{
    id: string;
    customerName: string;
    invoiceNumber: string | null;
    templateName: string | null;
    sentAt: string;
    deliveryStatus: string;
  }>;
  weeklyData: Array<{
    label: string;
    amount: number;
    isCurrentWeek: boolean;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) { setData(await res.json()); }
      else { setFetchError(true); }
    } catch (error) {
      console.error(error);
      setFetchError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/qbo/sync", { method: "POST" });
      await fetchData();
    } catch (error) {
      console.error(error);
    }
    setSyncing(false);
  };

  if (loading) {
    return (<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>);
  }

  if (fetchError && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cash Dashboard</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load dashboard data. Please refresh the page or try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const collectedChange = data?.prevMonthCollected ? ((data.collectedThisMonth - data.prevMonthCollected) / data.prevMonthCollected * 100) : 0;
  const overdueChange = data?.prevMonthOverdue ? ((data.overdueTotal - data.prevMonthOverdue) / data.prevMonthOverdue * 100) : 0;

  const stats = [
    { title: "Expected Next 30 Days", value: formatCurrency(data?.expectedNext30Days ?? 0), description: "From open invoices due within 30 days", icon: DollarSign, change: null },
    { title: "Overdue Total", value: formatCurrency(data?.overdueTotal ?? 0), description: "Total outstanding past due date", icon: AlertTriangle, change: overdueChange, changeInverse: true },
    { title: "Collected This Month", value: formatCurrency(data?.collectedThisMonth ?? 0), description: "Payments received this month", icon: TrendingUp, change: collectedChange },
    { title: "Collection Effectiveness", value: (data?.collectionEffectiveness ?? 0) + "%", description: "Invoices paid within terms", icon: Target, change: null },
  ];

  const topDebtors = data?.topDebtors ?? [];
  const invoicesAtRisk = data?.invoicesAtRisk ?? [];
  const overdueCount = data?.overdueCount ?? invoicesAtRisk.length;
  const pendingReminders = data?.pendingReminders ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cash Dashboard</h1>
        <p className="text-muted-foreground">Monitor your cash flow and collection performance.</p>
      </div>

      {/* Quick Actions */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data?.qboConnected !== false && (
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={"mr-2 h-4 w-4" + (syncing ? " animate-spin" : "")} />
                {syncing ? "Syncing..." : "Sync QuickBooks"}
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/reminders">
                <Send className="mr-2 h-4 w-4" />
                Pending Reminders
                {pendingReminders > 0 && <Badge variant="secondary" className="ml-1.5">{pendingReminders}</Badge>}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/invoices?status=OVERDUE">
                <FileText className="mr-2 h-4 w-4" />
                Overdue Invoices
                {overdueCount > 0 && <Badge variant="destructive" className="ml-1.5">{overdueCount}</Badge>}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/aging"><BarChart3 className="mr-2 h-4 w-4" />Aging Report</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                {stat.change !== null && stat.change !== 0 && (
                  <span className={"flex items-center text-xs font-medium " + ((stat.changeInverse ? stat.change < 0 : stat.change > 0) ? "text-green-600" : "text-red-600")}>
                    {stat.change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(Math.round(stat.change))}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DSO + Weekly Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Days Sales Outstanding (DSO)</CardTitle>
                <CardDescription>Average days from invoice to payment</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-3xl font-bold">{data?.dso ?? 0}d</span>
              </div>
            </div>
          </CardHeader>
          <CardContent><DsoChart data={data?.dsoTrend ?? []} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expected Receipts by Week</CardTitle>
            <CardDescription>Projected incoming payments over the next 4 weeks</CardDescription>
          </CardHeader>
          <CardContent><CashForecastChart data={data?.weeklyData ?? []} /></CardContent>
        </Card>
      </div>

      {/* Invoices at Risk + Top Debtors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoices at Risk</CardTitle>
            <CardDescription>Invoices 60+ days overdue without engagement</CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesAtRisk.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No at-risk invoices.</p>
            ) : (
              <div className="space-y-3">
                {invoicesAtRisk.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <Link href={"/invoices/" + inv.id} className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium">{inv.customerName}</p>
                      <p className="text-xs text-muted-foreground">#{inv.invoiceNumber || "N/A"}</p>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatCurrency(inv.balance)}</span>
                      <Badge variant="destructive">{inv.daysOverdue}d</Badge>
                      <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                        <Link href={"/invoices/" + inv.id}><Send className="h-3 w-3" /></Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Debtors</CardTitle>
            <CardDescription>Largest outstanding balances</CardDescription>
          </CardHeader>
          <CardContent>
            {topDebtors.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No outstanding invoices.</p>
            ) : (
              <div className="space-y-4">
                {topDebtors.map((debtor, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{debtor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {debtor.invoices} invoices - {debtor.oldestDays > 0 ? debtor.oldestDays + "d overdue" : "Current"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatCurrency(debtor.outstanding)}</span>
                      {debtor.oldestDays > 30 && <Badge variant="destructive">30d+</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reminder Activity</CardTitle>
          <CardDescription>Last 5 reminders sent</CardDescription>
        </CardHeader>
        <CardContent><RecentActivity activities={data?.recentActivity ?? []} /></CardContent>
      </Card>
    </div>
  );
}
