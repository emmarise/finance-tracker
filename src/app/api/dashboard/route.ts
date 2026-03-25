import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end required" },
      { status: 400 }
    );
  }

  // Spending by category
  const { data: categoryData } = await supabase.rpc("spending_by_category", {
    p_user_id: user.id,
    p_start: start,
    p_end: end,
  });

  // Totals
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, type, transaction_date")
    .eq("user_id", user.id)
    .gte("transaction_date", start)
    .lte("transaction_date", end);

  const totalExpenses = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalIncome = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Daily spending for bar chart
  const dailySpending: Record<string, number> = {};
  for (const t of (transactions ?? []).filter((t) => t.type === "expense")) {
    dailySpending[t.transaction_date] =
      (dailySpending[t.transaction_date] ?? 0) + Number(t.amount);
  }
  const spendingOverTime = Object.entries(dailySpending)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    categories: categoryData ?? [],
    totalExpenses,
    totalIncome,
    net: totalIncome - totalExpenses,
    spendingOverTime,
  });
}
