"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LoginPage } from "@/components/LoginPage";
import { NavBar } from "@/components/NavBar";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { SpendingPieChart } from "@/components/dashboard/SpendingPieChart";
import { SpendingBarChart } from "@/components/dashboard/SpendingBarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addWeeks,
  addMonths,
  addYears,
  format,
} from "date-fns";
import type { SpendingByCategory } from "@/lib/supabase/types";

type Period = "week" | "month" | "year";

function getOffsetDate(period: Period, offset: number) {
  const now = new Date();
  switch (period) {
    case "week":
      return addWeeks(now, offset);
    case "month":
      return addMonths(now, offset);
    case "year":
      return addYears(now, offset);
  }
}

function getPeriodDates(period: Period, offset: number) {
  const ref = getOffsetDate(period, offset);
  switch (period) {
    case "week":
      return {
        start: format(startOfWeek(ref), "yyyy-MM-dd"),
        end: format(endOfWeek(ref), "yyyy-MM-dd"),
      };
    case "month":
      return {
        start: format(startOfMonth(ref), "yyyy-MM-dd"),
        end: format(endOfMonth(ref), "yyyy-MM-dd"),
      };
    case "year":
      return {
        start: format(startOfYear(ref), "yyyy-MM-dd"),
        end: format(endOfYear(ref), "yyyy-MM-dd"),
      };
  }
}

function getPeriodLabel(period: Period, offset: number) {
  const ref = getOffsetDate(period, offset);
  switch (period) {
    case "week": {
      const ws = startOfWeek(ref);
      const we = endOfWeek(ref);
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    case "month":
      return format(ref, "MMMM yyyy");
    case "year":
      return format(ref, "yyyy");
  }
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{
    categories: SpendingByCategory[];
    totalExpenses: number;
    totalIncome: number;
    net: number;
    spendingOverTime: { date: string; amount: number }[];
  } | null>(null);
  const [askInput, setAskInput] = useState("");
  const [askReply, setAskReply] = useState("");
  const [askLoading, setAskLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    const { start, end } = getPeriodDates(period, offset);
    const res = await fetch(`/api/dashboard?start=${start}&end=${end}`);
    if (res.ok) setData(await res.json());
  }, [period, offset]);

  useEffect(() => {
    if (user) fetchDashboard();
  }, [user, fetchDashboard]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim()) return;
    setAskLoading(true);
    setAskReply("");
    const res = await fetch("/api/chat/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: askInput }),
    });
    const result = await res.json();
    setAskReply(result.reply || result.error || "No response");
    setAskLoading(false);
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="flex flex-col h-screen">
      <NavBar userEmail={user.email} />
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex gap-1">
              {(["week", "month", "year"] as Period[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setPeriod(p); setOffset(0); }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => o - 1)}
            >
              ←
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {getPeriodLabel(period, offset)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => o + 1)}
              disabled={offset >= 0}
            >
              →
            </Button>
            {offset !== 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOffset(0)}
              >
                Today
              </Button>
            )}
          </div>

          {data && (
            <>
              <SummaryCards
                totalExpenses={data.totalExpenses}
                totalIncome={data.totalIncome}
                net={data.net}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Spending by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SpendingPieChart data={data.categories} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Spending Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SpendingBarChart data={data.spendingOverTime} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ask My Data</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAsk} className="flex gap-2">
                <Input
                  placeholder="How much did I spend on food this month?"
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                />
                <Button type="submit" disabled={askLoading}>
                  {askLoading ? "..." : "Ask"}
                </Button>
              </form>
              {askReply && (
                <p className="mt-3 text-sm bg-muted rounded-lg p-3">
                  {askReply}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
