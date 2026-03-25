"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SpendingByCategory } from "@/lib/supabase/types";

export function SpendingPieChart({ data }: { data: SpendingByCategory[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No spending data for this period
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: `${d.category_icon} ${d.category_name}`,
    value: Number(d.total),
    color: d.category_color,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, "Amount"]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
