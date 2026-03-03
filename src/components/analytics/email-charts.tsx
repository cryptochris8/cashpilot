"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface WeeklyData {
  week: string;
  sent: number;
  openRate: number;
}

interface DeliveryBreakdown {
  name: string;
  value: number;
}

interface EmailChartsProps {
  weeklyData: WeeklyData[];
  deliveryBreakdown: DeliveryBreakdown[];
}

const COLORS = ["#22c55e", "#8b5cf6", "#ef4444"];

export function EmailCharts({ weeklyData, deliveryBreakdown }: EmailChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-7">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Emails Sent Per Week</CardTitle>
          <CardDescription>Last 8 weeks of email volume</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Open Rate Trend</CardTitle>
          <CardDescription>Weekly open rate percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" fontSize={12} />
              <YAxis fontSize={12} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="openRate" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Delivery Status</CardTitle>
          <CardDescription>Overall email delivery breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={deliveryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => name + " " + ((percent ?? 0) * 100).toFixed(0) + "%"}>
                {deliveryBreakdown.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
