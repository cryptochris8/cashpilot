"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface DsoDataPoint {
  month: string;
  dso: number;
}

interface DsoChartProps {
  data: DsoDataPoint[];
}

export function DsoChart({ data }: DsoChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Not enough data to display DSO trend.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis
          className="text-xs"
          tick={{ fontSize: 12 }}
          label={{ value: "Days", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
        />
        <Tooltip
          formatter={(value) => [Number(value) + " days", "DSO"]}
          contentStyle={{ fontSize: 12 }}
        />
        <ReferenceLine
          y={45}
          stroke="#f59e0b"
          strokeDasharray="3 3"
          label={{ value: "Industry Avg (45d)", position: "right", style: { fontSize: 11, fill: "#f59e0b" } }}
        />
        <Line
          type="monotone"
          dataKey="dso"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
