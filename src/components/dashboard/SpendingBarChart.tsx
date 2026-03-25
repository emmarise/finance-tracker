"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";

type DataPoint = { date: string; amount: number };

export function SpendingBarChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No spending data for this period
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" className="text-xs" />
        <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, "Spent"]}
        />
        <Bar dataKey="amount" fill="oklch(0.577 0.245 27.325)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
