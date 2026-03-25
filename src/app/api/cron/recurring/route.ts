import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const today = new Date();
  const dayOfMonth = today.getDate();
  const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const todayStr = today.toISOString().split("T")[0];

  // Get all active recurring expenses for today's day
  const { data: recurring, error } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("day_of_month", dayOfMonth)
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let created = 0;
  let skipped = 0;

  for (const rec of recurring ?? []) {
    // Idempotency: check if already created this month
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("recurring_expense_id", rec.id)
      .gte("transaction_date", `${yearMonth}-01`)
      .lte("transaction_date", `${yearMonth}-28`)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    await supabase.from("transactions").insert({
      user_id: rec.user_id,
      amount: rec.amount,
      type: "expense",
      description: rec.description,
      transaction_date: todayStr,
      category_id: rec.category_id,
      recurring_expense_id: rec.id,
    });
    created++;
  }

  return NextResponse.json({
    message: `Processed recurring expenses: ${created} created, ${skipped} skipped`,
    created,
    skipped,
  });
}
