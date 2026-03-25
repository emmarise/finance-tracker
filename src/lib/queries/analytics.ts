import type { SupabaseClient } from "@supabase/supabase-js";
import type { AskQuerySpec } from "@/lib/schemas/llm-response";

export async function executeAnalyticsQuery(
  supabase: SupabaseClient,
  userId: string,
  spec: AskQuerySpec
): Promise<unknown> {
  const start = spec.period?.start;
  const end = spec.period?.end;

  switch (spec.query_type) {
    case "total": {
      let query = supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", userId);
      if (start && end)
        query = query.gte("transaction_date", start).lte("transaction_date", end);
      if (spec.category) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", userId)
          .ilike("name", spec.category)
          .single();
        if (cat) query = query.eq("category_id", cat.id);
      }
      const { data } = await query;
      const expenses = (data ?? [])
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const income = (data ?? [])
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { expenses, income, net: income - expenses, period: { start, end } };
    }

    case "ratio": {
      const { data } = await supabase.rpc("spending_by_category", {
        p_user_id: userId,
        p_start: start,
        p_end: end,
      });
      if (spec.category) {
        const match = (data ?? []).find(
          (d: { category_name: string }) =>
            d.category_name.toLowerCase() === spec.category!.toLowerCase()
        );
        return match ?? { category_name: spec.category, total: 0, percentage: 0 };
      }
      return data ?? [];
    }

    case "top_n": {
      const { data } = await supabase.rpc("spending_by_category", {
        p_user_id: userId,
        p_start: start,
        p_end: end,
      });
      return (data ?? []).slice(0, spec.limit ?? 5);
    }

    case "trend": {
      const { data } = await supabase
        .from("transactions")
        .select("amount, type, transaction_date")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("transaction_date", start!)
        .lte("transaction_date", end!)
        .order("transaction_date");
      const daily: Record<string, number> = {};
      for (const t of data ?? []) {
        daily[t.transaction_date] =
          (daily[t.transaction_date] ?? 0) + Number(t.amount);
      }
      return Object.entries(daily).map(([date, amount]) => ({ date, amount }));
    }

    case "comparison": {
      const period1 = await executeAnalyticsQuery(supabase, userId, {
        query_type: "total",
        period: spec.period,
      });
      const period2 = spec.comparison_period
        ? await executeAnalyticsQuery(supabase, userId, {
            query_type: "total",
            period: spec.comparison_period,
          })
        : null;
      return { current: period1, previous: period2 };
    }

    default:
      return { error: "Unknown query type" };
  }
}
