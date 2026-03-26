import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGroq } from "@/lib/llm/groq";
import { buildParsePrompt } from "@/lib/llm/parse-prompt";
import { parsedTransactionsSchema } from "@/lib/schemas/transaction";
import { fallbackParse } from "@/lib/llm/fallback-parser";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await request.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Save user message
  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  // Get user categories
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id);

  const categoryNames = (categories ?? []).map((c) => c.name);
  const categoryMap = new Map(
    (categories ?? []).map((c) => [c.name.toLowerCase(), c.id])
  );

  let parsed;
  try {
    const prompt = buildParsePrompt(categoryNames);
    const response = await callGroq(prompt, message);
    const json = JSON.parse(response);
    parsed = parsedTransactionsSchema.parse(json);
  } catch {
    // Fallback to regex parser
    const fallbackResult = fallbackParse(message);
    if (fallbackResult.length === 0) {
      const reply =
        "I couldn't understand that. Try something like: Coffee $5, Lunch $12";
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "assistant",
        content: reply,
      });
      return NextResponse.json({ reply, transactions: [] });
    }
    parsed = { transactions: fallbackResult };
  }

  // Insert transactions
  const toInsert = parsed.transactions.map((t) => ({
    user_id: user.id,
    amount: t.amount,
    type: t.type,
    description: t.description,
    transaction_date: t.date || new Date().toISOString().split("T")[0],
    category_id: categoryMap.get(t.category.toLowerCase()) ?? null,
    raw_input: message,
  }));

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert(toInsert)
    .select("*, category:categories(*)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build confirmation message
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const lines = (inserted ?? []).map((t) => {
    const d = new Date(t.transaction_date + "T00:00:00");
    const day = weekdays[d.getDay()];
    return `${t.transaction_date} 周${day} ${t.type === "income" ? "+" : "-"}$${Number(t.amount).toFixed(2)} ${t.description} (${t.category?.name ?? "Uncategorized"})`;
  });
  const reply = `Added ${lines.length} transaction${lines.length > 1 ? "s" : ""}:\n${lines.join("\n")}`;

  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "assistant",
    content: reply,
    metadata: { transaction_ids: (inserted ?? []).map((t) => t.id) },
  });

  return NextResponse.json({ reply, transactions: inserted });
}
