"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, Eye, AlertTriangle } from "lucide-react";

interface EmailStatsProps {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalBounced: number;
  sentThisMonth: number;
  openRate: number;
  bounceRate: number;
}

export function EmailStats({ totalSent, totalDelivered, totalOpened, totalBounced, sentThisMonth, openRate, bounceRate }: EmailStatsProps) {
  const stats = [
    { title: "Total Sent", value: totalSent.toLocaleString(), subtitle: sentThisMonth + " this month", icon: Send, color: "text-blue-600" },
    { title: "Delivered", value: totalDelivered.toLocaleString(), subtitle: ((totalDelivered / Math.max(totalSent, 1)) * 100).toFixed(1) + "% delivery rate", icon: Mail, color: "text-green-600" },
    { title: "Opened", value: totalOpened.toLocaleString(), subtitle: openRate.toFixed(1) + "% open rate", icon: Eye, color: "text-purple-600" },
    { title: "Bounced", value: totalBounced.toLocaleString(), subtitle: bounceRate.toFixed(1) + "% bounce rate", icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={"h-4 w-4 " + stat.color} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
