"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils/format";

interface WeekData {
  label: string;
  amount: number;
  isCurrentWeek: boolean;
}

interface CashForecastChartProps {
  data: WeekData[];
}

export function CashForecastChart({ data }: CashForecastChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No invoice data available for forecast.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), "Expected"]}
          labelFormatter={(label) => "Week: " + label}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.isCurrentWeek ? "#22c55e" : "#3b82f6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
