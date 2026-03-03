"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { EmailStats } from "@/components/analytics/email-stats";
import { EmailCharts } from "@/components/analytics/email-charts";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

interface AnalyticsData {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalBounced: number;
  sentThisMonth: number;
  openRate: number;
  bounceRate: number;
  weeklyData: Array<{ week: string; sent: number; openRate: number }>;
  deliveryBreakdown: Array<{ name: string; value: number }>;
  templatePerformance: Array<{ name: string; sent: number; openRate: number; bounceRate: number }>;
  customerEngagement: Array<{ name: string; email: string; sent: number; opened: number; lastOpened: string | null }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Handle error
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>);
  }

  if (!data || data.totalSent === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Analytics</h1>
          <p className="text-muted-foreground">Track your reminder email performance.</p>
        </div>
        <Card>
          <CardContent>
            <EmptyState icon={BarChart3} title="No email data yet" description="Send your first reminder to start tracking email performance and engagement metrics." actionLabel="Go to Pipeline" actionHref="/pipeline" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Analytics</h1>
        <p className="text-muted-foreground">Track your reminder email performance and customer engagement.</p>
      </div>

      <EmailStats totalSent={data.totalSent} totalDelivered={data.totalDelivered} totalOpened={data.totalOpened} totalBounced={data.totalBounced} sentThisMonth={data.sentThisMonth} openRate={data.openRate} bounceRate={data.bounceRate} />

      <EmailCharts weeklyData={data.weeklyData} deliveryBreakdown={data.deliveryBreakdown} />

      <Card>
        <CardHeader>
          <CardTitle>Template Performance</CardTitle>
          <CardDescription>How each template performs across all sends</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Open Rate</TableHead>
                <TableHead className="text-right">Bounce Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.templatePerformance.map((t) => (
                <TableRow key={t.name}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-right">{t.sent}</TableCell>
                  <TableCell className="text-right">{t.openRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{t.bounceRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Engagement</CardTitle>
          <CardDescription>Which customers open vs ignore reminders</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Opened</TableHead>
                <TableHead>Last Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.customerEngagement.map((c) => (
                <TableRow key={c.email}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell className="text-right">{c.sent}</TableCell>
                  <TableCell className="text-right">{c.opened}</TableCell>
                  <TableCell>{c.lastOpened ? new Date(c.lastOpened).toLocaleDateString() : "Never"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
